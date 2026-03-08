import { NativeModules } from 'react-native';

const AudioRecorderModule = NativeModules.AudioRecorderModule;

export function startRecording() {
  if (!AudioRecorderModule) {
    return Promise.reject(new Error('AudioRecorderModule not available'));
  }
  return AudioRecorderModule.startRecording();
}

export function stopRecording() {
  if (!AudioRecorderModule) {
    return Promise.reject(new Error('AudioRecorderModule not available'));
  }
  return AudioRecorderModule.stopRecording().then(function (result) {
    const data = JSON.parse(result);
    return {
      base64: data.base64,
      duration: data.duration,
      name: data.name,
      type: data.type,
    };
  });
}

export function cancelRecording() {
  if (!AudioRecorderModule) return Promise.resolve();
  return AudioRecorderModule.cancelRecording();
}
