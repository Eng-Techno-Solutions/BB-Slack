import React, { Component } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import Header from '../components/Header';
import Icon from '../components/Icon';
import SlackText from '../components/SlackText';
import { getUserName, getChannelDisplayName } from '../utils/format';

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
    var { slack, channel } = this.props;
    try {
      var res = await slack.conversationsMembers(channel.id);
      this.setState({ members: res.members || [], loading: false });
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

  renderMember(userId) {
    var { usersMap, onProfile } = this.props;
    var name = getUserName(userId, usersMap);

    return (
      <TouchableOpacity
        style={styles.memberItem}
        onPress={function () { onProfile && onProfile(userId); }}
      >
        <Text style={styles.memberName}>{name}</Text>
        <Icon name="chevron-right" size={16} color="#696969" />
      </TouchableOpacity>
    );
  }

  renderPin(item) {
    var { usersMap } = this.props;
    var msg = item.message;
    if (!msg) return null;
    var userName = getUserName(msg.user, usersMap);

    return (
      <View style={styles.pinItem}>
        <Text style={styles.pinUser}>{userName}</Text>
        <Text style={styles.pinText} numberOfLines={3}>{msg.text}</Text>
      </View>
    );
  }

  render() {
    var { channel, usersMap, currentUserId, onBack, onProfile } = this.props;
    var { members, loading, pins, pinsLoading, showPins } = this.state;
    var self = this;
    var channelName = getChannelDisplayName(channel, usersMap, currentUserId);

    return (
      <View style={styles.container}>
        <Header title="Info" onBack={onBack} />

        <View style={styles.infoSection}>
          <Text style={styles.channelName}>
            {!channel.is_im ? '# ' : ''}{channelName}
          </Text>
          {channel.purpose && channel.purpose.value ? (
            <SlackText text={channel.purpose.value} style={styles.purpose} />
          ) : null}
          {channel.topic && channel.topic.value ? (
            <SlackText text={'Topic: ' + channel.topic.value} style={styles.topic} />
          ) : null}
          <Text style={styles.memberCount}>{members.length} members</Text>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, !showPins && styles.tabBtnActive]}
            onPress={function () { self.setState({ showPins: false }); }}
          >
            <Text style={[styles.tabBtnText, !showPins && styles.tabBtnTextActive]}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, showPins && styles.tabBtnActive]}
            onPress={function () { self.setState({ showPins: true }); }}
          >
            <Text style={[styles.tabBtnText, showPins && styles.tabBtnTextActive]}>
              Pins ({pins.length})
            </Text>
          </TouchableOpacity>
        </View>

        {!showPins ? (
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#1264A3" />
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
              <ActivityIndicator size="large" color="#1264A3" />
            </View>
          ) : (
            <FlatList
              data={pins}
              keyExtractor={function (item, i) { return '' + i; }}
              renderItem={function (obj) { return self.renderPin(obj.item); }}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>No pinned messages</Text>
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
    backgroundColor: '#1A1D21',
  },
  infoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
  },
  channelName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  purpose: {
    color: '#D1D2D3',
    fontSize: 14,
    marginBottom: 4,
  },
  topic: {
    color: '#ABABAD',
    fontSize: 13,
    marginBottom: 4,
  },
  memberCount: {
    color: '#696969',
    fontSize: 13,
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#1264A3',
  },
  tabBtnText: {
    color: '#ABABAD',
    fontSize: 14,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
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
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
  },
  memberName: {
    flex: 1,
    color: '#D1D2D3',
    fontSize: 15,
  },
  pinItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
  },
  pinUser: {
    color: '#D1D2D3',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  pinText: {
    color: '#ABABAD',
    fontSize: 14,
  },
});
