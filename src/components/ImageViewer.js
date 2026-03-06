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
} from 'react-native';

export default class ImageViewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      error: false,
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.source !== prevProps.source) {
      this.setState({ loading: true, error: false });
    }
  }

  render() {
    var { visible, source, fileName, onClose } = this.props;
    var { loading, error } = this.state;
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
                <TouchableOpacity style={styles.retryBtn} onPress={function () { self.setState({ loading: true, error: false }); }}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imageContainer}>
                {loading ? (
                  <ActivityIndicator
                    size="large"
                    color="#1264A3"
                    style={styles.loader}
                  />
                ) : null}
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
              </View>
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
});
