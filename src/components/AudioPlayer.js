import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import Icon from './Icon';
import { getColors } from '../theme';

function formatSecs(s) {
  var m = Math.floor(s / 60);
  var sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

export default class AudioPlayer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      playing: false,
      duration: 0,
      position: 0,
      error: null,
    };
    this.sound = null;
    this.timer = null;
    this.Sound = null;
  }

  getNativeSound() {
    if (!this.Sound) {
      this.Sound = require('./NativeSound').default;
    }
    return this.Sound;
  }

  componentDidUpdate(prevProps) {
    if (Platform.OS === 'web') return;
    if (this.props.visible && !prevProps.visible && this.props.source) {
      this.loadSound(this.props.source);
    }
    if (!this.props.visible && prevProps.visible) {
      this.stopAndRelease();
    }
  }

  componentWillUnmount() {
    this.stopAndRelease();
  }

  loadSound(url) {
    this.stopAndRelease();
    var SoundClass = this.getNativeSound();
    if (!SoundClass) return;
    var self = this;
    this.sound = new SoundClass(url, null, function (err) {
      if (err) {
        self.setState({ error: 'Failed to load audio' });
        return;
      }
      self.setState({
        duration: self.sound.getDuration(),
        position: 0,
        error: null,
      });
      self.play();
    });
  }

  play() {
    if (!this.sound) return;
    var self = this;
    this.sound.play(function (success) {
      if (success) {
        self.setState({ playing: false, position: self.state.duration });
      }
      self.clearTimer();
    });
    this.setState({ playing: true });
    this.startTimer();
  }

  pause() {
    if (this.sound) this.sound.pause();
    this.setState({ playing: false });
    this.clearTimer();
  }

  togglePlay() {
    if (this.state.playing) {
      this.pause();
    } else {
      if (this.sound && this.state.position >= this.state.duration) {
        this.sound.setCurrentTime(0);
        this.setState({ position: 0 });
      }
      this.play();
    }
  }

  seek(val) {
    if (this.sound) {
      this.sound.setCurrentTime(val);
      this.setState({ position: val });
    }
  }

  startTimer() {
    this.clearTimer();
    var self = this;
    this.timer = setInterval(function () {
      if (self.sound && self.state.playing) {
        self.sound.getCurrentTime(function (sec) {
          self.setState({ position: sec });
        });
      }
    }, 250);
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  stopAndRelease() {
    this.clearTimer();
    if (this.sound) {
      this.sound.stop();
      this.sound.release();
      this.sound = null;
    }
    this.setState({ playing: false, duration: 0, position: 0, error: null });
  }

  handleClose() {
    this.stopAndRelease();
    this.props.onClose && this.props.onClose();
  }

  renderWebPlayer() {
    var source = this.props.source;
    return (
      <View style={styles.playerArea}>
        <audio
          controls
          autoPlay
          style={{ width: '100%', height: 48 }}
          onError={function () {
            console.warn('Audio load error for:', source);
          }}
        >
          <source src={source} type="audio/mp4" />
          <source src={source} type="audio/mpeg" />
        </audio>
      </View>
    );
  }

  renderNativePlayer() {
    var self = this;
    var s = this.state;
    var c = getColors();

    if (s.error) {
      return (
        <View style={styles.playerArea}>
          <Text style={[styles.errorText, { color: c.textTertiary }]}>{s.error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: c.accent }]}
            onPress={function () { self.loadSound(self.props.source); }}
            data-type="btn"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    var progress = s.duration > 0 ? s.position / s.duration : 0;

    return (
      <View style={styles.playerArea}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: c.green }]}
            onPress={function () { self.togglePlay(); }}
            data-type="icon-btn"
          >
            <Icon name={s.playing ? 'pause' : 'play'} size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.sliderArea}>
            <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
              <View style={[styles.progressFill, { flex: progress, backgroundColor: c.accent }]} />
              <View style={{ flex: 1 - progress }} />
            </View>
            <View style={styles.timeRow}>
              <Text style={[styles.timeText, { color: c.textTertiary }]}>{formatSecs(s.position)}</Text>
              <Text style={[styles.timeText, { color: c.textTertiary }]}>{formatSecs(s.duration)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  render() {
    var { visible, fileName } = this.props;
    var self = this;
    var c = getColors();

    if (!visible) return null;

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={function () { self.handleClose(); }}
      >
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: c.overlayMedium }]}
          activeOpacity={1}
          onPress={function () { self.handleClose(); }}
          data-type="overlay"
        >
          <View style={[styles.card, { backgroundColor: c.bgTertiary }]}>
            <TouchableOpacity activeOpacity={1} onPress={function () {}} data-type="overlay">
              <View style={[styles.header, { borderBottomColor: c.border }]}>
                <Text style={[styles.title, { color: c.textPrimary }]} numberOfLines={1}>{fileName || 'Audio'}</Text>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: c.fileIconBg }]}
                  onPress={function () { self.handleClose(); }}
                  data-type="icon-btn"
                >
                  <Icon name="close" size={16} color={c.textSecondary} />
                </TouchableOpacity>
              </View>
              {Platform.OS === 'web'
                ? this.renderWebPlayer()
                : this.renderNativePlayer()
              }
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }
}

var styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  playerArea: {
    padding: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sliderArea: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressFill: {},
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    fontSize: 11,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 4,
    alignSelf: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
