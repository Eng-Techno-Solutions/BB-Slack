import React, { Component } from 'react';
import { View, Text, Image, TouchableHighlight, ScrollView, StyleSheet } from 'react-native';
import { getColors } from '../theme';

const AVATAR_COLORS = [
  '#E8912D', '#2BAC76', '#CD2553', '#1264A3',
  '#9B59B6', '#E74C3C', '#00BCD4', '#4A154B',
  '#3498DB', '#E67E22', '#1ABC9C', '#8E44AD',
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getAvatarColor(userId) {
  return AVATAR_COLORS[hashCode(userId || '') % AVATAR_COLORS.length];
}

function getProfileImage(userId, usersMap) {
  var u = usersMap[userId];
  if (u && u.profile) {
    return u.profile.image_72 || u.profile.image_48 || null;
  }
  return null;
}

function getLastMentionQuery(text) {
  var at = text.lastIndexOf('@');
  if (at === -1) return null;
  var before = at > 0 ? text.charAt(at - 1) : ' ';
  if (before !== ' ' && before !== '\n') return null;
  return text.substring(at + 1).toLowerCase();
}

function filterUsers(usersMap, query) {
  var results = [];
  var keys = Object.keys(usersMap);
  for (var i = 0; i < keys.length; i++) {
    var u = usersMap[keys[i]];
    if (u.deleted || u.is_bot) continue;
    var name = (u.real_name || u.name || '').toLowerCase();
    var display = (u.profile && u.profile.display_name || '').toLowerCase();
    if (name.indexOf(query) !== -1 || display.indexOf(query) !== -1 || keys[i].toLowerCase().indexOf(query) !== -1) {
      results.push({
        id: keys[i],
        name: u.real_name || u.name || keys[i],
        display: u.profile && u.profile.display_name || '',
      });
    }
    if (results.length >= 8) break;
  }
  return results;
}

export default class MentionSuggest extends Component {
  constructor(props) {
    super(props);
    this.state = { focusIndex: 0 };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.text !== this.props.text) {
      this.setState({ focusIndex: 0 });
    }
  }

  getUsers() {
    var { text, usersMap } = this.props;
    if (!text || !usersMap) return [];
    var query = getLastMentionQuery(text);
    if (query === null) return [];
    return filterUsers(usersMap, query);
  }

  isVisible() {
    return this.getUsers().length > 0;
  }

  handleKeyEvent(action) {
    var users = this.getUsers();
    if (users.length === 0) return false;
    var idx = this.state.focusIndex;

    if (action === 'up') {
      this.setState({ focusIndex: idx <= 0 ? 0 : idx - 1 });
      return true;
    } else if (action === 'down') {
      this.setState({ focusIndex: idx < 0 ? 0 : Math.min(idx + 1, users.length - 1) });
      return true;
    } else if (action === 'select') {
      var safeIdx = idx < 0 ? 0 : idx;
      var u = users[safeIdx];
      if (u) this.props.onSelect(u.id, u.name);
      return true;
    }
    return false;
  }

  render() {
    var { usersMap, onSelect } = this.props;
    var users = this.getUsers();
    if (users.length === 0) return null;

    var c = getColors();
    var focusIndex = this.state.focusIndex;

    return (
      <ScrollView style={[styles.container, { backgroundColor: c.bgSecondary, borderColor: c.border }]} keyboardShouldPersistTaps="always">
        {users.map(function (u, i) {
          var profileImg = getProfileImage(u.id, usersMap);
          var initial = (u.name || '?').charAt(0).toUpperCase();
          var avatarBg = getAvatarColor(u.id);
          var focused = i === focusIndex;

          return (
            <TouchableHighlight
              key={u.id}
              style={[styles.item, focused && { backgroundColor: c.messageUnderlay }]}
              underlayColor={c.messageUnderlay}
              data-type="mention-item"
              onPress={function () { onSelect(u.id, u.name); }}
            >
              <View style={styles.itemInner}>
                {profileImg ? (
                  <Image source={{ uri: profileImg }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: avatarBg }]}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>
                )}
                <Text style={[styles.name, { color: c.textSecondary }]}>{u.name}</Text>
                {u.display ? <Text style={[styles.display, { color: c.textTertiary }]}>{u.display}</Text> : null}
              </View>
            </TouchableHighlight>
          );
        })}
      </ScrollView>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    maxHeight: 200,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 4,
    marginRight: 10,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  display: {
    fontSize: 13,
  },
});
