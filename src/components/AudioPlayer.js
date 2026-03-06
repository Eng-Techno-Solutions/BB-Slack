import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';

export default class AudioPlayer extends Component {
  render() {
    var { visible, source, fileName, onClose } = this.props;

    if (Platform.OS !== 'web' || !visible) return null;

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <View style={styles.card}>
            <TouchableOpacity activeOpacity={1} onPress={function () {}}>
              <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>{fileName || 'Audio'}</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeText}>X</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#222529',
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
    borderBottomColor: '#383838',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#383838',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeText: {
    color: '#D1D2D3',
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerArea: {
    padding: 20,
  },
});
