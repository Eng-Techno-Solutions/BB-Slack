import React, { Component } from 'react';
import { View, Text, Image, TouchableOpacity, TouchableHighlight, Linking, StyleSheet, Platform, Dimensions } from 'react-native';
var IS_ANDROID = Platform.OS === 'android';
var SCREEN_W = Dimensions.get('window').width;
var CONTENT_MAX_W = SCREEN_W - 16 - 36 - 10 - 12 - 2;
import { getTwemojiUrlByName } from '../utils/emoji';
import { formatTime, getUserName } from '../utils/format';
import { emojiFromName, replaceEmojisInText } from '../utils/emoji';
import Icon from './Icon';
import SlackText from './SlackText';
import { getColors } from '../theme';

var AVATAR_COLORS = [
  '#E8912D', '#2BAC76', '#CD2553', '#1264A3',
  '#9B59B6', '#E74C3C', '#00BCD4', '#4A154B',
  '#3498DB', '#E67E22', '#1ABC9C', '#8E44AD',
];

function hashCode(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getAvatarColor(userId) {
  return AVATAR_COLORS[hashCode(userId || '') % AVATAR_COLORS.length];
}

function getProfileImage(userId, usersMap) {
  var u = usersMap[userId];
  if (u && u.profile) {
    return u.profile.image_72 || u.profile.image_48 || null;
  }
  return null;
}

function proxyUrl(url, token) {
  if (Platform.OS === 'web' && url && token) {
    return '/slack-file?url=' + encodeURIComponent(url) + '&token=' + encodeURIComponent(token);
  }
  return url;
}

function imageSource(url, token) {
  if (Platform.OS !== 'web' && url && token) {
    return { uri: url, headers: { Authorization: 'Bearer ' + token } };
  }
  return { uri: url };
}

function isImageFile(file) {
  if (file.mimetype && file.mimetype.indexOf('image/') === 0) return true;
  var name = (file.name || file.title || '').toLowerCase();
  return name.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/) !== null;
}

function isAudioFile(file) {
  if (file.subtype === 'slack_audio') return true;
  if (file.mimetype && file.mimetype.indexOf('audio/') === 0) return true;
  return false;
}

function formatDuration(ms) {
  var secs = Math.round(ms / 1000);
  var m = Math.floor(secs / 60);
  var s = secs % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function getThumbDataUri(file) {
  if (file.thumb_tiny) {
    return 'data:image/jpeg;base64,' + file.thumb_tiny;
  }
  return null;
}

export default class MessageItem extends Component {
  constructor(props) {
    super(props);
    this.state = { showReactionUsers: null };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.showReactionUsers !== nextState.showReactionUsers) return true;
    if (this.props.focused !== nextProps.focused) return true;
    var prev = this.props.message;
    var next = nextProps.message;
    if (prev.ts !== next.ts) return true;
    if (prev.text !== next.text) return true;
    if ((prev.edited ? 'y' : 'n') !== (next.edited ? 'y' : 'n')) return true;
    if (prev.reply_count !== next.reply_count) return true;
    var prevR = prev.reactions || [];
    var nextR = next.reactions || [];
    if (prevR.length !== nextR.length) return true;
    for (var i = 0; i < prevR.length; i++) {
      if (prevR[i].name !== nextR[i].name || prevR[i].count !== nextR[i].count) return true;
    }
    var prevF = prev.files || [];
    var nextF = next.files || [];
    if (prevF.length !== nextF.length) return true;
    return false;
  }

  renderImageFile(f, i, token) {
    var onImagePress = this.props.onImagePress;
    var c = getColors();
    var fullUrl = f.url_private || f.url_private_download || f.thumb_480 || f.thumb_360;
    var thumbUrl = f.thumb_480 || f.thumb_360 || f.thumb_160 || fullUrl;
    var proxiedThumb = proxyUrl(thumbUrl, token);
    var proxiedFull = proxyUrl(fullUrl, token);

    var w = f.original_w || f.thumb_480_w || f.thumb_360_w || 300;
    var h = f.original_h || f.thumb_480_h || f.thumb_360_h || 200;
    var maxW = CONTENT_MAX_W;
    if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }

    return (
      <TouchableOpacity
        key={i}
        style={[styles.imageWrapper, { borderColor: c.border }]}
        activeOpacity={0.8}
        data-type="file-card"
        onPress={function () {
          onImagePress && onImagePress({ uri: proxiedFull, name: f.name || f.title || 'Image', token: token });
        }}
      >
        <Image
          source={imageSource(proxiedThumb, token)}
          style={{ width: w, height: h, backgroundColor: c.bgTertiary }}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  renderAudioFile(f, i, token) {
    var onAudioPress = this.props.onAudioPress;
    var c = getColors();
    var audioUrl = f.aac || f.url_private || f.url_private_download || '';
    var proxiedUrl = proxyUrl(audioUrl, token);
    var duration = f.duration_ms ? formatDuration(f.duration_ms) : '';
    var samples = f.audio_wave_samples || [];

    return (
      <TouchableOpacity
        key={i}
        style={[styles.audioCard, { backgroundColor: c.bgTertiary, borderColor: c.border }]}
        activeOpacity={0.7}
        data-type="file-card"
        onPress={function () {
          onAudioPress && onAudioPress({ uri: proxiedUrl, name: f.name || f.title || 'Audio', duration: f.duration_ms, token: token });
        }}
      >
        <View style={[styles.audioPlayBtn, { backgroundColor: c.green }]}>
          <Icon name="play" size={16} color="#FFFFFF" />
        </View>
        <View style={styles.audioContent}>
          <View style={styles.waveformRow}>
            {samples.filter(function (_, idx) { return idx % 2 === 0; }).slice(0, 40).map(function (val, idx) {
              var barH = Math.max(2, Math.round((val / 100) * 24));
              return (
                <View key={idx} style={[styles.waveBar, { height: barH, backgroundColor: c.accent }]} />
              );
            })}
          </View>
          {duration ? <Text style={[styles.audioDuration, { color: c.textTertiary }]}>{duration}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  }

  renderFileCard(f, i) {
    var c = getColors();
    var permalink = f.permalink || f.permalink_public || '';
    var ext = (f.filetype || '').toUpperCase();
    var sizeKB = f.size ? (f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.round(f.size / 1024) + ' KB') : '';

    return (
      <TouchableOpacity
        key={i}
        style={[styles.fileCard, { backgroundColor: c.bgTertiary, borderColor: c.border }]}
        activeOpacity={0.7}
        data-type="file-card"
        onPress={function () {
          if (permalink) {
            if (Platform.OS === 'web') { window.open(permalink, '_blank'); }
            else { Linking.openURL(permalink).catch(function () {}); }
          }
        }}
      >
        <View style={[styles.fileIcon, { backgroundColor: c.fileIconBg }]}>
          <Text style={[styles.fileIconText, { color: c.textSecondary }]}>{ext ? ext.substring(0, 4) : 'FILE'}</Text>
        </View>
        <View style={styles.fileInfo}>
          <Text style={[styles.fileName, { color: c.accentLight }]} numberOfLines={1}>{f.name || f.title || 'attachment'}</Text>
          <Text style={[styles.fileMeta, { color: c.textTertiary }]}>
            {ext}{sizeKB ? (ext ? ' · ' : '') + sizeKB : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  render() {
    var { message, usersMap, currentUserId, onLongPress, onThreadPress, token, focused } = this.props;
    var c = getColors();

    if (message.subtype === 'channel_join' || message.subtype === 'channel_leave' ||
        message.subtype === 'group_join' || message.subtype === 'group_leave') {
      return (
        <View style={styles.systemMsg}>
          <View style={[styles.systemLine, { backgroundColor: c.systemLine }]} />
          <SlackText text={message.text} usersMap={usersMap} style={[styles.systemText, { color: c.textTertiary }]} />
          <View style={[styles.systemLine, { backgroundColor: c.systemLine }]} />
        </View>
      );
    }

    var userName = message.username || getUserName(message.user, usersMap);
    var time = formatTime(message.ts);
    var edited = message.edited ? ' (edited)' : '';
    var threadCount = message.reply_count || 0;
    var reactions = message.reactions || [];
    var files = message.files || [];
    var profileImg = getProfileImage(message.user, usersMap);
    var initial = (userName || '?').charAt(0).toUpperCase();
    var avatarBg = getAvatarColor(message.user);
    var self = this;

    return (
      <TouchableHighlight
        style={[styles.container, focused && { backgroundColor: c.messageUnderlay }]}
        underlayColor={c.messageUnderlay}
        onLongPress={function () { onLongPress && onLongPress(message); }}
        data-type="message"
      >
        <View style={styles.msgInner}>
        <View style={styles.avatarCol}>
          {profileImg ? (
            <Image source={{ uri: profileImg }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: avatarBg }]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
        </View>
        <View style={styles.contentCol}>
          <View style={styles.headerRow}>
            <Text style={[styles.userName, { color: c.textSecondary }]}>{userName}</Text>
            <Text style={[styles.time, { color: c.textTertiary }]}>{time}{edited}</Text>
          </View>

          {message.text ? (
            <SlackText text={message.text} usersMap={usersMap} style={[styles.text, { color: c.textSecondary }]} />
          ) : null}

          {files.length > 0 ? (
            <View style={styles.filesContainer}>
              {files.map(function (f, i) {
                if (isImageFile(f)) return self.renderImageFile(f, i, token);
                if (isAudioFile(f)) return self.renderAudioFile(f, i, token);
                return self.renderFileCard(f, i);
              })}
            </View>
          ) : null}

          {reactions.length > 0 ? (
            <View style={styles.reactionsRow}>
              {reactions.map(function (r, i) {
                var emoji = emojiFromName(r.name);
                var reacted = r.users && r.users.indexOf(currentUserId) !== -1;
                var isExpanded = self.state.showReactionUsers === i;
                return (
                  <View key={i} style={{ position: 'relative' }}>
                    <TouchableOpacity
                      style={[styles.reactionBadge, { backgroundColor: c.bgTertiary, borderColor: c.border }, reacted && { backgroundColor: c.reactionActiveBg, borderColor: c.accent }]}
                      activeOpacity={0.7}
                      data-type="reaction"
                      onPress={function () {
                        if (self.props.onReactionPress) {
                          self.props.onReactionPress(message, r.name, reacted);
                        }
                      }}
                      onLongPress={function () {
                        self.setState({ showReactionUsers: isExpanded ? null : i });
                      }}
                    >
                      {IS_ANDROID ? (
                        <Image source={{ uri: getTwemojiUrlByName(r.name) }} style={styles.reactionImg} />
                      ) : emoji ? (
                        <Text style={styles.reactionEmoji}>{emoji}</Text>
                      ) : (
                        <Text style={[styles.reactionShortcode, { color: c.textSecondary }]}>:{r.name}:</Text>
                      )}
                      <Text style={[styles.reactionCount, { color: c.textTertiary }, reacted && { color: c.accentLight }]}>{r.count}</Text>
                    </TouchableOpacity>
                    {isExpanded && r.users ? (
                      <View style={[styles.reactionTooltip, { backgroundColor: c.tooltipBg, borderColor: c.borderInput }]}>
                        <Text style={[styles.reactionTooltipText, { color: c.textSecondary }]}>
                          {r.users.map(function (uid) { return getUserName(uid, usersMap); }).join(', ')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {threadCount > 0 ? (
            <TouchableOpacity
              style={styles.threadLink}
              onPress={function () { onThreadPress && onThreadPress(message); }}
              data-type="thread-link"
            >
              <View style={[styles.threadBar, { backgroundColor: c.accent }]} />
              <Text style={[styles.threadText, { color: c.accentLight }]}>
                {threadCount} {threadCount === 1 ? 'reply' : 'replies'}
              </Text>
              <Text style={[styles.threadArrow, { color: c.textTertiary }]}>  View thread</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        </View>
      </TouchableHighlight>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingRight: 12,
  },
  msgInner: {
    flexDirection: 'row',
  },
  avatarCol: { width: 36, marginRight: 10, paddingTop: 2 },
  avatar: { width: 36, height: 36, borderRadius: 4 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  contentCol: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  userName: { fontSize: 15, fontWeight: 'bold', marginRight: 8 },
  time: { fontSize: 12 },
  text: { fontSize: 15, lineHeight: 22 },

  systemMsg: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  systemLine: { flex: 1, height: 1 },
  systemText: { fontSize: 13, paddingHorizontal: 12 },

  filesContainer: { marginTop: 6 },

  imageWrapper: {
    marginBottom: 6,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },

  audioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
    alignSelf: 'flex-start',
    minWidth: 240,
    maxWidth: CONTENT_MAX_W,
  },
  audioPlayBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  audioContent: { flex: 1 },
  waveformRow: { flexDirection: 'row', alignItems: 'center', height: 28 },
  waveBar: { width: 3, borderRadius: 1, marginRight: 1 },
  audioDuration: { fontSize: 11, marginTop: 4 },

  fileCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10, marginBottom: 6,
    alignSelf: 'flex-start', minWidth: 200, maxWidth: CONTENT_MAX_W,
  },
  fileIcon: {
    width: 40, height: 40, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  fileIconText: { fontSize: 10, fontWeight: 'bold' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600' },
  fileMeta: { fontSize: 12, marginTop: 2 },

  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  reactionBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 8, paddingVertical: 4,
    marginRight: 4, marginBottom: 4,
    borderWidth: 1,
  },
  reactionEmoji: { fontSize: 16, marginRight: 4 },
  reactionImg: { width: 18, height: 18, marginRight: 4 },
  reactionShortcode: { fontSize: 12, marginRight: 4 },
  reactionCount: { fontSize: 12, fontWeight: '600' },
  reactionTooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    minWidth: 80,
    zIndex: 10,
  },
  reactionTooltipText: {
    fontSize: 12,
  },

  threadLink: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingVertical: 4 },
  threadBar: { width: 2, height: 16, borderRadius: 1, marginRight: 8 },
  threadText: { fontSize: 13, fontWeight: '600' },
  threadArrow: { fontSize: 12 },
});
