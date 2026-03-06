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
  Platform,
} from 'react-native';

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
    }
  }

  handleWheel(e) {
    e.preventDefault();
    this.setState(function (prev) {
      var delta = e.deltaY > 0 ? -0.15 : 0.15;
      var next = Math.min(5, Math.max(0.5, prev.scale + delta));
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
    var dx = e.clientX - this.lastMouse.x;
    var dy = e.clientY - this.lastMouse.y;
    this.lastMouse = { x: e.clientX, y: e.clientY };
    this.setState(function (prev) {
      return { translateX: prev.translateX + dx, translateY: prev.translateY + dy };
    });
  }

  handleMouseUp() {
    this.setState({ dragging: false });
  }

  renderWebImage(win, source) {
    var self = this;
    var s = this.state;

    return (
      <View
        style={styles.imageContainer}
        onStartShouldSetResponder={function () { return true; }}
      >
        {s.loading ? (
          <ActivityIndicator size="large" color="#1264A3" style={styles.loader} />
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
            source={{ uri: source }}
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
        {s.scale > 1 ? (
          <TouchableOpacity
            style={styles.resetZoomBtn}
            onPress={function () { self.setState({ scale: 1, translateX: 0, translateY: 0 }); }}
          >
            <Text style={styles.resetZoomText}>Reset Zoom</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  renderNativeImage(win, source) {
    var self = this;
    var s = this.state;

    return (
      <View style={styles.imageContainer}>
        {s.loading ? (
          <ActivityIndicator size="large" color="#1264A3" style={styles.loader} />
        ) : null}
        <ScrollView
          style={{ width: win.width - 32, height: win.height - 160 }}
          contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}
          maximumZoomScale={5}
          minimumZoomScale={1}
          bouncesZoom={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent={true}
        >
          <Image
            source={{ uri: source }}
            style={{
              width: win.width - 32,
              height: win.height - 160,
            }}
            resizeMode="contain"
            onLoad={function () { self.setState({ loading: false }); }}
            onError={function () { self.setState({ loading: false, error: true }); }}
          />
        </ScrollView>
      </View>
    );
  }

  render() {
    var { visible, source, fileName, onClose } = this.props;
    var { error } = this.state;
    var self = this;
    var win = Dimensions.get('window');

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <View style={styles.titleArea}>
              <Text style={styles.fileName} numberOfLines={1}>
                {fileName || 'Image'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>X</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.imageArea}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>Failed to load image</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={function () { self.setState({ loading: true, error: false, scale: 1, translateX: 0, translateY: 0 }); }}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              Platform.OS === 'web'
                ? this.renderWebImage(win, source)
                : this.renderNativeImage(win, source)
            )}
          </View>
        </View>
      </Modal>
    );
  }
}

var styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
  },
  titleArea: {
    flex: 1,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#383838',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeText: {
    color: '#D1D2D3',
    fontSize: 16,
    fontWeight: 'bold',
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
    backgroundColor: '#222529',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#ABABAD',
    fontSize: 15,
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#1264A3',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resetZoomBtn: {
    position: 'absolute',
    bottom: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#383838',
  },
  resetZoomText: {
    color: '#D1D2D3',
    fontSize: 13,
    fontWeight: '600',
  },
});
