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
import Icon from '../components/Icon';
import MessageItem from '../components/MessageItem';
import EmojiPicker from '../components/EmojiPicker';
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
      emojiPickerMode: null,
      actionMessage: null,
      reactionTarget: null,
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

  async addReaction(message, name) {
    var { slack, channel } = this.props;
    try {
      await slack.reactionsAdd(channel.id, name, message.ts);
      this.setState({ reactionTarget: null });
      this.pollReplies();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async removeReaction(message, name) {
    var { slack, channel } = this.props;
    try {
      await slack.reactionsRemove(channel.id, name, message.ts);
      this.pollReplies();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async toggleReaction(message, name, alreadyReacted) {
    if (alreadyReacted) {
      await this.removeReaction(message, name);
    } else {
      await this.addReaction(message, name);
    }
  }

  onEmojiSelect(name, emoji) {
    var mode = this.state.emojiPickerMode;
    if (mode === 'reaction') {
      this.addReaction(this.state.reactionTarget, name);
    } else if (mode === 'input') {
      this.setState(function (prev) {
        return { inputText: prev.inputText + emoji };
      });
    }
    this.setState({ emojiPickerMode: null });
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
                  onLongPress={function (m) {
                    self.setState({ reactionTarget: m, emojiPickerMode: 'reaction' });
                  }}
                  onReactionPress={function (m, name, reacted) { self.toggleReaction(m, name, reacted); }}
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
          <TouchableOpacity
            style={styles.emojiBtn}
            onPress={function () { self.setState({ emojiPickerMode: 'input' }); }}
          >
            <Icon name="smile" size={22} color="#ABABAD" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Reply..."
            placeholderTextColor="#696969"
            value={inputText}
            onChangeText={function (t) { self.setState({ inputText: t }); }}
            onSubmitEditing={function () { self.sendReply(); }}
            returnKeyType="send"
            autoFocus={true}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendDisabled]}
            onPress={function () { self.sendReply(); }}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Icon name="send" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        <EmojiPicker
          visible={!!self.state.emojiPickerMode}
          onSelect={function (name, emoji) { self.onEmojiSelect(name, emoji); }}
          onClose={function () { self.setState({ emojiPickerMode: null }); }}
        />
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
  emojiBtn: {
    paddingHorizontal: 6,
    paddingVertical: 9,
    marginRight: 4,
  },
  sendText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
