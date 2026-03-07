import React, { Component } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  TouchableHighlight,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import Header from '../components/Header';
import Icon from '../components/Icon';
import SlackText from '../components/SlackText';
import { getUserName, getChannelDisplayName } from '../utils/format';
import { getColors } from '../theme';

export default class ChannelInfoScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      members: [],
      loading: true,
      pins: [],
      pinsLoading: true,
      showPins: false,
    };
  }

  componentDidMount() {
    this.loadMembers();
    this.loadPins();
  }

  async loadMembers() {
    var { slack, channel, usersMap } = this.props;
    try {
      var res = await slack.conversationsMembers(channel.id);
      var activeMembers = (res.members || []).filter(function (id) {
        var u = usersMap[id];
        if (!u) return true;
        if (u.deleted) return false;
        var name = (u.profile && u.profile.display_name) || u.real_name || u.name || '';
        if (name.toLowerCase() === 'deactivateduser') return false;
        return true;
      });
      this.setState({ members: activeMembers, loading: false });
    } catch (err) {
      this.setState({ loading: false });
    }
  }

  async loadPins() {
    var { slack, channel } = this.props;
    try {
      var res = await slack.pinsList(channel.id);
      this.setState({ pins: res.items || [], pinsLoading: false });
    } catch (err) {
      this.setState({ pinsLoading: false });
    }
  }

  getProfileImage(userId) {
    var u = this.props.usersMap[userId];
    if (u && u.profile) {
      return u.profile.image_72 || u.profile.image_48 || null;
    }
    return null;
  }

  renderMember(userId) {
    var { usersMap, onProfile, slack } = this.props;
    var c = getColors();
    var name = getUserName(userId, usersMap);
    var imageUrl = this.getProfileImage(userId);
    if (Platform.OS === 'web' && imageUrl && slack && slack.token) {
      imageUrl = '/slack-file?url=' + encodeURIComponent(imageUrl) + '&token=' + encodeURIComponent(slack.token);
    }

    return (
      <TouchableHighlight
        style={[styles.memberItem, { borderBottomColor: c.border }]}
        underlayColor={c.listUnderlay}
        onPress={function () { onProfile && onProfile(userId); }}
        data-type="list-item"
      >
        <View style={styles.memberInner}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.memberAvatar} />
          ) : (
            <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder, { backgroundColor: c.avatarPlaceholderBg }]}>
              <Text style={styles.memberAvatarText}>{(name[0] || '?').toUpperCase()}</Text>
            </View>
          )}
          <Text style={[styles.memberName, { color: c.textSecondary }]}>{name}</Text>
          <Icon name="chevron-right" size={16} color={c.textPlaceholder} />
        </View>
      </TouchableHighlight>
    );
  }

  renderPin(item) {
    var { usersMap } = this.props;
    var c = getColors();
    var msg = item.message;
    if (!msg) return null;
    var userName = getUserName(msg.user, usersMap);

    return (
      <View style={[styles.pinItem, { borderBottomColor: c.border }]}>
        <Text style={[styles.pinUser, { color: c.textSecondary }]}>{userName}</Text>
        <Text style={[styles.pinText, { color: c.textTertiary }]} numberOfLines={3}>{msg.text}</Text>
      </View>
    );
  }

  render() {
    var { channel, usersMap, currentUserId, onBack, onProfile } = this.props;
    var { members, loading, pins, pinsLoading, showPins } = this.state;
    var self = this;
    var channelName = getChannelDisplayName(channel, usersMap, currentUserId);
    var c = getColors();

    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <Header title="Info" onBack={onBack} />

        <View style={[styles.infoSection, { borderBottomColor: c.border }]}>
          <Text style={[styles.channelName, { color: c.textPrimary }]}>
            {!channel.is_im ? '# ' : ''}{channelName}
          </Text>
          {channel.purpose && channel.purpose.value ? (
            <SlackText text={channel.purpose.value} style={[styles.purpose, { color: c.textSecondary }]} />
          ) : null}
          {channel.topic && channel.topic.value ? (
            <SlackText text={'Topic: ' + channel.topic.value} style={[styles.topic, { color: c.textTertiary }]} />
          ) : null}
          <Text style={[styles.memberCount, { color: c.textPlaceholder }]}>{members.length} members</Text>
        </View>

        <View style={[styles.tabRow, { borderBottomColor: c.border }]}>
          <TouchableOpacity
            style={[styles.tabBtn, !showPins && [styles.tabBtnActive, { borderBottomColor: c.accent }]]}
            onPress={function () { self.setState({ showPins: false }); }}
            data-type="tab-btn"
          >
            <Text style={[styles.tabBtnText, { color: c.textTertiary }, !showPins && { color: c.textPrimary, fontWeight: 'bold' }]}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, showPins && [styles.tabBtnActive, { borderBottomColor: c.accent }]]}
            onPress={function () { self.setState({ showPins: true }); }}
            data-type="tab-btn"
          >
            <Text style={[styles.tabBtnText, { color: c.textTertiary }, showPins && { color: c.textPrimary, fontWeight: 'bold' }]}>
              Pins ({pins.length})
            </Text>
          </TouchableOpacity>
        </View>

        {!showPins ? (
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={c.accent} />
            </View>
          ) : (
            <FlatList
              data={members}
              keyExtractor={function (item) { return item; }}
              renderItem={function (obj) { return self.renderMember(obj.item); }}
            />
          )
        ) : (
          pinsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={c.accent} />
            </View>
          ) : (
            <FlatList
              data={pins}
              keyExtractor={function (item, i) { return '' + i; }}
              renderItem={function (obj) { return self.renderPin(obj.item); }}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={[styles.emptyText, { color: c.textTertiary }]}>No pinned messages</Text>
                </View>
              }
            />
          )
        )}
      </View>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  channelName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  purpose: {
    fontSize: 14,
    marginBottom: 4,
  },
  topic: {
    fontSize: 13,
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 13,
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
  },
  tabBtnText: {
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  memberItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 10,
  },
  memberAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  memberName: {
    flex: 1,
    fontSize: 15,
  },
  pinItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pinUser: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  pinText: {
    fontSize: 14,
  },
});
