import React, { Component } from 'react';
import { View, Text, TouchableHighlight, FlatList, StyleSheet } from 'react-native';
import { getUserName } from '../utils/format';
import { getColors } from '../theme';

function getLastMentionQuery(text) {
  const at = text.lastIndexOf('@');
  if (at === -1) return null;
  const before = at > 0 ? text.charAt(at - 1) : ' ';
  if (before !== ' ' && before !== '\n') return null;
  return text.substring(at + 1).toLowerCase();
}

function filterUsers(usersMap, query) {
  const results = [];
  const keys = Object.keys(usersMap);
  for (let i = 0; i < keys.length; i++) {
    const u = usersMap[keys[i]];
    if (u.deleted || u.is_bot) continue;
    const name = (u.real_name || u.name || '').toLowerCase();
    const display = (u.profile && u.profile.display_name || '').toLowerCase();
    if (name.indexOf(query) !== -1 || display.indexOf(query) !== -1 || keys[i].toLowerCase().indexOf(query) !== -1) {
      results.push({ id: keys[i], name: u.real_name || u.name || keys[i], display: u.profile && u.profile.display_name || '' });
    }
    if (results.length >= 8) break;
  }
  return results;
}

export default class MentionSuggest extends Component {
  render() {
    const { text, usersMap, onSelect } = this.props;
    if (!text || !usersMap) return null;

    const query = getLastMentionQuery(text);
    if (query === null) return null;

    const users = filterUsers(usersMap, query);
    if (users.length === 0) return null;

    const c = getColors();

    return (
      <View style={[styles.container, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        {users.map(function (u) {
          return (
            <TouchableHighlight
              key={u.id}
              style={styles.item}
              underlayColor={c.messageUnderlay}
              data-type="mention-item"
              onPress={function () { onSelect(u.id, u.name); }}
            >
              <View style={styles.itemInner}>
                <Text style={[styles.name, { color: c.textSecondary }]}>{u.name}</Text>
                {u.display ? <Text style={[styles.display, { color: c.textTertiary }]}>{u.display}</Text> : null}
              </View>
            </TouchableHighlight>
          );
        })}
      </View>
    );
  }
}

const styles = StyleSheet.create({
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
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  display: {
    fontSize: 13,
  },
});
