import React, { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default class Header extends Component {
  render() {
    var { title, subtitle, onBack, rightLabel, onRight } = this.props;
    return (
      <View style={styles.header}>
        <View style={styles.left}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backText}>{'<'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={styles.right}>
          {rightLabel && onRight ? (
            <TouchableOpacity onPress={onRight} style={styles.rightBtn}>
              <Text style={styles.rightText}>{rightLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }
}

var styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#19171D',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
  },
  left: {
    width: 50,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  right: {
    width: 50,
    alignItems: 'flex-end',
  },
  backBtn: {
    padding: 4,
  },
  backText: {
    color: '#D1D2D3',
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#ABABAD',
    fontSize: 11,
    marginTop: 1,
  },
  rightBtn: {
    padding: 4,
  },
  rightText: {
    color: '#D1D2D3',
    fontSize: 13,
  },
});
