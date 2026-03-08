import React, { Component } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  PanResponder,
  Platform,
} from 'react-native';
import Icon from './Icon';
import { getColors } from '../theme';

function imageSource(url, token) {
  if (Platform.OS !== 'web' && url && token) {
    return { uri: url, headers: { Authorization: 'Bearer ' + token } };
  }
  return { uri: url };
}

export default class ImageViewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      error: false,
      scale: 1,
      translateX: 0,
      translateY: 0,
      dragging: false,
    };
    this.lastMouse = { x: 0, y: 0 };
    this.imgRef = React.createRef();
  }

  componentDidUpdate(prevProps) {
    if (this.props.source !== prevProps.source) {
      this.setState({ loading: true, error: false, scale: 1, translateX: 0, translateY: 0 });
      this._panResponder = null;
    }
  }

  handleWheel(e) {
    e.preventDefault();
    this.setState(function (prev) {
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      const next = Math.min(5, Math.max(0.5, prev.scale + delta));
      if (next <= 1) {
        return { scale: next, translateX: 0, translateY: 0 };
      }
      return { scale: next };
    });
  }

  handleMouseDown(e) {
    if (this.state.scale <= 1) return;
    e.preventDefault();
    this.lastMouse = { x: e.clientX, y: e.clientY };
    this.setState({ dragging: true });
  }

  handleMouseMove(e) {
    if (!this.state.dragging) return;
    const dx = e.clientX - this.lastMouse.x;
    const dy = e.clientY - this.lastMouse.y;
    this.lastMouse = { x: e.clientX, y: e.clientY };
    this.setState(function (prev) {
      return { translateX: prev.translateX + dx, translateY: prev.translateY + dy };
    });
  }

  handleMouseUp() {
    this.setState({ dragging: false });
  }

  renderWebImage(win, source, token) {
    const self = this;
    const s = this.state;
    const c = getColors();

    return (
      <View style={styles.imageContainer}>
        {s.loading ? (
          <ActivityIndicator size="large" color={c.accent} style={styles.loader} />
        ) : null}
        <View
          ref={this.imgRef}
          style={{
            cursor: s.scale > 1 ? (s.dragging ? 'grabbing' : 'grab') : 'zoom-in',
            overflow: 'hidden',
            width: win.width - 32,
            height: win.height - 160,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onWheel={function (e) { self.handleWheel(e.nativeEvent || e); }}
          onMouseDown={function (e) { self.handleMouseDown(e.nativeEvent || e); }}
          onMouseMove={function (e) { self.handleMouseMove(e.nativeEvent || e); }}
          onMouseUp={function () { self.handleMouseUp(); }}
          onMouseLeave={function () { self.handleMouseUp(); }}
        >
          <Image
            source={imageSource(source, token)}
            style={{
              width: win.width - 32,
              height: win.height - 160,
              transform: [
                { scale: s.scale },
                { translateX: s.translateX / s.scale },
                { translateY: s.translateY / s.scale },
              ],
            }}
            resizeMode="contain"
            onLoad={function () { self.setState({ loading: false }); }}
            onError={function () { self.setState({ loading: false, error: true }); }}
          />
        </View>
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={[styles.zoomBtn, { borderColor: c.border }]}
            onPress={function () {
              self.setState(function (prev) {
                const next = Math.min(5, prev.scale + 0.5);
                return { scale: next };
              });
            }}
            data-type="btn"
          >
            <Icon name="plus" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.zoomBtn, { borderColor: c.border }]}
            onPress={function () {
              self.setState(function (prev) {
                const next = Math.max(0.5, prev.scale - 0.5);
                if (next <= 1) {
                  return { scale: next, translateX: 0, translateY: 0 };
                }
                return { scale: next };
              });
            }}
            data-type="btn"
          >
            <Icon name="minus" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          {s.scale !== 1 ? (
            <TouchableOpacity
              style={[styles.zoomBtn, { borderColor: c.border }]}
              onPress={function () { self.setState({ scale: 1, translateX: 0, translateY: 0 }); }}
              data-type="btn"
            >
              <Icon name="rotate-ccw" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  _getDistance(touches) {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _setupPanResponder() {
    if (this._panResponder) return this._panResponder;
    const self = this;
    this._baseScale = 1;
    this._baseTX = 0;
    this._baseTY = 0;
    this._pinchStartDist = 0;
    this._lastMoveX = 0;
    this._lastMoveY = 0;

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: function () { return true; },
      onMoveShouldSetPanResponder: function () { return true; },
      onPanResponderGrant: function (e) {
        const touches = e.nativeEvent.touches;
        self._baseScale = self.state.scale;
        self._baseTX = self.state.translateX;
        self._baseTY = self.state.translateY;
        if (touches && touches.length === 2) {
          self._pinchStartDist = self._getDistance(touches);
        } else if (touches && touches.length === 1) {
          self._lastMoveX = touches[0].pageX;
          self._lastMoveY = touches[0].pageY;
        }
      },
      onPanResponderMove: function (e) {
        const touches = e.nativeEvent.touches;
        if (touches && touches.length === 2) {
          const dist = self._getDistance(touches);
          if (self._pinchStartDist > 0) {
            const newScale = Math.min(5, Math.max(0.5, self._baseScale * (dist / self._pinchStartDist)));
            self.setState({ scale: newScale });
          }
        } else if (touches && touches.length === 1 && self.state.scale > 1) {
          const dx = touches[0].pageX - self._lastMoveX;
          const dy = touches[0].pageY - self._lastMoveY;
          self._lastMoveX = touches[0].pageX;
          self._lastMoveY = touches[0].pageY;
          self.setState(function (prev) {
            return { translateX: prev.translateX + dx, translateY: prev.translateY + dy };
          });
        }
      },
      onPanResponderRelease: function () {
        if (self.state.scale < 1) {
          self.setState({ scale: 1, translateX: 0, translateY: 0 });
        }
      },
    });
    return this._panResponder;
  }

  renderNativeImage(win, source, token) {
    const self = this;
    const s = this.state;
    const c = getColors();
    const panHandlers = this._setupPanResponder().panHandlers;

    return (
      <View style={styles.imageContainer}>
        {s.loading ? (
          <ActivityIndicator size="large" color={c.accent} style={styles.loader} />
        ) : null}
        <View
          style={{
            width: win.width - 32,
            height: win.height - 160,
            overflow: 'hidden',
          }}
          {...panHandlers}
        >
          <Image
            source={imageSource(source, token)}
            style={{
              width: win.width - 32,
              height: win.height - 160,
              transform: [
                { scale: s.scale },
                { translateX: s.translateX / s.scale },
                { translateY: s.translateY / s.scale },
              ],
            }}
            resizeMode="contain"
            onLoad={function () { self.setState({ loading: false }); }}
            onError={function () { self.setState({ loading: false, error: true }); }}
          />
        </View>
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={[styles.zoomBtn, { borderColor: c.border }]}
            onPress={function () {
              self.setState(function (prev) {
                const next = Math.min(5, prev.scale + 0.5);
                return { scale: next };
              });
            }}
            data-type="btn"
          >
            <Icon name="plus" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.zoomBtn, { borderColor: c.border }]}
            onPress={function () {
              self.setState(function (prev) {
                const next = Math.max(0.5, prev.scale - 0.5);
                if (next <= 1) {
                  return { scale: next, translateX: 0, translateY: 0 };
                }
                return { scale: next };
              });
            }}
            data-type="btn"
          >
            <Icon name="minus" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          {s.scale !== 1 ? (
            <TouchableOpacity
              style={[styles.zoomBtn, { borderColor: c.border }]}
              onPress={function () { self.setState({ scale: 1, translateX: 0, translateY: 0 }); }}
              data-type="btn"
            >
              <Icon name="rotate-ccw" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  render() {
    const { visible, source, fileName, token, onClose } = this.props;
    const { error } = this.state;
    const self = this;
    const win = Dimensions.get('window');
    const c = getColors();

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={[styles.overlay, { backgroundColor: c.overlayHeavy }]}>
          <View style={[styles.topBar, { backgroundColor: 'rgba(0,0,0,0.85)', borderBottomColor: c.border }]}>
            <View style={styles.titleArea}>
              <Text style={[styles.fileName, { color: '#FFFFFF' }]} numberOfLines={1}>
                {fileName || 'Image'}
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]} onPress={onClose} data-type="icon-btn">
              <Icon name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.imageArea}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: c.bgTertiary }]}>
                <Text style={[styles.errorText, { color: c.textTertiary }]}>Failed to load image</Text>
                <TouchableOpacity style={[styles.retryBtn, { backgroundColor: c.accent }]} onPress={function () { self.setState({ loading: true, error: false, scale: 1, translateX: 0, translateY: 0 }); }} data-type="btn">
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              Platform.OS === 'web'
                ? this.renderWebImage(win, source, token)
                : this.renderNativeImage(win, source, token)
            )}
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  titleArea: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  imageArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    position: 'absolute',
    zIndex: 1,
  },
  errorBox: {
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    gap: 8,
  },
  zoomBtn: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
});
