var chai = require('chai');
var expect = chai.expect;
var FS = require('./');
var _fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var entryFromPath = require('./lib/entry-from-path');

function write(fullPath, content) {
  mkdirp.sync(path.dirname(fullPath));
  _fs.writeFileSync(fullPath, content);
}


function read(fullPath) {
  return _fs.readFileSync(fullPath, 'UTF8');
}

chai.Assertion.addMethod('sameOperationAs', function(operation) {
  this.assert(this._obj);
  var stat = this._obj[2];
  var otherStat = operation[2];

  this.assert(
    this._obj[0] === operation[0],
    'expected operation: ' + this._obj[0] + ' to be same as '  + operation[0],
    'expected operation: ' + this._obj[0] + ' to not be same as '  + operation[0]
  );

  this.assert(
    this._obj[1] === operation[1],
    'expected entry relativePath: ' + this._obj[1] + ' to be same as '  + operation[1],
    'expected entry relativePath: ' + this._obj[1] + ' to not be same as '  + operation[1]
  );

  if (this._obj[2] === operation[2]) { return; }

  this.assert(
    this._obj[2].mode === otherStat.mode,
    'expected entry.mode ' + this._obj[2].mode + ' to be same as ' + otherStat.mode,
    'expected entry.mode ' + this._obj[2].mode + ' to not the same as ' + otherStat.mode
  );

  // size and mtime dont matter for dirs
  if ((this._obj[2].mode & 61440) !== 16384) {
    this.assert(
      this._obj[2].size === otherStat.size,
      'expected entry.size ' + this._obj[2].size + ' to be same as ' + otherStat.size,
      'expected entry.size ' + this._obj[2].size + ' to not the same as ' + otherStat.size
    );

    this.assert(
      +this._obj[2].mtime === +otherStat.mtime,
      'expected entry.mtime ' + (+this._obj[2].mtime) + ' to be same as ' + (+otherStat.mtime),
      'expected entry.mtime ' + (+this._obj[2].mtime) + ' to not the same as ' + (+otherStat.mtime)
    );
  }
});

describe('FS', function() {
  describe('basic', function() {
    var fs;

    beforeEach(function() {
      mkdirp.sync('tmp/out/');
      mkdirp.sync('tmp/in/');

      fs = new FS({
        input:  'tmp/in',
        output: 'tmp/out'
      });
    });

    afterEach(function() {
      rimraf.sync('tmp');
    });

    it('#existsSync, #readFileSync, #writeFileSync', function() {
      write('tmp/in/apple.txt', 'apple');

      expect(fs.existsSync('apple.txt')).to.be.true;
      expect(fs.readFileSync('apple.txt', 'UTF8')).to.equal('apple');

      fs.writeFileSync('apple.txt', 'orange');

      expect(read('tmp/in/apple.txt')).to.equal('apple');
      expect(read('tmp/out/apple.txt')).to.equal('orange');

      expect(fs.readFileSync('apple.txt', 'UTF8'), 'orange');

      expect(fs.outputChanges()).to.deep.eql([
        ['create', 'apple.txt', entryFromPath('tmp/out/apple.txt')]
      ]);

      expect(s(fs.inputChanges())).to.deep.eql([
        ['create', 'apple.txt', entryFromPath('tmp/in/apple.txt')]
      ]);
    });

    it('#unlinkSync', function() {
      write('tmp/in/apple.txt', 'apple');

      expect(fs.existsSync('apple.txt')).to.be.true;
      expect(fs.readFileSync('apple.txt', 'UTF8')).to.equal('apple');

      fs.unlinkSync('apple.txt');
      expect(fs.existsSync('apple.txt')).to.be.false;

      expect(fs.inputChanges()[0]).to.be.sameOperationAs([
        'create',
        'apple.txt',
        entryFromPath('tmp/in/apple.txt')
      ]);

      expect(fs.outputChanges()[0]).to.be.sameOperationAs([
        'unlink',
        'apple.txt',
        undefined
      ]);
    });

    it('#readdirSync', function() {
        // TODO:
    });

    it('#mkdirSync', function() {
      fs.mkdirSync('bro');
      expect(fs.readdirSync('bro')).to.be.empty;
      fs.writeFileSync('bro/apple.txt', 'apple');

      expect(fs.readFileSync('bro/apple.txt', 'UTF8')).to.eql('apple');
      expect(fs.readdirSync('bro')).to.deep.eql([
        'apple.txt'
      ]);

      var outputChanges = fs.outputChanges();

      expect(outputChanges[0]).to.be.sameOperationAs(
        ['mkdir', 'bro', entryFromPath('tmp/out/bro')]
      );

      expect(outputChanges[1]).to.be.sameOperationAs(
        ['create', 'bro/apple.txt', entryFromPath('tmp/out/bro/apple.txt')]
      );
    });

    it('#rmdirSync', function() {
      mkdirp.sync('tmp/in/bro');
      expect(fs.existsSync('bro')).to.be.true;

      fs.rmdirSync('bro');

      expect(fs.existsSync('bro')).to.be.false;

      var outputChanges = fs.outputChanges();

      expect(outputChanges[0]).to.be.sameOperationAs(
        ['rmdir', 'bro', undefined]
      );
    });

    it('#inputChanges', function() {
      write('tmp/in/apple.txt', 'apple');

      expect(fs.inputChanges()[0]).to.be.sameOperationAs([
        'create',
        'apple.txt',
        entryFromPath('tmp/in/apple.txt')
      ]);

      expect(fs.inputChanges()).to.deep.eql([]);
    });

  });
});

function s(data) {
  return JSON.parse(JSON.stringify(data));
}
