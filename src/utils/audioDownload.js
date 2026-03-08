import { NativeModules } from 'react-native';

const HttpModule = NativeModules.HttpModule;
const RNFS = require('react-native-fs');

function downloadAudio(url, token, callback) {
  const destPath = RNFS.CachesDirectoryPath + '/bb_audio_' + Date.now() + '.mp4';

  if (HttpModule && HttpModule.downloadFile) {
    HttpModule.downloadFile(url, token, destPath)
      .then(function () {
        callback(null, destPath);
      })
      .catch(function () {
        callback('Failed to download audio', null);
      });
  } else {
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
}

function cleanupFile(path) {
  if (path) {
    RNFS.unlink(path).catch(function () {});
  }
}

export default { downloadAudio: downloadAudio, cleanupFile: cleanupFile };
