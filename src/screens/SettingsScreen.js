import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableHighlight,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import Header from '../components/Header';
import Icon from '../components/Icon';
import { getColors, getMode } from '../theme';

var INTERVAL_OPTIONS = [
  { label: '1 minute', value: 60000 },
  { label: '2 minutes', value: 120000 },
  { label: '3 minutes', value: 180000 },
  { label: '5 minutes', value: 300000 },
  { label: '10 minutes', value: 600000 },
];

var FONT_SIZE_OPTIONS = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

export default class SettingsScreen extends Component {
  renderToggleRow(icon, label, enabled, onPress) {
    var c = getColors();
    return (
      <TouchableHighlight
        style={[styles.row, { borderBottomColor: c.border }]}
        underlayColor={c.listUnderlay}
        onPress={onPress}
        data-type="list-item"
      >
        <View style={styles.rowInner}>
          <View style={styles.rowLeft}>
            <Icon name={icon} size={18} color={c.textTertiary} />
            <Text style={[styles.rowLabel, { color: c.textSecondary }]}>{label}</Text>
          </View>
          <View style={[styles.toggle, { backgroundColor: enabled ? c.green || '#2BAC76' : c.bgTertiary }]}>
            <View style={[styles.toggleKnob, enabled && styles.toggleKnobOn]} />
          </View>
        </View>
      </TouchableHighlight>
    );
  }

  renderSelectList(options, selectedValue, onSelect) {
    var c = getColors();
    return options.map(function (opt) {
      var selected = selectedValue === opt.value;
      return (
        <TouchableHighlight
          key={opt.value}
          style={[styles.row, { borderBottomColor: c.border }]}
          underlayColor={c.listUnderlay}
          onPress={function () { onSelect(opt.value); }}
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
    });
  }

  render() {
    var {
      notifEnabled, notifInterval, onToggleNotif, onChangeInterval,
      soundEnabled, onToggleSound,
      themeMode, onToggleTheme,
      fontSize, onChangeFontSize,
      onBack,
    } = this.props;
    var c = getColors();
    var isDark = getMode() === 'dark';

    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <Header title="Settings" onBack={onBack} />
        <ScrollView>

          <Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>NOTIFICATIONS</Text>
          {this.renderToggleRow('bell', 'Push Notifications', notifEnabled, onToggleNotif)}
          {this.renderToggleRow('mic', 'Notification Sound', soundEnabled, onToggleSound)}

          {notifEnabled ? (
            <View>
              <Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>CHECK INTERVAL</Text>
              {this.renderSelectList(INTERVAL_OPTIONS, notifInterval, onChangeInterval)}
              <Text style={[styles.hint, { color: c.textPlaceholder }]}>
                How often the app checks for new DMs and mentions.
              </Text>
            </View>
          ) : null}

          <Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>APPEARANCE</Text>

          <TouchableHighlight
            style={[styles.row, { borderBottomColor: c.border }]}
            underlayColor={c.listUnderlay}
            onPress={onToggleTheme}
            data-type="list-item"
          >
            <View style={styles.rowInner}>
              <View style={styles.rowLeft}>
                <Icon name={isDark ? 'moon' : 'sun'} size={18} color={c.textTertiary} />
                <Text style={[styles.rowLabel, { color: c.textSecondary }]}>Theme</Text>
              </View>
              <Text style={[styles.rowValue, { color: c.textPlaceholder }]}>{isDark ? 'Dark' : 'Light'}</Text>
            </View>
          </TouchableHighlight>

          <Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>MESSAGE TEXT SIZE</Text>
          {this.renderSelectList(FONT_SIZE_OPTIONS, fontSize, onChangeFontSize)}

          <Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>ABOUT</Text>
          <View style={[styles.row, { borderBottomColor: c.border }]}>
            <View style={styles.rowInner}>
              <Text style={[styles.rowLabel, { color: c.textSecondary, marginLeft: 0 }]}>App</Text>
              <Text style={[styles.rowValue, { color: c.textPlaceholder }]}>BB Slack</Text>
            </View>
          </View>
          <View style={[styles.row, { borderBottomColor: c.border }]}>
            <View style={styles.rowInner}>
              <Text style={[styles.rowLabel, { color: c.textSecondary, marginLeft: 0 }]}>Version</Text>
              <Text style={[styles.rowValue, { color: c.textPlaceholder }]}>1.0.0</Text>
            </View>
          </View>
          <TouchableHighlight
            style={[styles.row, { borderBottomColor: c.border }]}
            underlayColor={c.listUnderlay}
            onPress={function () { Linking.openURL('https://ammaryaser.com/'); }}
            data-type="list-item"
          >
            <View style={styles.rowInner}>
              <View style={styles.rowLeft}>
                <Icon name="globe" size={18} color={c.textTertiary} />
                <Text style={[styles.rowLabel, { color: c.textSecondary }]}>Powered by Eng Techno</Text>
              </View>
              <Icon name="external-link" size={14} color={c.textPlaceholder} />
            </View>
          </TouchableHighlight>

          <Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>DEVELOPER</Text>
          <View style={[styles.row, { borderBottomColor: c.border }]}>
            <View style={styles.rowInner}>
              <View style={styles.rowLeft}>
                <Icon name="user" size={18} color={c.textTertiary} />
                <Text style={[styles.rowLabel, { color: c.textSecondary }]}>Ammar Yaser</Text>
              </View>
            </View>
          </View>
          <View style={[styles.devBio, { borderBottomColor: c.border }]}>
            <Text style={[styles.bioText, { color: c.textPlaceholder }]}>
              Senior Software Engineer & Product Builder. Full-stack development across frontend, backend, mobile & desktop with over a decade of experience.
            </Text>
          </View>
          <TouchableHighlight
            style={[styles.row, { borderBottomColor: c.border }]}
            underlayColor={c.listUnderlay}
            onPress={function () { Linking.openURL('https://ammaryaser.com/'); }}
            data-type="list-item"
          >
            <View style={styles.rowInner}>
              <View style={styles.rowLeft}>
                <Icon name="globe" size={18} color={c.textTertiary} />
                <Text style={[styles.rowLabel, { color: c.textSecondary }]}>ammaryaser.com</Text>
              </View>
              <Icon name="external-link" size={14} color={c.textPlaceholder} />
            </View>
          </TouchableHighlight>

          <Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>SUPPORT</Text>
          <TouchableHighlight
            style={[styles.row, { borderBottomColor: c.border }]}
            underlayColor={c.listUnderlay}
            onPress={function () { Linking.openURL('https://buymeacoffee.com/ammaryaserh'); }}
            data-type="list-item"
          >
            <View style={styles.rowInner}>
              <View style={styles.rowLeft}>
                <Icon name="coffee" size={18} color={c.textTertiary} />
                <Text style={[styles.rowLabel, { color: c.textSecondary }]}>Buy Me a Coffee</Text>
              </View>
              <Icon name="external-link" size={14} color={c.textPlaceholder} />
            </View>
          </TouchableHighlight>
          <TouchableHighlight
            style={[styles.row, { borderBottomColor: c.border }]}
            underlayColor={c.listUnderlay}
            onPress={function () { Linking.openURL('https://paypal.me/ammartechno?locale.x=en_US&country.x=EG'); }}
            data-type="list-item"
          >
            <View style={styles.rowInner}>
              <View style={styles.rowLeft}>
                <Icon name="heart" size={18} color={c.textTertiary} />
                <Text style={[styles.rowLabel, { color: c.textSecondary }]}>Donate via PayPal</Text>
              </View>
              <Icon name="external-link" size={14} color={c.textPlaceholder} />
            </View>
          </TouchableHighlight>

          <View style={styles.bottomPad} />
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
  rowValue: {
    fontSize: 14,
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
  devBio: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottomPad: {
    height: 40,
  },
});
