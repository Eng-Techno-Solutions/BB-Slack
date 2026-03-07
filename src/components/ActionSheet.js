import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableHighlight,
  Modal,
  StyleSheet,
} from 'react-native';
import { getColors } from '../theme';

export default class ActionSheet extends Component {
  render() {
    var { visible, actions, onClose } = this.props;
    var c = getColors();

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: c.overlayLight }]}
          activeOpacity={1}
          onPress={onClose}
          data-type="overlay"
        >
          <View style={[styles.sheet, { backgroundColor: c.bgTertiary }]}>
            {actions.map(function (action, i) {
              return (
                <TouchableHighlight
                  key={i}
                  style={[styles.action, { borderBottomColor: c.border }]}
                  underlayColor={c.actionUnderlay}
                  onPress={action.onPress}
                  data-type="action-item"
                >
                  <Text style={[styles.actionText, { color: c.textSecondary }, action.destructive && { color: c.error }]}>
                    {action.label}
                  </Text>
                </TouchableHighlight>
              );
            })}
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} data-type="text-btn">
              <Text style={[styles.cancelText, { color: c.textTertiary }]}>Cancel</Text>
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
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 20,
  },
  action: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  actionText: {
    fontSize: 16,
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
  },
});
