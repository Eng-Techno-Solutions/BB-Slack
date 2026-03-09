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
import { addKeyEventListener, removeKeyEventListener } from '../utils/keyEvents';

const TABS = [
  { key: 'channels', label: 'Channels', icon: 'hash' },
  { key: 'dms', label: 'DMs', icon: 'message-square' },
];

export default class ChannelListScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tab: 'channels',
      filter: '',
      focusIndex: -1,
      focusZone: 'list', // 'list' or 'header'
      headerIndex: 0, // 0=search, 1=settings, 2=channels tab, 3=dms tab, 4=logout
      teamIconError: false,
    };
    this._keySub = null;
    this._data = [];
    const self = this;
    this._keyExtractor = function (item) { return item._sectionHeader || item.id; };
    this._renderItem = function (obj) { return self._renderListItem(obj); };
    this._listRef = function (r) { self._list = r; };
  }

  componentDidMount() {
    const self = this;
    this._keySub = addKeyEventListener(function (e) {
      self.handleKeyEvent(e);
    });
  }

  componentWillUnmount() {
    removeKeyEventListener(this._keySub);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.teamIcon !== this.props.teamIcon) {
      this.setState({ teamIconError: false });
    }
  }

  handleKeyEvent(e) {
    const action = e.action;
    const data = this._data;
    const self = this;

    if (this.state.focusZone === 'header') {
      const hi = this.state.headerIndex;
      if (action === 'down') {
        if (hi < 4) {
          this.setState({ headerIndex: hi + 1 });
        } else {
          // Move from header to list
          let first = 0;
          while (first < data.length && data[first]._sectionHeader) first++;
          this.setState({ focusZone: 'list', focusIndex: first < data.length ? first : -1 });
        }
      } else if (action === 'up') {
        if (hi > 0) {
          this.setState({ headerIndex: hi - 1 });
        }
      } else if (action === 'select') {
        if (hi === 0) self.props.onSearch();
        else if (hi === 1) self.props.onSettings();
        else if (hi === 2) self.setState({ tab: 'channels', focusZone: 'list', focusIndex: -1 });
        else if (hi === 3) self.setState({ tab: 'dms', focusZone: 'list', focusIndex: -1 });
        else if (hi === 4) self.props.onLogout();
      } else if (action === 'back') {
        this.setState({ focusZone: 'list', focusIndex: -1 });
      }
    } else {
      // List zone
      const idx = this.state.focusIndex;
      if (action === 'down') {
        let next = idx + 1;
        while (next < data.length && data[next]._sectionHeader) next++;
        if (next < data.length) {
          this.setState({ focusIndex: next });
          if (this._list) this._list.scrollToIndex({ index: next, viewOffset: 80, animated: true });
        }
      } else if (action === 'up') {
        let prev = idx - 1;
        while (prev >= 0 && data[prev]._sectionHeader) prev--;
        if (prev >= 0) {
          this.setState({ focusIndex: prev });
          if (this._list) this._list.scrollToIndex({ index: prev, viewOffset: 80, animated: true });
        } else {
          // Enter header zone at bottom (logout)
          this.setState({ focusZone: 'header', headerIndex: 4, focusIndex: -1 });
        }
      } else if (action === 'select') {
        if (idx >= 0 && idx < data.length && !data[idx]._sectionHeader) {
          this.props.onSelect(data[idx]);
        }
      } else if (action === 'right') {
        // Quick tab switch
        const newTab = this.state.tab === 'channels' ? 'dms' : 'channels';
        this.setState({ tab: newTab, focusIndex: -1 });
      }
    }
  }

  isBot(ch) {
    const { usersMap } = this.props;
    if (!ch.is_im) return false;
    const u = usersMap[ch.user];
    return u && (u.is_bot || u.id === 'USLACKBOT');
  }

  getUnreadCounts() {
    const { channels } = this.props;
    let channelsUnread = 0;
    let dmsUnread = 0;
    for (let i = 0; i < channels.length; i++) {
      const ch = channels[i];
      const count = ch.unread_count_display || 0;
      if (count > 0) {
        if (ch.is_im || ch.is_mpim) {
          dmsUnread += count;
        } else {
          channelsUnread += count;
        }
      }
    }
    return { channelsUnread: channelsUnread, dmsUnread: dmsUnread, total: channelsUnread + dmsUnread };
  }

  getFilteredChannels() {
    const { channels, usersMap, currentUserId } = this.props;
    const { tab, filter } = this.state;
    const lowerFilter = filter.toLowerCase();
    const self = this;

    let filtered = channels.filter(function (ch) {
      if (tab === 'channels') {
        return !ch.is_im && !ch.is_mpim;
      } else {
        if (!ch.is_im && !ch.is_mpim) return false;
        if (ch.is_im) {
          const u = usersMap[ch.user];
          if (u && u.deleted) return false;
        }
        return true;
      }
    });

    if (lowerFilter) {
      filtered = filtered.filter(function (ch) {
        const name = getChannelDisplayName(ch, usersMap, currentUserId);
        return name.toLowerCase().indexOf(lowerFilter) !== -1;
      });
    }

    const sortFn = function (a, b) {
      const aUnread = (a.unread_count_display || 0) > 0 ? 1 : 0;
      const bUnread = (b.unread_count_display || 0) > 0 ? 1 : 0;
      if (bUnread !== aUnread) return bUnread - aUnread;
      const aName = getChannelDisplayName(a, usersMap, currentUserId).toLowerCase();
      const bName = getChannelDisplayName(b, usersMap, currentUserId).toLowerCase();
      if (aName < bName) return -1;
      if (aName > bName) return 1;
      return 0;
    };

    if (tab === 'dms') {
      const people = [];
      const apps = [];
      for (let i = 0; i < filtered.length; i++) {
        if (self.isBot(filtered[i])) {
          apps.push(filtered[i]);
        } else {
          people.push(filtered[i]);
        }
      }
      people.sort(sortFn);
      apps.sort(sortFn);
      let result = people;
      if (apps.length > 0) {
        result = result.concat([{ _sectionHeader: 'Apps' }], apps);
      }
      return result;
    }

    filtered.sort(sortFn);
    return filtered;
  }

  getProfileImage(userId) {
    const { usersMap, slack } = this.props;
    const u = usersMap[userId];
    if (!u || !u.profile) return null;
    let url = u.profile.image_72 || u.profile.image_48 || null;
    if (Platform.OS === 'web' && url && slack && slack.token) {
      url = '/slack-file?url=' + encodeURIComponent(url) + '&token=' + encodeURIComponent(slack.token);
    }
    return url;
  }

  renderItem(item, isFocused) {
    const { usersMap, currentUserId, onSelect } = this.props;
    const c = getColors();
    const name = getChannelDisplayName(item, usersMap, currentUserId);
    const unread = item.unread_count_display || 0;
    let prefix = '';
    const isDm = item.is_im || item.is_mpim;
    if (!isDm) {
      prefix = item.is_private ? 'lock' : '# ';
    }
    const imageUrl = isDm && item.is_im ? this.getProfileImage(item.user) : null;

    return (
      <TouchableHighlight
        style={[styles.item, isFocused && { backgroundColor: c.listUnderlay }]}
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

  _renderListItem(obj) {
    const c = getColors();
    if (obj.item._sectionHeader) {
      return (
        <View style={[styles.sectionHeader, { borderBottomColor: c.border }]}>
          <Text style={[styles.sectionHeaderText, { color: c.textPlaceholder }]}>{obj.item._sectionHeader}</Text>
        </View>
      );
    }
    return this.renderItem(obj.item, obj.index === this.state.focusIndex);
  }

  render() {
    const { tab, filter, focusZone, headerIndex } = this.state;
    const { loading, onSearch, onLogout, onToggleTheme, onSettings, teamName, teamIcon } = this.props;
    const self = this;
    const data = this.getFilteredChannels();
    this._data = data;
    const c = getColors();
    const isDark = getMode() === 'dark';
    const unreadCounts = this.getUnreadCounts();
    const hf = focusZone === 'header'; // header focused

    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <View style={[styles.header, { backgroundColor: c.bgHeader, borderBottomColor: c.headerBorder }]}>
          <View style={styles.headerLeft}>
            {teamIcon && !this.state.teamIconError ? (
              <Image
                source={{ uri: teamIcon }}
                style={styles.teamIcon}
                onError={function () { self.setState({ teamIconError: true }); }}
              />
            ) : (
              <View style={[styles.teamIconPlaceholder, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.teamIconText}>{(teamName || 'B').charAt(0)}</Text>
              </View>
            )}
            <Text style={[styles.headerTitle, { color: c.headerText }]} numberOfLines={1}>{teamName || 'BB Slack'}</Text>
          </View>
          {unreadCounts.total > 0 ? (
            <View style={[styles.headerBadge, { backgroundColor: c.badgeBg }]}>
              <Text style={styles.badgeText}>{unreadCounts.total > 99 ? '99+' : unreadCounts.total}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={[styles.searchBtn, hf && headerIndex === 0 && styles.headerFocused]} onPress={onSearch} data-type="icon-btn">
            <Icon name="search" size={18} color={c.headerIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.searchBtn, hf && headerIndex === 1 && styles.headerFocused]} onPress={onSettings} data-type="icon-btn">
            <Icon name="settings" size={18} color={c.headerIcon} />
          </TouchableOpacity>
        </View>
        <View style={[styles.tabs, { backgroundColor: c.bgHeader, borderBottomColor: c.headerBorder }]}>
          {TABS.map(function (t) {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, active && [styles.tabActive, { borderBottomColor: c.tabTextActive }], hf && headerIndex === (t.key === 'channels' ? 2 : 3) && styles.headerFocused]}
                onPress={function () { self.setState({ tab: t.key }); }}
                data-type="tab-btn"
              >
                <View style={styles.tabContent}>
                  <Icon name={t.icon} size={15} color={active ? c.tabTextActive : c.tabText} />
                  <Text style={[styles.tabText, { color: c.tabText }, active && { color: c.tabTextActive, fontWeight: 'bold' }]}>{t.label}</Text>
                  {(t.key === 'channels' ? unreadCounts.channelsUnread : unreadCounts.dmsUnread) > 0 ? (
                    <View style={[styles.tabBadge, { backgroundColor: c.badgeBg }]}>
                      <Text style={styles.tabBadgeText}>
                        {(t.key === 'channels' ? unreadCounts.channelsUnread : unreadCounts.dmsUnread) > 99 ? '99+' : (t.key === 'channels' ? unreadCounts.channelsUnread : unreadCounts.dmsUnread)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={[styles.logoutBtn, hf && headerIndex === 4 && styles.headerFocused]} onPress={onLogout} data-type="icon-btn">
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
            ref={this._listRef}
            data={data}
            keyExtractor={this._keyExtractor}
            renderItem={this._renderItem}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={9}
            initialNumToRender={15}
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

const styles = StyleSheet.create({
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
  headerBadge: {
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    marginRight: 4,
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
  tabBadge: {
    borderRadius: 9,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignItems: 'center',
    marginLeft: 6,
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  headerFocused: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
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
