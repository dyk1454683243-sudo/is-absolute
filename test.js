'use strict';

require('mocha');
var path = require('path');
var assert = require('assert');
var isAbsolute = require('./');

if (!path.posix) {
  path.posix = {};
  path.posix.isAbsolute = isAbsolute.posix;
}
if (!path.win32) {
  path.win32 = {};
  path.win32.isAbsolute = isAbsolute.win32;
}

describe('isAbsolute()', function() {
  it('should throw an error when the value is not a string.', function() {
    assert.throws(function() {
      isAbsolute();
    }, 'isAbsolute expects a string.');
  });

  it('should pass all node native `path.win32.isAbsolute` tests:', function() {
    assert.equal(path.win32.isAbsolute('//server/file'), true);
    assert.equal(path.win32.isAbsolute('\\\\server\\file'), true);
    assert.equal(path.win32.isAbsolute('C:/Users/'), true);
    assert.equal(path.win32.isAbsolute('C:\\Users\\'), true);
    assert.equal(path.win32.isAbsolute('C:cwd/another'), false);
    assert.equal(path.win32.isAbsolute('C:cwd\\another'), false);
    assert.equal(path.win32.isAbsolute('directory/directory'), false);
    assert.equal(path.win32.isAbsolute('directory\\directory'), false);
  });

  it('should pass all node native `path.posix.isAbsolute` tests:', function() {
    assert.equal(path.posix.isAbsolute('/home/foo'), true);
    assert.equal(path.posix.isAbsolute('/home/foo/..'), true);
    assert.equal(path.posix.isAbsolute('bar/'), false);
    assert.equal(path.posix.isAbsolute('./baz'), false);
  });

  it('should return true for absolute paths', function() {
    assert.equal(isAbsolute(__dirname), true);
    assert.equal(isAbsolute(__filename), true);
    assert.equal(isAbsolute(path.join(process.cwd())), true);
    assert.equal(isAbsolute(path.resolve(process.cwd(), 'README.md')), true);
    assert.equal(isAbsolute('/foo/a/b/c/d'), true);
    assert.equal(isAbsolute('/foo'), true);
  });

  it('should return false for relative paths', function() {
    assert.equal(isAbsolute('a/b/c.js'), false);
    assert.equal(isAbsolute('./foo'), false);
    assert.equal(isAbsolute(path.relative(process.cwd(), 'README.md')), false);
  });

  it('should work with glob patterns', function() {
    assert.equal(isAbsolute(path.join(process.cwd(), 'pages/*.txt')), true);
    assert.equal(isAbsolute('pages/*.txt'), false);
  });

  it('should support windows', function() {
    assert.equal(isAbsolute.win32('c:\\'), true);
    assert.equal(isAbsolute.win32('//C://user\\docs\\Letter.txt'), true);
    assert.equal(isAbsolute.win32('a:foo/a/b/c/d'), false);
    assert.equal(isAbsolute.win32(':\\'), false);
    assert.equal(isAbsolute.win32('foo\\bar\\baz'), false);
    assert.equal(isAbsolute.win32('foo\\bar\\baz\\'), false);
    assert.equal(isAbsolute.win32('\\\\unc\\share'), true);
    assert.equal(isAbsolute.win32('\\\\unc\\share\\foo'), true);
    assert.equal(isAbsolute.win32('\\\\unc\\share\\foo\\'), true);
    assert.equal(isAbsolute.win32('\\\\unc\\share\\foo\\bar'), true);
    assert.equal(isAbsolute.win32('\\\\unc\\share\\foo\\bar\\'), true);
    assert.equal(isAbsolute.win32('\\\\unc\\share\\foo\\bar\\baz'), true);
  });

  it('should support windows unc', function() {
    assert.equal(isAbsolute.win32('\\\\foo\\bar'), true);
    assert.equal(isAbsolute.win32('//UNC//Server01//user//docs//Letter.txt'), true);
  });

  it('should support unices', function() {
    assert.equal(isAbsolute.posix('/foo/bar'), true);
    assert.equal(isAbsolute.posix('foo/bar'), false);
    assert.equal(isAbsolute.posix('/user/docs/Letter.txt'), true);
  });
});

/**
 * Simulate webpack/interop yielding `{ default: fn }` instead of the function.
 * Reloads index.js against a mocked is-windows export, then restores the cache.
 */

function loadWithIsWindows(mockExport) {
  var indexPath = require.resolve('./');
  var isWindowsPath = require.resolve('is-windows');
  var isWindowsModule = require.cache[isWindowsPath];
  var previousExports = isWindowsModule && isWindowsModule.exports;
  var previousIndex = require.cache[indexPath];

  if (!isWindowsModule) {
    require('is-windows');
    isWindowsModule = require.cache[isWindowsPath];
    previousExports = isWindowsModule.exports;
  }

  isWindowsModule.exports = mockExport;
  delete require.cache[indexPath];

  try {
    return require('./');
  } finally {
    isWindowsModule.exports = previousExports;
    if (previousIndex) {
      require.cache[indexPath] = previousIndex;
    } else {
      delete require.cache[indexPath];
    }
  }
}

describe('is-windows interop', function() {
  it('should unwrap a webpack-style default export and use posix rules', function() {
    var loaded = loadWithIsWindows({
      __esModule: true,
      default: function() {
        return false;
      }
    });
    assert.equal(typeof loaded, 'function');
    assert.equal(loaded('/foo'), true);
    assert.equal(loaded('c:\\'), false);
    assert.equal(loaded('foo'), false);
  });

  it('should unwrap a webpack-style default export and use win32 rules', function() {
    var loaded = loadWithIsWindows({
      default: function() {
        return true;
      }
    });
    assert.equal(loaded('c:\\'), true);
    assert.equal(loaded('/foo'), true);
    assert.equal(loaded('foo'), false);
  });

  it('should keep working when is-windows is already a function', function() {
    var loaded = loadWithIsWindows(function() {
      return false;
    });
    assert.equal(loaded('/foo'), true);
    assert.equal(loaded('c:\\'), false);
  });
});
