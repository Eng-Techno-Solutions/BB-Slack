import React, { Component } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  TouchableHighlight,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import Header from '../components/Header';
import Icon from '../components/Icon';
import SlackText from '../components/SlackText';
import { getChannelDisplayName } from '../utils/format';
import { getColors, getMode } from '../theme';

var TABS = [
  { key: 'channels', label: 'Channels', icon: 'hash' },
  { key: 'dms', label: 'DMs', icon: 'message-square' },
];

export default class ChannelListScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tab: 'channels',
      filter: '',
    };
  }

  isBot(ch) {
    var { usersMap } = this.props;
    if (!ch.is_im) return false;
    var u = usersMap[ch.user];
    return u && (u.is_bot || u.id === 'USLACKBOT');
  }

  getFilteredChannels() {
    var { channels, usersMap, currentUserId } = this.props;
    var { tab, filter } = this.state;
    var lowerFilter = filter.toLowerCase();
    var self = this;

    var filtered = channels.filter(function (ch) {
      if (tab === 'channels') {
        return !ch.is_im && !ch.is_mpim;
      } else {
        if (!ch.is_im && !ch.is_mpim) return false;
        if (ch.is_im) {
          var u = usersMap[ch.user];
          if (u && u.deleted) return false;
        }
        return true;
      }
    });

    if (lowerFilter) {
      filtered = filtered.filter(function (ch) {
        var name = getChannelDisplayName(ch, usersMap, currentUserId);
        return name.toLowerCase().indexOf(lowerFilter) !== -1;
      });
    }

    var sortFn = function (a, b) {
      var aUnread = (a.unread_count_display || 0) > 0 ? 1 : 0;
      var bUnread = (b.unread_count_display || 0) > 0 ? 1 : 0;
      if (bUnread !== aUnread) return bUnread - aUnread;
      var aName = getChannelDisplayName(a, usersMap, currentUserId).toLowerCase();
      var bName = getChannelDisplayName(b, usersMap, currentUserId).toLowerCase();
      if (aName < bName) return -1;
      if (aName > bName) return 1;
      return 0;
    };

    if (tab === 'dms') {
      var people = [];
      var apps = [];
      for (var i = 0; i < filtered.length; i++) {
        if (self.isBot(filtered[i])) {
          apps.push(filtered[i]);
        } else {
          people.push(filtered[i]);
        }
      }
      people.sort(sortFn);
      apps.sort(sortFn);
      var result = people;
      if (apps.length > 0) {
        result = result.concat([{ _sectionHeader: 'Apps' }], apps);
      }
      return result;
    }

    filtered.sort(sortFn);
    return filtered;
  }

  getProfileImage(userId) {
    var { usersMap, slack } = this.props;
    var u = usersMap[userId];
    if (!u || !u.profile) return null;
    var url = u.profile.image_72 || u.profile.image_48 || null;
    if (Platform.OS === 'web' && url && slack && slack.token) {
      url = '/slack-file?url=' + encodeURIComponent(url) + '&token=' + encodeURIComponent(slack.token);
    }
    return url;
  }

  renderItem(item) {
    var { usersMap, currentUserId, onSelect } = this.props;
    var c = getColors();
    var name = getChannelDisplayName(item, usersMap, currentUserId);
    var unread = item.unread_count_display || 0;
    var prefix = '';
    var isDm = item.is_im || item.is_mpim;
    if (!isDm) {
      prefix = item.is_private ? 'lock' : '# ';
    }
    var imageUrl = isDm && item.is_im ? this.getProfileImage(item.user) : null;

    return (
      <TouchableHighlight
        style={styles.item}
        underlayColor={c.listUnderlay}
        onPress={function () { onSelect(item); }}
        data-type="list-item"
      >
        <View style={styles.itemInner}>
          {isDm ? (
            imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.itemAvatar} />
            ) : (
              <View style={[styles.itemAvatar, styles.itemAvatarPlaceholder, { backgroundColor: c.avatarPlaceholderBg }]}>
                <Text style={styles.itemAvatarText}>{(name[0] || '?').toUpperCase()}</Text>
              </View>
            )
          ) : (
            <View style={[styles.itemAvatar, { backgroundColor: c.channelAvatarBg }]}>
              {prefix === 'lock' ? (
                <Icon name="lock" size={14} color={c.textTertiary} />
              ) : (
                <Text style={[styles.channelAvatarHash, { color: c.textTertiary }]}>#</Text>
              )}
            </View>
          )}
          <View style={styles.itemLeft}>
            <View style={styles.itemNameRow}>
              <Text style={[styles.itemName, { color: c.textTertiary }, unread > 0 && { color: c.textPrimary, fontWeight: 'bold' }]} numberOfLines={1}>
                {name}
              </Text>
            </View>
            {item.topic && item.topic.value ? (
              <SlackText text={item.topic.value} style={[styles.itemTopic, { color: c.textPlaceholder }]} numberOfLines={1} />
            ) : null}
          </View>
          {unread > 0 ? (
            <View style={[styles.badge, { backgroundColor: c.badgeBg }]}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
      </TouchableHighlight>
    );
  }

  render() {
    var { tab, filter } = this.state;
    var { loading, onSearch, onLogout, onToggleTheme, teamName, teamIcon } = this.props;
    var self = this;
    var data = this.getFilteredChannels();
    var c = getColors();
    var isDark = getMode() === 'dark';

    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <View style={[styles.header, { backgroundColor: c.bgHeader, borderBottomColor: c.headerBorder }]}>
          <View style={styles.headerLeft}>
            {teamIcon ? (
              <Image source={{ uri: teamIcon }} style={styles.teamIcon} />
            ) : (
              <View style={[styles.teamIconPlaceholder, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.teamIconText}>{(teamName || 'B').charAt(0)}</Text>
              </View>
            )}
            <Text style={[styles.headerTitle, { color: c.headerText }]} numberOfLines={1}>{teamName || 'BB Slack'}</Text>
          </View>
          <TouchableOpacity style={styles.themeBtn} onPress={onToggleTheme} data-type="icon-btn">
            <Icon name={isDark ? 'sun' : 'moon'} size={18} color={c.headerIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchBtn} onPress={onSearch} data-type="icon-btn">
            <Icon name="search" size={18} color={c.headerIcon} />
          </TouchableOpacity>
        </View>
        <View style={[styles.tabs, { backgroundColor: c.bgHeader, borderBottomColor: c.headerBorder }]}>
          {TABS.map(function (t) {
            var active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, active && [styles.tabActive, { borderBottomColor: c.tabTextActive }]]}
                onPress={function () { self.setState({ tab: t.key }); }}
                data-type="tab-btn"
              >
                <View style={styles.tabContent}>
                <Icon name={t.icon} size={15} color={active ? c.tabTextActive : c.tabText} />
                <Text style={[styles.tabText, { color: c.tabText }, active && { color: c.tabTextActive, fontWeight: 'bold' }]}>{t.label}</Text>
              </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} data-type="icon-btn">
            <Icon name="log-out" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.filter, { backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: c.borderInput }]}
          placeholder="Filter..."
          placeholderTextColor={c.textPlaceholder}
          value={filter}
          onChangeText={function (t) { self.setState({ filter: t }); }}
          autoCorrect={false}
        />
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={c.accent} />
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={function (item) { return item._sectionHeader || item.id; }}
            renderItem={function (obj) {
              if (obj.item._sectionHeader) {
                return (
                  <View style={[styles.sectionHeader, { borderBottomColor: c.border }]}>
                    <Text style={[styles.sectionHeaderText, { color: c.textPlaceholder }]}>{obj.item._sectionHeader}</Text>
                  </View>
                );
              }
              return self.renderItem(obj.item);
            }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={[styles.emptyText, { color: c.textTertiary }]}>No channels found</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: 10,
  },
  teamIconPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  teamIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  themeBtn: {
    padding: 8,
  },
  searchBtn: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    marginLeft: 6,
  },
  logoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filter: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAvatarPlaceholder: {},
  itemAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  channelAvatarHash: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemLeft: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 15,
  },
  itemTopic: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 16,
    borderBottomWidth: 1,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 14,
  },
});
