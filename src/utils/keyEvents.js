import { DeviceEventEmitter, Platform } from 'react-native';

const listeners = [];

function addKeyEventListener(callback) {
  if (Platform.OS !== 'android') return { remove: function () {} };
  const sub = DeviceEventEmitter.addListener('onKeyEvent', callback);
  listeners.push(sub);
  return sub;
}

function removeKeyEventListener(sub) {
  if (sub && sub.remove) sub.remove();
  const idx = listeners.indexOf(sub);
  if (idx !== -1) listeners.splice(idx, 1);
}

export { addKeyEventListener, removeKeyEventListener };
