var assert = require('assert')
  , os = require('os')
  , expect = require('chai').expect
  , mod = require('../')

function dummyFunc(err, data) {
  assert(false, 'This dummy function should never get called!')
}

if (process.platform !== 'win32') {
  console.error('This module is only meant for Windows platforms.\n' +
    'Aborting tests.\n');
  return
}

describe('net-localgroup module', function() {
  it('should export functions: list, get, getAll', function() {
    expect(mod.list).to.be.a('function')
    expect(mod.get).to.be.a('function')
    expect(mod.getAll).to.be.a('function')
  })

  var badGrpName = "Nobody Would Give A Group A Stupid Name Like This... or would they"
    , emptyArgs   = [ undefined, null, '', new String() ]
    , invalidArgs = [ 42, true, {}, [] ]
    // This will be the results returned by mod.list(), used throughout the suite:
    , refList
    // RegExps
    , RE_BADCHARS = /[,"/\\\[\]:|<>+=;?*\x00-\x1F]/
    , RE_ENDPERIOD = /\.$/
    , RE_ASSERTION = /AssertionError:/

  describe('list() call', function() {

    // Here the reference data is collected, as a side effect of the test; if
    // there are no localgroups defined, we abort the whole test suite
    before(function(done) {

      mod.list(function(err, data) {
        if (err) return done(err)
        expect(data).to.be.instanceof(Array)
        if (data.length == 0) {
          console.warn(
            'NO LOCAL GROUPS DEFINED ON THIS SYSTEM!\n' +
            'NO MEANINGFUL TESTS CAN BE DONE, SO TEST SUITE WILL BE ABORTED.\n' +
            'SORRY!'
          );
          process.exit()
        }
        refList = data
        for (var i = 0; i < refList.length; i++) {
          expect(refList[i]).to.be.a('string').that.is.not.empty
        }
        done()
      })
    })

    it('should pass back an array of only nonempty strings through the callback',
    function() {
      // If before() did not fail, then this test has already passed
      expect(refList).to.be.an('array')
    })

    it('should throw an assertion if no callback given', function() {
      expect(function(){ mod.list() }).to.throw(Error, RE_ASSERTION)
      expect(function(){ mod.list(refList[0]) }).to.throw(Error, RE_ASSERTION)
      for (var i = 0; i < invalidArgs.length; i++) {
        expect(function(){ mod.list(invalidArgs[i]) }).to.throw(Error, RE_ASSERTION)
      }
    })

    it('each element should conform to MS rules for group names', function() {
      // "... group names are limited to 256 characters. In addition, account
      // names cannot be terminated by a period and they cannot include commas
      // or any of the following printable characters:
      // ", /, \, [, ], :, |, <, >, +, =, ;, ?, *.  Names also cannot include
      // characters in the range 1-31, which are nonprintable."
      // - TODO: URL of some MSDN page with that statement here.
      // See RE_BADCHARS and RE_ENDPERIOD declarations at top of file.
      for (var i = 0; i < refList.length; i++) {
        var gname = refList[i]
        expect(gname.length).to.be.at.most(256)
        expect(gname).to.not.match(RE_BADCHARS).and.not.match(RE_ENDPERIOD)
      }
    })
  })

  // This gets used by tests of get() and getAll()
  function validateGroupData(data, grpName) {
    expect(data).to.be.an('object')
    if (grpName)
      expect(data).to.have.property('name', grpName)
    else {
      expect(data).to.have.property('name').that.is.a('string').that.is.not.empty
      expect(refList.indexOf(data.name)).to.not.equal(-1)
    }

    expect(data).to.have.property('comment')
    if (data.comment != null)
      expect(data.comment).to.be.a('string').that.is.not.empty

    expect(data).to.have.property('members').that.is.an('array')
    for (var m = 0; m < data.members.length; m++) {
      expect(data.members[m]).to.be.a('string').that.is.not.empty
      var matches = data.members[m].match(/^(?:.+\\)?(.+)$/)
      expect(matches[1]).to.not.match(RE_BADCHARS).and.not.match(RE_ENDPERIOD)
    }
  }

  describe('get() call', function() {

    it('should throw an assertion if group name is empty, not given, or not a string',
    function() {
      expect(function(){ mod.get() }).to.throw(Error, RE_ASSERTION)
      expect(function(){ mod.get(dummyFunc) }).to.throw(Error, RE_ASSERTION)
      expect(function(){ mod.get(null) }).to.throw(Error, RE_ASSERTION)
      expect(function(){ mod.get(null, dummyFunc) }).to.throw(Error, RE_ASSERTION)

      for (var i = 0; i < invalidArgs.length; i++) {
        expect(function(){ mod.get(invalidArgs[i], dummyFunc) })
          .to.throw(Error, RE_ASSERTION)
      }
    })

    it('should throw an assertion if given name does not conform to MS rules',
    function() {
      expect(function(){ mod.get('Q: Are We Not Men?\x0d\x0a', dummyFunc) })
        .to.throw(Error, RE_ASSERTION)
      // Try to exploit command injection:
      expect(function(){ mod.get('Administrators" /comment:"Belong To Us', dummyFunc) })
        .to.throw(Error, RE_ASSERTION)
      expect(function(){ mod.get('Users.', dummyFunc) })
        .to.throw(Error, RE_ASSERTION)
    })

    it('should throw an assertion if no callback given', function() {
      expect(function(){ mod.get(refList[0]) }).to.throw(Error, RE_ASSERTION)
    })

    it('should pass back null through the callback if given name is not known',
    function(done) {
      mod.get(badGrpName, function(err, data) {
        if (err) return done(err)
        expect(data).to.be.null
        done()
      })
    })

    it('should pass back valid data for any local group defined on the system',
    function(done) {

      function nextGroup(i) {
        if (i >= refList.length) return done()
        mod.get(refList[i], function(err, data) {
          if (err) return done(err)
          validateGroupData(data, refList[i])

          return nextGroup(i + 1)
        })
      }

      nextGroup(0) // Kickoff
    })
  })

  describe('getAll() call', function() {

    it('should throw an assertion if no callback given', function() {
      expect(function(){ mod.getAll() }).to.throw(Error, RE_ASSERTION)
      expect(function(){ mod.getAll(refList[0]) }).to.throw(Error, RE_ASSERTION)
      for (var i = 0; i < invalidArgs.length; i++) {
        expect(function(){ mod.getAll(invalidArgs[i]) }).to.throw(Error, RE_ASSERTION)
      }
    })

    it('should pass back an array of only valid object elements like that from get()',
    function(done) {
      this.timeout(0) // because lots of work to do!
      mod.getAll(function(err, data) {
        if (err) return done(err)
        expect(data).to.be.an('array').with.lengthOf(refList.length)
        for (var i = 0; i < data.length; i++)
          validateGroupData(data[i])

        done()
      })
    })
  })
})

