import { DeviceEventEmitter, Platform } from 'react-native';

var listeners = [];

function addKeyEventListener(callback) {
  if (Platform.OS !== 'android') return { remove: function () {} };
  var sub = DeviceEventEmitter.addListener('onKeyEvent', callback);
  listeners.push(sub);
  return sub;
}

function removeKeyEventListener(sub) {
  if (sub && sub.remove) sub.remove();
  var idx = listeners.indexOf(sub);
  if (idx !== -1) listeners.splice(idx, 1);
}

export { addKeyEventListener, removeKeyEventListener };
