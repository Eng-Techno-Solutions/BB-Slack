var Sound = require('react-native-sound');
Sound.setCategory('Playback');

var notifSound = null;

export function playNotification() {
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
