import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';

export default class ActionSheet extends Component {
  render() {
    var { visible, actions, onClose } = this.props;

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.sheet}>
            {actions.map(function (action, i) {
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.action, action.destructive && styles.destructive]}
                  onPress={action.onPress}
                >
                  <Text style={[styles.actionText, action.destructive && styles.destructiveText]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#222529',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 20,
  },
  action: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
  },
  destructive: {},
  actionText: {
    color: '#D1D2D3',
    fontSize: 16,
  },
  destructiveText: {
    color: '#E01E5A',
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#ABABAD',
    fontSize: 16,
  },
});
