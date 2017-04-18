# net-localgroup
The Windows `NET LOCALGROUP` command wrapped in JavaScript

## Background
Windows installs with several local groups predefined by default. Some that
should be familiar are 'Administrators', 'Users', and 'Guests'.
[`NET LOCALGROUP`](https://technet.microsoft.com/en-us/library/bb490949.aspx)
is a sub-command of the
[`NET` command line tool](https://technet.microsoft.com/en-us/library/bb490948.aspx),
provided for management of local groups from a command shell.
If a local group name is specified, and no change switches are used, it's
roughly equivalent to using `getent group <groupname>` on Unix/Linux, then
displaying formatted results.

## Query Only
The Windows command `NET LOCALGROUP` also allows administrators to create, change,
and delete local groups. The current version of this module does not provide an
interface for that; it only retrieves information.

## Efficiency
This module makes use of the `NET LOCALGROUP` command as a workaround where the
Windows API is not otherwise accessible.
If you have the build tools to install a native module properly, consider using
**[windows-localgroups](https://github.com/mmraff/windows-localgroups)** instead:
it has a slightly different API, but makes the same information available, and
retrieves it more efficiently.

## Caveat: Privilege and Permission
If you try to use this module from an under-privileged account on a system that
has been security-hardened, you may see something like the following:
<pre>
The command prompt has been disabled by your administrator.

Press any key to continue . . .
</pre>
... or you may see nothing, because the callback is never called.
This means that the child process spawned by the module has been killed, and so
you won't be able to get any results.

## Install
<pre>
C:\Users\myUser><b>npm install net-localgroup</b>
</pre>

## Usage
```js
var localgroup = require('net-localgroup')
```

## API

### localgroup.list(callback)
Fetches the list of names of all local groups defined on the local system, and
passes it back through the `callback` function.
- `callback` {Function}  
  * **error** {Error | `null`}
  * **data** {Array} array of strings, if no error

### localgroup.get(groupName, callback)
Fetches information about the named local group, and passes it back through the
`callback` function.
- `groupName` {String} The name of the local group
- `callback` {Function}  
  * **error** {Error | `null`}
  * **data** {Object} object with the following properties, if no error:  
    + **name** {String} Same as groupName argument
    + **comment** {String | `null`} Descriptive comment
    + **members** {Array} array of strings naming the members of the group
      (possibly none).  
      Some names may be qualified by `"DomainName\\AccountName"` format; normal
      user account names will not be.

### localgroup.getAll(callback)
Fetches information on all local groups defined on the local system, and passes
the collected data back through the `callback` function.
- `callback` {Function}  
  * **error** {Error | `null`}
  * **data** {Array} array of objects each with properties as described above for
  a `get()` call, if no error


------

**License: MIT**

