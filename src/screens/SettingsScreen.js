import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableHighlight,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Header from '../components/Header';
import Icon from '../components/Icon';
import { getColors } from '../theme';

var INTERVAL_OPTIONS = [
  { label: '1 minute', value: 60000 },
  { label: '2 minutes', value: 120000 },
  { label: '3 minutes', value: 180000 },
  { label: '5 minutes', value: 300000 },
  { label: '10 minutes', value: 600000 },
];

export default class SettingsScreen extends Component {
  render() {
    var { notifEnabled, notifInterval, onToggleNotif, onChangeInterval, onBack } = this.props;
    var c = getColors();

    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <Header title="Settings" onBack={onBack} />
        <ScrollView>
          <Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>NOTIFICATIONS</Text>

          <TouchableHighlight
            style={[styles.row, { borderBottomColor: c.border }]}
            underlayColor={c.listUnderlay}
            onPress={onToggleNotif}
            data-type="list-item"
          >
            <View style={styles.rowInner}>
              <View style={styles.rowLeft}>
                <Icon name="bell" size={18} color={c.textTertiary} />
                <Text style={[styles.rowLabel, { color: c.textSecondary }]}>Push Notifications</Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: notifEnabled ? c.green || '#2BAC76' : c.bgTertiary }]}>
                <View style={[styles.toggleKnob, notifEnabled && styles.toggleKnobOn]} />
              </View>
            </View>
          </TouchableHighlight>

          {notifEnabled ? (
            <View>
              <Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>CHECK INTERVAL</Text>
              {INTERVAL_OPTIONS.map(function (opt) {
                var selected = notifInterval === opt.value;
                return (
                  <TouchableHighlight
                    key={opt.value}
                    style={[styles.row, { borderBottomColor: c.border }]}
                    underlayColor={c.listUnderlay}
                    onPress={function () { onChangeInterval(opt.value); }}
                    data-type="list-item"
                  >
                    <View style={styles.rowInner}>
                      <Text style={[styles.rowLabel, { color: c.textSecondary, marginLeft: 0 }]}>{opt.label}</Text>
                      {selected ? (
                        <Icon name="check" size={18} color={c.accent || '#1264A3'} />
                      ) : null}
                    </View>
                  </TouchableHighlight>
                );
              })}
              <Text style={[styles.hint, { color: c.textPlaceholder }]}>
                How often the app checks for new DMs and mentions when in the background.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 15,
    marginLeft: 12,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  hint: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    lineHeight: 16,
  },
});
