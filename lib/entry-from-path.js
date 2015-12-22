var fs = require('fs');
var path = require('path');

module.exports = function entryFromPath(fullPath) {
  var stat = fs.statSync(fullPath);

  return {
    mode: stat.mode,
    size: stat.size,
    mtime: +stat.mtime,
    basePath: path.dirname(fullPath),
    relativePath: path.basename(fullPath),
  };
};
