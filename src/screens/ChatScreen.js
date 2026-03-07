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
import EmojiPicker from '../components/EmojiPicker';
import { getChannelDisplayName } from '../utils/format';
import { playNotification } from '../utils/notificationSound';
import { pickFile } from '../utils/filePicker';
import { startRecording, stopRecording, cancelRecording } from '../utils/audioRecorder';
import { getColors } from '../theme';
import { addKeyEventListener, removeKeyEventListener } from '../utils/keyEvents';

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
      viewerImage: null,
      viewerAudio: null,
      emojiPickerMode: null,
      reactionTarget: null,
      showScrollBtn: false,
      uploading: false,
      recording: false,
      recordingTime: 0,
      focusIndex: -1,
    };
    var self = this;
    this._onLongPress = function (m) { self.onMessageLongPress(m); };
    this._onReactionPress = function (m, name, reacted) { self.toggleReaction(m, name, reacted); };
    this._onImagePress = function (img) { self.setState({ viewerImage: img }); };
    this._onAudioPress = function (audio) { self.setState({ viewerAudio: audio }); };
    this._renderItem = function (obj) { return self._renderMessageItem(obj); };
    this._keyExtractor = function (item) { return item.ts; };
    this._onScroll = function (e) { self._handleScroll(e); };
    this._listRef = function (r) { self._list = r; };
  }

  componentDidMount() {
    this._mounted = true;
    this._userScrolledUp = false;
    this.loadMessages();
    this.startPolling();
    var self = this;
    this._keySub = addKeyEventListener(function (e) {
      self.handleKeyEvent(e);
    });
  }

  componentWillUnmount() {
    this._mounted = false;
    this.stopPolling();
    removeKeyEventListener(this._keySub);
    if (this._recordTimer) {
      clearInterval(this._recordTimer);
    }
    if (this.state.recording) {
      cancelRecording();
    }
  }

  handleKeyEvent(e) {
    var action = e.action;
    var msgs = this.state.messages;
    var idx = this.state.focusIndex;

    if (action === 'down') {
      var next = Math.max(idx - 1, 0);
      this.setState({ focusIndex: next });
      if (this._list) this._list.scrollToIndex({ index: next, viewOffset: 80, animated: true });
    } else if (action === 'up') {
      var prev = Math.min(idx + 1, msgs.length - 1);
      this.setState({ focusIndex: prev });
      if (this._list) this._list.scrollToIndex({ index: prev, viewOffset: 80, animated: true });
    } else if (action === 'select' && idx >= 0 && idx < msgs.length) {
      this.onMessageLongPress(msgs[idx]);
    } else if (action === 'back') {
      this.props.onBack && this.props.onBack();
    }
  }

  startPolling() {
    var self = this;
    this._pollTimer = setInterval(function () {
      if (self._mounted) self.pollNewMessages();
    }, 5000);
  }

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  async loadMessages() {
    var self = this;
    var { slack, channel } = this.props;
    try {
      var res = await slack.conversationsHistory(channel.id, null, 30);
      var msgs = (res.messages || []).slice();
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
    if (loading || this._polling) return;
    this._polling = true;
    try {
      var limit = Math.min(Math.max(messages.length, 30), 100);
      var res = await slack.conversationsHistory(channel.id, null, limit);
      var fetched = (res.messages || []).slice();
      if (fetched.length === 0) return;

      var existingMap = {};
      for (var i = 0; i < messages.length; i++) {
        existingMap[messages[i].ts] = true;
      }

      var hasNew = false;
      for (var j = 0; j < fetched.length; j++) {
        if (!existingMap[fetched[j].ts]) {
          hasNew = true;
          break;
        }
      }

      var fetchedMap = {};
      for (var k = 0; k < fetched.length; k++) {
        fetchedMap[fetched[k].ts] = fetched[k];
      }

      var merged = [];
      for (var n = 0; n < fetched.length; n++) {
        if (!existingMap[fetched[n].ts]) {
          merged.push(fetched[n]);
        }
      }
      for (var m = 0; m < messages.length; m++) {
        if (fetchedMap[messages[m].ts]) {
          merged.push(fetchedMap[messages[m].ts]);
        } else {
          merged.push(messages[m]);
        }
      }

      var self = this;
      var currentUserId = this.props.currentUserId;
      this.setState({ messages: merged });
      if (hasNew) {
        var newMsgs = fetched.filter(function (f) { return !existingMap[f.ts]; });
        var fromOthers = newMsgs.filter(function (msg) { return msg.user !== currentUserId; });
        if (fromOthers.length > 0) {
          playNotification();
        }
        if (!self._userScrolledUp) {
          this.markRead(newMsgs);
        } else {
          self._unseenCount = (self._unseenCount || 0) + newMsgs.length;
          self.setState({ _unseenTick: Date.now() });
        }
      }
    } catch (err) {
      // Silent fail on poll
    }
    this._polling = false;
  }

  async loadMore() {
    var { slack, channel } = this.props;
    var { cursor, loadingMore, hasMore } = this.state;
    if (loadingMore || !hasMore || !cursor) return;

    this.setState({ loadingMore: true });
    try {
      var res = await slack.conversationsHistory(channel.id, cursor, 30);
      var older = (res.messages || []).slice();
      var nextCursor = res.response_metadata && res.response_metadata.next_cursor;
      this.setState(function (prev) {
        return {
          messages: prev.messages.concat(older),
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
      var lastTs = msgs[0].ts;
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
        await slack.chatPostMessage(channel.id, text);
        this.setState({ inputText: '', sending: false });
        this.pollNewMessages();
      }
    } catch (err) {
      this.setState({ sending: false });
      Alert.alert('Error', err.message);
    }
  }

  async handleAttachment() {
    var { slack, channel } = this.props;
    var self = this;
    try {
      var file = await pickFile();
      if (!file) return;
      this.setState({ uploading: true });
      var text = this.state.inputText.trim();
      await slack.filesUpload(channel.id, file, null, text || null);
      this.setState({ uploading: false, inputText: '' });
      this.pollNewMessages();
    } catch (err) {
      this.setState({ uploading: false });
      Alert.alert('Error', err.message);
    }
  }

  async handleStartRecording() {
    var self = this;
    try {
      await startRecording();
      this.setState({ recording: true, recordingTime: 0 });
      this._recordTimer = setInterval(function () {
        if (self._mounted) {
          self.setState(function (prev) {
            return { recordingTime: prev.recordingTime + 1 };
          });
        }
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'Could not start recording: ' + err.message);
    }
  }

  async handleStopRecording() {
    var { slack, channel } = this.props;
    if (this._recordTimer) {
      clearInterval(this._recordTimer);
      this._recordTimer = null;
    }
    try {
      var audio = await stopRecording();
      this.setState({ recording: false, recordingTime: 0, uploading: true });
      await slack.filesUpload(channel.id, audio);
      this.setState({ uploading: false });
      this.pollNewMessages();
    } catch (err) {
      this.setState({ recording: false, recordingTime: 0, uploading: false });
      Alert.alert('Error', err.message);
    }
  }

  async handleCancelRecording() {
    if (this._recordTimer) {
      clearInterval(this._recordTimer);
      this._recordTimer = null;
    }
    await cancelRecording();
    this.setState({ recording: false, recordingTime: 0 });
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
      this.pollNewMessages();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async removeReaction(message, name) {
    var { slack, channel } = this.props;
    try {
      await slack.reactionsRemove(channel.id, name, message.ts);
      this.pollNewMessages();
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

  _renderMessageItem(obj) {
    return (
      <MessageItem
        message={obj.item}
        usersMap={this.props.usersMap}
        currentUserId={this.props.currentUserId}
        token={this.props.slack.token}
        focused={obj.index === this.state.focusIndex}
        onLongPress={this._onLongPress}
        onReactionPress={this._onReactionPress}
        onThreadPress={this.props.onThread}
        onImagePress={this._onImagePress}
        onAudioPress={this._onAudioPress}
      />
    );
  }

  _handleScroll(e) {
    var offset = e.nativeEvent.contentOffset.y;
    var nearBottom = offset < 150;
    this._userScrolledUp = !nearBottom;
    if (nearBottom && this._unseenCount > 0) {
      this._unseenCount = 0;
      this.markRead(this.state.messages);
    }
    if (this.state.showScrollBtn !== !nearBottom) {
      this.setState({ showScrollBtn: !nearBottom });
    }
  }

  onMessageLongPress(message) {
    this.setState({ actionMessage: message, reactionTarget: message });
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
      label: 'Add Reaction',
      onPress: function () {
        self.setState({ actionMessage: null, emojiPickerMode: 'reaction' });
      },
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
    var { messages, loading, loadingMore, inputText, sending, editingMessage, actionMessage, viewerImage, viewerAudio, emojiPickerMode, uploading, recording, recordingTime } = this.state;
    var self = this;
    var channelName = getChannelDisplayName(channel, usersMap, currentUserId);
    var c = getColors();

    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <Header
          title={(!channel.is_im ? '# ' : '') + channelName}
          subtitle={channel.topic && channel.topic.value ? channel.topic.value : null}
          onBack={onBack}
          rightIcon="info"
          onRight={onMembers}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={c.accent} />
          </View>
        ) : (
          <View style={styles.listWrapper}>
            <FlatList
              ref={this._listRef}
              data={messages}
              inverted
              keyExtractor={this._keyExtractor}
              renderItem={this._renderItem}
              onScroll={this._onScroll}
              scrollEventThrottle={100}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadMore}>
                    <ActivityIndicator size="small" color={c.accent} />
                  </View>
                ) : self.state.hasMore ? (
                  <TouchableOpacity style={styles.loadMore} onPress={function () { self.loadMore(); }} data-type="btn">
                    <Text style={[styles.loadMoreText, { color: c.accentLight }]}>Load older messages</Text>
                  </TouchableOpacity>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={[styles.emptyText, { color: c.textTertiary }]}>No messages yet</Text>
                </View>
              }
            />
            {self.state.showScrollBtn ? (
              <TouchableOpacity
                style={[styles.scrollBtn, { backgroundColor: c.scrollBtnBg || c.accent }]}
                data-type="icon-btn"
                onPress={function () {
                  self._userScrolledUp = false;
                  self._unseenCount = 0;
                  self.setState({ showScrollBtn: false });
                  self.markRead(self.state.messages);
                  if (self._list) {
                    self._list.scrollToOffset({ offset: 0, animated: true });
                  }
                }}
              >
                {self._unseenCount > 0 ? (
                  <View style={[styles.unseenBadge, { backgroundColor: c.badgeBg || '#E01E5A' }]}>
                    <Text style={styles.unseenBadgeText}>{self._unseenCount > 99 ? '99+' : self._unseenCount}</Text>
                  </View>
                ) : null}
                <Icon name="chevron-down" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <View style={[styles.inputBar, { borderTopColor: c.border, backgroundColor: c.bg }]}>
          {editingMessage ? (
            <View style={[styles.editBanner, { backgroundColor: c.bgTertiary }]}>
              <Text style={[styles.editBannerText, { color: c.accentLight }]}>Editing message</Text>
              <TouchableOpacity onPress={function () { self.setState({ editingMessage: null, inputText: '' }); }} data-type="text-btn">
                <Text style={styles.editCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {recording ? (
            <View style={styles.inputRow}>
              <View style={styles.recordingRow}>
                <View style={[styles.recordingDot, { backgroundColor: '#E01E5A' }]} />
                <Text style={[styles.recordingText, { color: c.textSecondary }]}>
                  {Math.floor(recordingTime / 60) + ':' + (recordingTime % 60 < 10 ? '0' : '') + (recordingTime % 60)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn]}
                onPress={function () { self.handleCancelRecording(); }}
                data-type="icon-btn"
              >
                <Icon name="close" size={20} color="#E01E5A" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: c.green }]}
                onPress={function () { self.handleStopRecording(); }}
                data-type="btn"
              >
                <Icon name="send" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={function () { self.handleAttachment(); }}
                disabled={uploading || sending}
                data-type="icon-btn"
              >
                <Icon name="paperclip" size={22} color={c.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={function () { self.setState({ emojiPickerMode: 'input' }); }}
                data-type="icon-btn"
              >
                <Icon name="smile" size={22} color={c.textTertiary} />
              </TouchableOpacity>
              <TextInput
                ref={function (r) { self._inputRef = r; }}
                style={[styles.input, { backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: c.borderInput }]}
                placeholder="Message..."
                placeholderTextColor={c.textPlaceholder}
                value={inputText}
                onChangeText={function (t) { self.setState({ inputText: t }); }}
                onSubmitEditing={function () { self.sendMessage(); }}
                returnKeyType="send"
                multiline={false}
                autoFocus={true}
              />
              {inputText.trim() ? (
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: c.green }, (sending || uploading) && styles.sendDisabled]}
                  onPress={function () { self.sendMessage(); }}
                  disabled={sending || uploading}
                  data-type="btn"
                >
                  {sending || uploading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Icon name="send" size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.micBtn, { backgroundColor: c.green }, uploading && styles.sendDisabled]}
                  onPress={function () { self.handleStartRecording(); }}
                  disabled={uploading}
                  data-type="btn"
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Icon name="mic" size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
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
          token={viewerImage ? viewerImage.token : ''}
          onClose={function () { self.setState({ viewerImage: null }); }}
        />

        <AudioPlayer
          visible={!!viewerAudio}
          source={viewerAudio ? viewerAudio.uri : ''}
          fileName={viewerAudio ? viewerAudio.name : ''}
          duration={viewerAudio ? viewerAudio.duration : 0}
          token={viewerAudio ? viewerAudio.token : ''}
          onClose={function () { self.setState({ viewerAudio: null }); }}
        />

        <EmojiPicker
          visible={!!emojiPickerMode}
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
  },
  listWrapper: {
    flex: 1,
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
  loadMore: {
    padding: 12,
    alignItems: 'center',
  },
  inputBar: {
    borderTopWidth: 1,
  },
  editBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBannerText: {
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
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 8,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 4,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  actionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 9,
    marginRight: 4,
  },
  micBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 4,
  },
  recordingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  recordingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollBtn: {
    position: 'absolute',
    right: 16,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
  },
  unseenBadge: {
    position: 'absolute',
    top: -8,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignItems: 'center',
    zIndex: 11,
  },
  unseenBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
