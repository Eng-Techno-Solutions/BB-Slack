var RNFS = require('react-native-fs');

function downloadAudio(url, token, callback) {
  var destPath = RNFS.CachesDirectoryPath + '/bb_audio_' + Date.now() + '.mp4';
  RNFS.downloadFile({
    fromUrl: url,
    toFile: destPath,
    headers: { Authorization: 'Bearer ' + token },
  }).promise.then(function (res) {
    if (res.statusCode === 200) {
      callback(null, destPath);
    } else {
      callback('Failed to download audio', null);
    }
  }).catch(function () {
    callback('Failed to download audio', null);
  });
}

function cleanupFile(path) {
  if (path) {
    RNFS.unlink(path).catch(function () {});
  }
}

export default { downloadAudio: downloadAudio, cleanupFile: cleanupFile };
