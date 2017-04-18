/*
TODO:
* Find out if a group name can have consecutive spaces embedded >>> YES
* Find out if a group comment can have an embedded newline - at the end?
  (that can produce a blank line in the NET LOCALGROUP <name> output)
>>> Difficult to determine: windows does not interpret "\n" or "\r";
    but I haven't given up
* Try 2 newlines followed by 'Members'
*/

if (process.platform !== 'win32') {
  console.error('net-localgroup module is only for windows platforms')
  return
}

var exec = require('child_process').exec
  , assert = require('assert')
  , os = require('os')

var RE_TITLE = /^Aliases for /
  , RE_GNAME = /\*(.+)$/
  , RE_CLOSING = /^The command completed successfully./
  , RE_HR = /^-+$/
  , RE_KEY_VAL_PAIR = /^(\S+(?: \S+)*)(?:\s{5,}(\S.*)?)?$/

module.exports.list = groupnames
module.exports.get = getGroup
module.exports.getAll = getAllGroups

// Fetch only the list of localgroup names on the local system
function groupnames(cb) {
  assert(typeof cb === 'function', 'Must provide callback')

  exec('net localgroup', function(err, sout, serr) {
    if (err) cb(err)

    var lines = sout.split(os.EOL)
      , names = []
      , matches = null

    for (var i = 0; i < lines.length; i++) {
      if (lines[i] === '') continue
      if (RE_TITLE.test(lines[i]) || RE_HR.test(lines[i])) continue
      if (RE_CLOSING.test(lines[i])) break
      matches = lines[i].match(RE_GNAME)
      if (!matches)
        throw new Error('Unexpected line in NET LOCALGROUP output: ' + lines[i])
      names.push(matches[1])
    }
    return cb(null, names)

  }).once('error', function(err) {
    console.error('Child process is blocked')
    cb(err)
  })
}

// Fetch the data of the named localgroup
function getGroup(grpName, cb) {
  assert(grpName, 'Must give local group name')
  assert(typeof grpName === 'string' || grpName instanceof String,
    'Must give local group name as a string')
  assert(typeof cb === 'function', 'Must provide callback')

  grpName = grpName.trim() // TODO: if grpName is a String object, what does trim() give?
  assert(grpName, 'Given local group name is empty')

  // Guard against injection of change commands, and against illegal chars:
  // "account names cannot be terminated by a period and they cannot include..."
  // (see regexp below)
  assert(grpName.search(/[,"/\\\[\]:|<>+=;?*\x00-\x1F]/) == -1,
    'Illegal character in name "' + grpName + '"')

  assert(grpName.slice(-1) !== '.', 'Invalid name "' + grpName + '"')

  exec('net localgroup "' + grpName + '"', function(err, sout, serr) {
    if (err) {
      if (serr.indexOf('The specified local group does not exist.') != -1)
        return cb(null, null)
      return cb(err)
    }
    var data
    try { data = parseLGrpInfo(sout) }
    catch (exc) { return cb(exc) }
    return cb(null, data)

  }).once('error', function(err) {
    console.error('Child process is blocked')
    cb(err)
  })
}

function parseLGrpInfo(text) {
  var lines = text.split(os.EOL)
    , info = {}
    , matches = null
    , i = 0

  // Expect the first two lines to give 'Alias name' and 'Comment' values
  for (i = 0; i < lines.length; i++) {
    if (lines[i] === '') break
    matches = lines[i].match(RE_KEY_VAL_PAIR)
    if (!matches)
      throw new Error('Unexpected line in output: ' + lines[i])

    switch (matches[1]) {
      case "Alias name": info.name = matches[2]; break
      case "Comment":    info.comment = matches[2] || null; break
      default:
        throw new Error('Unexpected field: ' + lines[i])
    }
  }
  // Expect the line following the blank line to be 'Members', then a blank line,
  // then a line of hyphens, followed by member names, one per line, terminated
  // by the RE_CLOSING line
  i++
  if (lines[i] != 'Members')
    throw new Error('Unexpected line in output: ' + lines[i])
  if (lines[++i] == '') i++
  if (!RE_HR.test(lines[i]))
    throw new Error('Unexpected line in output: ' + lines[i])

  info.members = []
  for (i++; i < lines.length; i++) {
    if (RE_CLOSING.test(lines[i])) break
    if (lines[i] === '')
      throw new Error('Unexpected blank line in member list')

    info.members.push(lines[i])
  }

  return info
}

// Fetch data of all local groups as an array
function getAllGroups(cb) {
  assert(typeof cb === 'function', 'Must provide callback')

  var list = []
  groupnames(function(err, names) {
    if (err) return cb(err)
    return fetchNext()

    function fetchNext() {
      if (names.length == 0) return cb(null, list)

      exec('net localgroup "' + names.shift() + '"', function(err, sout, serr) {
        if (err) return cb(err)

        try { list.push(parseLGrpInfo(sout)) }
        catch (exc) { return cb(exc) }
        return fetchNext()

      }).once('error', function(err) {
        console.error('Child process is blocked')
        cb(err)
      })
    }
  })
}

