import React, { Component } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Header from '../components/Header';
import Icon from '../components/Icon';
import SlackText from '../components/SlackText';
import { getChannelDisplayName } from '../utils/format';

var TABS = [
  { key: 'channels', label: 'Channels' },
  { key: 'dms', label: 'DMs' },
];

export default class ChannelListScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tab: 'channels',
      filter: '',
    };
  }

  getFilteredChannels() {
    var { channels, usersMap, currentUserId } = this.props;
    var { tab, filter } = this.state;
    var lowerFilter = filter.toLowerCase();

    var filtered = channels.filter(function (ch) {
      if (tab === 'channels') {
        return !ch.is_im && !ch.is_mpim;
      } else {
        return ch.is_im || ch.is_mpim;
      }
    });

    if (lowerFilter) {
      filtered = filtered.filter(function (ch) {
        var name = getChannelDisplayName(ch, usersMap, currentUserId);
        return name.toLowerCase().indexOf(lowerFilter) !== -1;
      });
    }

    filtered.sort(function (a, b) {
      var aUnread = (a.unread_count_display || 0) > 0 ? 1 : 0;
      var bUnread = (b.unread_count_display || 0) > 0 ? 1 : 0;
      if (bUnread !== aUnread) return bUnread - aUnread;
      var aTs = parseFloat(a.latest_ts || a.updated || 0);
      var bTs = parseFloat(b.latest_ts || b.updated || 0);
      return bTs - aTs;
    });

    return filtered;
  }

  renderItem(item) {
    var { usersMap, currentUserId, onSelect } = this.props;
    var name = getChannelDisplayName(item, usersMap, currentUserId);
    var unread = item.unread_count_display || 0;
    var prefix = '';
    if (!item.is_im && !item.is_mpim) {
      prefix = item.is_private ? 'lock' : '# ';
    }

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={function () { onSelect(item); }}
      >
        <View style={styles.itemLeft}>
          <View style={styles.itemNameRow}>
            {prefix === 'lock' ? (
              <Icon name="lock" size={14} color={unread > 0 ? '#FFFFFF' : '#ABABAD'} />
            ) : null}
            <Text style={[styles.itemName, unread > 0 && styles.itemNameUnread, prefix === 'lock' && { marginLeft: 4 }]} numberOfLines={1}>
              {prefix === 'lock' ? '' : prefix}{name}
            </Text>
          </View>
          {item.topic && item.topic.value ? (
            <SlackText text={item.topic.value} style={styles.itemTopic} numberOfLines={1} />
          ) : null}
        </View>
        {unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }

  render() {
    var { tab, filter } = this.state;
    var { loading, onSearch, onLogout, teamName } = this.props;
    var self = this;
    var data = this.getFilteredChannels();

    return (
      <View style={styles.container}>
        <Header
          title={teamName || 'BB Slack'}
          rightLabel="Search"
          onRight={onSearch}
        />
        <View style={styles.tabs}>
          {TABS.map(function (t) {
            var active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={function () { self.setState({ tab: t.key }); }}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.filter}
          placeholder="Filter..."
          placeholderTextColor="#696969"
          value={filter}
          onChangeText={function (t) { self.setState({ filter: t }); }}
          autoCorrect={false}
        />
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1264A3" />
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={function (item) { return item.id; }}
            renderItem={function (obj) { return self.renderItem(obj.item); }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No channels found</Text>
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
    backgroundColor: '#19171D',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#1264A3',
  },
  tabText: {
    color: '#ABABAD',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  logoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: '#E01E5A',
    fontSize: 12,
  },
  filter: {
    backgroundColor: '#222529',
    color: '#D1D2D3',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#565856',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  itemLeft: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    color: '#ABABAD',
    fontSize: 15,
  },
  itemNameUnread: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  itemTopic: {
    color: '#696969',
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#E01E5A',
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
  emptyText: {
    color: '#ABABAD',
    fontSize: 14,
  },
});
