import React, { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import SlackText from './SlackText';

export default class Header extends Component {
  render() {
    var { title, subtitle, onBack, rightLabel, onRight } = this.props;
    return (
      <View style={styles.header}>
        <View style={styles.left}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Icon name="chevron-left" size={22} color="#D1D2D3" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <SlackText text={subtitle} style={styles.subtitle} numberOfLines={1} /> : null}
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
