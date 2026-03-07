var _mediaRecorder = null;
var _chunks = [];
var _startTime = 0;

export function startRecording() {
  return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    _chunks = [];
    _mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    _mediaRecorder.ondataavailable = function (e) {
      if (e.data.size > 0) _chunks.push(e.data);
    };
    _mediaRecorder.start();
    _startTime = Date.now();
    return 'recording';
  });
}

export function stopRecording() {
  return new Promise(function (resolve, reject) {
    if (!_mediaRecorder) {
      reject(new Error('No active recording'));
      return;
    }
    _mediaRecorder.onstop = function () {
      var duration = Math.round((Date.now() - _startTime) / 1000);
      var blob = new Blob(_chunks, { type: 'audio/webm' });
      var tracks = _mediaRecorder.stream.getTracks();
      for (var i = 0; i < tracks.length; i++) tracks[i].stop();
      _mediaRecorder = null;
      _chunks = [];
      resolve({
        blob: blob,
        duration: duration,
        name: 'voice_message.webm',
        type: 'audio/webm',
      });
    };
    _mediaRecorder.stop();
  });
}

export function cancelRecording() {
  if (_mediaRecorder) {
    try {
      var tracks = _mediaRecorder.stream.getTracks();
      for (var i = 0; i < tracks.length; i++) tracks[i].stop();
      _mediaRecorder.stop();
    } catch (e) {}
    _mediaRecorder = null;
    _chunks = [];
  }
  return Promise.resolve();
}
