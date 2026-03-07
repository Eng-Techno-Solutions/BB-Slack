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
import ActionSheet from '../components/ActionSheet';
import ImageViewer from '../components/ImageViewer';
import AudioPlayer from '../components/AudioPlayer';
import { getChannelDisplayName } from '../utils/format';

export default class ChatScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      loading: true,
      loadingMore: false,
      inputText: '',
      sending: false,
      cursor: null,
      hasMore: true,
      actionMessage: null,
      editingMessage: null,
      pollTimer: null,
      viewerImage: null,
      viewerAudio: null,
    };
  }

  componentDidMount() {
    this.loadMessages();
    this.startPolling();
  }

  componentWillUnmount() {
    this.stopPolling();
  }

  startPolling() {
    var self = this;
    var timer = setInterval(function () {
      self.pollNewMessages();
    }, 5000);
    this.setState({ pollTimer: timer });
  }

  stopPolling() {
    if (this.state.pollTimer) {
      clearInterval(this.state.pollTimer);
    }
  }

  async loadMessages() {
    var { slack, channel } = this.props;
    try {
      var res = await slack.conversationsHistory(channel.id, null, 30);
      var msgs = (res.messages || []).slice().reverse();
      var cursor = res.response_metadata && res.response_metadata.next_cursor;
      this.setState({
        messages: msgs,
        loading: false,
        cursor: cursor,
        hasMore: !!cursor,
      });
      this.markRead(msgs);
    } catch (err) {
      this.setState({ loading: false });
      Alert.alert('Error', err.message);
    }
  }

  async pollNewMessages() {
    var { slack, channel } = this.props;
    var { messages, loading } = this.state;
    if (loading) return;
    try {
      var res = await slack.conversationsHistory(channel.id, null, 10);
      var newMsgs = res.messages || [];
      if (newMsgs.length === 0) return;

      var lastTs = messages.length > 0 ? messages[messages.length - 1].ts : '0';
      var fresh = newMsgs.filter(function (m) {
        return parseFloat(m.ts) > parseFloat(lastTs);
      }).reverse();

      if (fresh.length > 0) {
        this.setState(function (prev) {
          return { messages: prev.messages.concat(fresh) };
        });
        this.markRead(fresh);
      }
    } catch (err) {
      // Silent fail on poll
    }
  }

  async loadMore() {
    var { slack, channel } = this.props;
    var { cursor, loadingMore, hasMore } = this.state;
    if (loadingMore || !hasMore || !cursor) return;

    this.setState({ loadingMore: true });
    try {
      var res = await slack.conversationsHistory(channel.id, cursor, 30);
      var older = (res.messages || []).slice().reverse();
      var nextCursor = res.response_metadata && res.response_metadata.next_cursor;
      this.setState(function (prev) {
        return {
          messages: older.concat(prev.messages),
          loadingMore: false,
          cursor: nextCursor,
          hasMore: !!nextCursor,
        };
      });
    } catch (err) {
      this.setState({ loadingMore: false });
    }
  }

  markRead(msgs) {
    var { slack, channel } = this.props;
    if (msgs.length > 0) {
      var lastTs = msgs[msgs.length - 1].ts;
      slack.conversationsMark(channel.id, lastTs).catch(function () {});
    }
  }

  async sendMessage() {
    var { slack, channel } = this.props;
    var { inputText, editingMessage } = this.state;
    var text = inputText.trim();
    if (!text) return;

    this.setState({ sending: true });
    try {
      if (editingMessage) {
        await slack.chatUpdate(channel.id, editingMessage.ts, text);
        this.setState(function (prev) {
          var updated = prev.messages.map(function (m) {
            if (m.ts === editingMessage.ts) {
              return Object.assign({}, m, { text: text, edited: { user: '', ts: '' } });
            }
            return m;
          });
          return { messages: updated, inputText: '', sending: false, editingMessage: null };
        });
      } else {
        var res = await slack.chatPostMessage(channel.id, text);
        this.setState({ inputText: '', sending: false });
      }
    } catch (err) {
      this.setState({ sending: false });
      Alert.alert('Error', err.message);
    }
  }

  async deleteMessage(message) {
    var { slack, channel } = this.props;
    try {
      await slack.chatDelete(channel.id, message.ts);
      this.setState(function (prev) {
        return {
          messages: prev.messages.filter(function (m) { return m.ts !== message.ts; }),
          actionMessage: null,
        };
      });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async addReaction(message, name) {
    var { slack, channel } = this.props;
    try {
      await slack.reactionsAdd(channel.id, name, message.ts);
      this.setState({ actionMessage: null });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  onMessageLongPress(message) {
    this.setState({ actionMessage: message });
  }

  getActions() {
    var { currentUserId } = this.props;
    var { actionMessage } = this.state;
    if (!actionMessage) return [];

    var self = this;
    var isOwn = actionMessage.user === currentUserId;
    var actions = [];

    actions.push({
      label: 'Reply in Thread',
      onPress: function () {
        self.setState({ actionMessage: null });
        self.props.onThread(actionMessage);
      },
    });

    actions.push({
      label: 'React +1',
      onPress: function () { self.addReaction(actionMessage, '+1'); },
    });
    actions.push({
      label: 'React heart',
      onPress: function () { self.addReaction(actionMessage, 'heart'); },
    });
    actions.push({
      label: 'React eyes',
      onPress: function () { self.addReaction(actionMessage, 'eyes'); },
    });
    actions.push({
      label: 'React check',
      onPress: function () { self.addReaction(actionMessage, 'white_check_mark'); },
    });

    if (isOwn) {
      actions.push({
        label: 'Edit Message',
        onPress: function () {
          self.setState({
            editingMessage: actionMessage,
            inputText: actionMessage.text,
            actionMessage: null,
          });
        },
      });
      actions.push({
        label: 'Delete Message',
        destructive: true,
        onPress: function () {
          Alert.alert('Delete', 'Delete this message?', [
            { text: 'Cancel', style: 'cancel', onPress: function () { self.setState({ actionMessage: null }); } },
            { text: 'Delete', style: 'destructive', onPress: function () { self.deleteMessage(actionMessage); } },
          ]);
        },
      });
    }

    return actions;
  }

  render() {
    var { slack, channel, usersMap, currentUserId, onBack, onThread, onMembers } = this.props;
    var { messages, loading, loadingMore, inputText, sending, editingMessage, actionMessage, viewerImage, viewerAudio } = this.state;
    var self = this;
    var channelName = getChannelDisplayName(channel, usersMap, currentUserId);

    return (
      <View style={styles.container}>
        <Header
          title={(!channel.is_im ? '# ' : '') + channelName}
          subtitle={channel.topic && channel.topic.value ? channel.topic.value : null}
          onBack={onBack}
          rightLabel="Info"
          onRight={onMembers}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1264A3" />
          </View>
        ) : (
          <FlatList
            ref={function (r) { self._list = r; }}
            data={messages}
            keyExtractor={function (item) { return item.ts; }}
            renderItem={function (obj) {
              return (
                <MessageItem
                  message={obj.item}
                  usersMap={usersMap}
                  currentUserId={currentUserId}
                  token={slack.token}
                  onLongPress={function (m) { self.onMessageLongPress(m); }}
                  onThreadPress={onThread}
                  onImagePress={function (img) { self.setState({ viewerImage: img }); }}
                  onAudioPress={function (audio) { self.setState({ viewerAudio: audio }); }}
                />
              );
            }}
            onEndReached={function () { /* no-op, load more at top */ }}
            ListHeaderComponent={
              loadingMore ? (
                <View style={styles.loadMore}>
                  <ActivityIndicator size="small" color="#1264A3" />
                </View>
              ) : self.state.hasMore ? (
                <TouchableOpacity style={styles.loadMore} onPress={function () { self.loadMore(); }}>
                  <Text style={styles.loadMoreText}>Load older messages</Text>
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No messages yet</Text>
              </View>
            }
            onContentSizeChange={function () {
              if (self._list && messages.length > 0 && !loadingMore) {
                self._list.scrollToEnd({ animated: false });
              }
            }}
          />
        )}

        <View style={styles.inputBar}>
          {editingMessage ? (
            <View style={styles.editBanner}>
              <Text style={styles.editBannerText}>Editing message</Text>
              <TouchableOpacity onPress={function () { self.setState({ editingMessage: null, inputText: '' }); }}>
                <Text style={styles.editCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              ref={function (r) { self._inputRef = r; }}
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor="#696969"
              value={inputText}
              onChangeText={function (t) { self.setState({ inputText: t }); }}
              onSubmitEditing={function () { self.sendMessage(); }}
              returnKeyType="send"
              multiline={false}
              autoFocus={true}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendDisabled]}
              onPress={function () { self.sendMessage(); }}
              disabled={!inputText.trim() || sending}

            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Icon name="send" size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ActionSheet
          visible={!!actionMessage}
          actions={this.getActions()}
          onClose={function () { self.setState({ actionMessage: null }); }}
        />

        <ImageViewer
          visible={!!viewerImage}
          source={viewerImage ? viewerImage.uri : ''}
          fileName={viewerImage ? viewerImage.name : ''}
          onClose={function () { self.setState({ viewerImage: null }); }}
        />

        <AudioPlayer
          visible={!!viewerAudio}
          source={viewerAudio ? viewerAudio.uri : ''}
          fileName={viewerAudio ? viewerAudio.name : ''}
          duration={viewerAudio ? viewerAudio.duration : 0}
          onClose={function () { self.setState({ viewerAudio: null }); }}
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
    padding: 40,
  },
  emptyText: {
    color: '#ABABAD',
    fontSize: 14,
  },
  loadMore: {
    padding: 12,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#1D9BD1',
    fontSize: 13,
  },
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: '#383838',
    backgroundColor: '#1A1D21',
  },
  editBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#222529',
  },
  editBannerText: {
    color: '#1D9BD1',
    fontSize: 13,
  },
  editCancel: {
    color: '#E01E5A',
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
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
