function downloadAudio(url, token, callback) {
  callback(null, url);
}

function cleanupFile() {}

export default { downloadAudio: downloadAudio, cleanupFile: cleanupFile };
