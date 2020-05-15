const glob = require('glob');
const async = require('async');
const fs = require('fs');
const fileType = require('file-type');

(async function main() {
  try {
    let cwd = '/mnt/hgfs/_shared/ero/';
    let filePaths = await _getFilesInDir(cwd);
    let fileProps = await _getFileProps(filePaths, cwd);
    let notJpegOrGifFileProps = _getNotJpegFileProps(fileProps);
    console.log('Results', notJpegOrGifFileProps);
  } catch (err) {
    console.log('Error', err);
  }
})();

async function _getFilesInDir(cwd) {
  let fileAndDirPaths = await _getFilePaths('**/*', cwd);
  return async.filterLimit(fileAndDirPaths, 100, (fp, done) => {
    fs.stat(cwd + fp, (err, stats) => {
      if (err) {
        done(err);
      } else {
        done(null, stats.isFile());
      }
    });
  });
}

function _getFileProps(filePaths, cwd) {
  return async.mapLimit(filePaths, 100, (fp, done) => {
    fileType
      .fromFile(cwd + fp)
      .then(res => {
        res = res || {};
        res.path = fp;
        done(null, res);
      })
      .catch(err => {
        console.log('Err', fp);
        done(err);
      });
  });
}

function _getNotJpegFileProps(fileProps) {
  return fileProps.filter(fp => fp.mime !== 'image/jpeg' && fp.mime !== 'image/gif');
}

function _getFilePaths(pattern, cwd) {
  return new Promise((resolve, reject) => {
    glob(pattern, {
      cwd,
      ignore: 'node_modules/**'
    }, (err, matches) => {
      if (err) {
        reject(err);
      } else {
        resolve(matches);
      }
    });
  });
}
