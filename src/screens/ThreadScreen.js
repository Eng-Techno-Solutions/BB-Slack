import React, { Component } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import Header from '../components/Header';
import MessageItem from '../components/MessageItem';
import { getUserName } from '../utils/format';

export default class ThreadScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      replies: [],
      loading: true,
      inputText: '',
      sending: false,
      pollTimer: null,
    };
  }

  componentDidMount() {
    this.loadReplies();
    this.startPolling();
  }

  componentWillUnmount() {
    this.stopPolling();
  }

  startPolling() {
    var self = this;
    var timer = setInterval(function () {
      self.pollReplies();
    }, 5000);
    this.setState({ pollTimer: timer });
  }

  stopPolling() {
    if (this.state.pollTimer) {
      clearInterval(this.state.pollTimer);
    }
  }

  async loadReplies() {
    var { slack, channel, parentMessage } = this.props;
    try {
      var res = await slack.conversationsReplies(channel.id, parentMessage.ts);
      this.setState({ replies: res.messages || [], loading: false });
    } catch (err) {
      this.setState({ loading: false });
      Alert.alert('Error', err.message);
    }
  }

  async pollReplies() {
    var { slack, channel, parentMessage } = this.props;
    var { loading } = this.state;
    if (loading) return;
    try {
      var res = await slack.conversationsReplies(channel.id, parentMessage.ts);
      this.setState({ replies: res.messages || [] });
    } catch (err) {
      // Silent
    }
  }

  async sendReply() {
    var { slack, channel, parentMessage } = this.props;
    var { inputText } = this.state;
    var text = inputText.trim();
    if (!text) return;

    this.setState({ sending: true });
    try {
      await slack.chatPostMessage(channel.id, text, parentMessage.ts);
      this.setState({ inputText: '', sending: false });
      this.loadReplies();
    } catch (err) {
      this.setState({ sending: false });
      Alert.alert('Error', err.message);
    }
  }

  render() {
    var { slack, usersMap, currentUserId, onBack, parentMessage } = this.props;
    var { replies, loading, inputText, sending } = this.state;
    var self = this;
    var parentUser = getUserName(parentMessage.user, usersMap);

    return (
      <View style={styles.container}>
        <Header
          title="Thread"
          subtitle={'Started by ' + parentUser}
          onBack={onBack}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1264A3" />
          </View>
        ) : (
          <FlatList
            ref={function (r) { self._list = r; }}
            data={replies}
            keyExtractor={function (item) { return item.ts; }}
            renderItem={function (obj) {
              return (
                <MessageItem
                  message={obj.item}
                  usersMap={usersMap}
                  currentUserId={currentUserId}
                  token={slack.token}
                />
              );
            }}
            onContentSizeChange={function () {
              if (self._list && replies.length > 0) {
                self._list.scrollToEnd({ animated: false });
              }
            }}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Reply..."
            placeholderTextColor="#696969"
            value={inputText}
            onChangeText={function (t) { self.setState({ inputText: t }); }}
            onSubmitEditing={function () { self.sendReply(); }}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendDisabled]}
            onPress={function () { self.sendReply(); }}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1D21',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#383838',
    backgroundColor: '#1A1D21',
  },
  input: {
    flex: 1,
    backgroundColor: '#222529',
    color: '#D1D2D3',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#565856',
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#007A5A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 4,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
