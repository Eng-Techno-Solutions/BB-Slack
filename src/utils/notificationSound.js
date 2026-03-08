var Sound = require('react-native-sound');
Sound.setCategory('Playback');

var notifSound = null;
var _muted = false;

export function setNotificationMuted(muted) {
  _muted = muted;
}

export function playNotification() {
  if (_muted) return;
  try {
    if (!notifSound) {
      notifSound = new Sound('notification.mp3', Sound.MAIN_BUNDLE, function (err) {
        if (!err) notifSound.play();
      });
    } else {
      notifSound.stop(function () {
        notifSound.play();
      });
    }
  } catch (e) {
    // Silent fail if sound unavailable
  }
}
