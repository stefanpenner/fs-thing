var fs = require('fs');
var path = require('path');

var FSTree = require('fs-tree-diff');
var walkSync = require('walk-sync');
var entryFromPath = require('./lib/entry-from-path');

var CREATE_OPERATION = 'create';
var UNLINK_OPERATION = 'unlink';
var MKDIR_OPERATION = 'mkdir';
var RMDIR_OPERATION = 'rmdir';

module.exports = FS;
function FS(options) {
  this._input = options.input;
  this._output = options.output;
  this._dirty = {};
  this._inputTree = new FSTree();
  this._version = 0; // increment for each FS version (rebuild);
}

FS.prototype.writeIfContentChanged = function(path) {
  throw TypeError('Implement me'); // should we do this by default, I think yes.
};

FS.prototype.existsSync = function(path) {
  return fs.existsSync(this.pathFor(path));
};

FS.prototype.readFileSync = function(path, options) {
  return fs.readFileSync(this.pathFor(path), options);
};

FS.prototype.unlinkSync = function(path, options) {
  var fullPath = this._output + '/' + path;

  // TODO: only do this if we need to
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }

  this.markDirty(path, UNLINK_OPERATION, undefined);
};

FS.prototype.writeFileSync = function(path, content) {
  var fullPath = this._output + '/' + path;
  fs.writeFileSync(fullPath, content);
  this.markDirty(path, CREATE_OPERATION, entryFromPath(fullPath)); // TODO: update or create?
};

FS.prototype.markDirty = function(path, operation, entry) {
  this._dirty[path] = [operation, path, entry];
};

FS.prototype.rootFor = function(path) {
  return this._dirty[path] === undefined ? this._input : this._output;
};

FS.prototype.pathFor = function(path) {
  return this.rootFor(path) + '/' + path;
};

FS.prototype.readdirSync = function(path) {
  return fs.readdirSync(this.pathFor(path));
};

FS.prototype.rmdirSync = function(path) {
  fs.rmdirSync(this.pathFor(path));
  this.markDirty(path, RMDIR_OPERATION, undefined);
};

FS.prototype.outputChanges = function() {
  // TODO: we need to actually order these correctly
  return Object.keys(this._dirty).map(function(key) {
    return this._dirty[key];
  }, this);
};

FS.prototype.mkdirSync = function(path) {
  fs.mkdirSync(this._output + '/' + path);
  this.markDirty(path, MKDIR_OPERATION, entryFromPath(path));
};

FS.prototype.inputChanges = function() {
  // TODO: this should be (when available) be seeded from the previous
  // transform
  var entries = walkSync.entries(this._input);
  var nextTree = new FSTree.fromEntries(entries);
  var currentTree = this._inputTree;
  this._inputTree = nextTree;

  return currentTree.calculatePatch(nextTree);
};

