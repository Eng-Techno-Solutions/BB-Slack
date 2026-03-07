import { request, uploadFile } from './http';
import { Platform } from 'react-native';

var BASE = Platform.OS === 'web' ? '/slack-api/' : 'https://slack.com/api/';

export default class SlackAPI {
  constructor(token) {
    this.token = token;
  }

  _headers() {
    return {
      'Authorization': 'Bearer ' + this.token,
      'Content-Type': 'application/json; charset=utf-8',
    };
  }

  _authHeaders() {
    return {
      'Authorization': 'Bearer ' + this.token,
    };
  }

  async _get(method, params) {
    var qs = Object.keys(params || {})
      .filter(function (k) { return params[k] !== undefined && params[k] !== null; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');
    var url = BASE + method + (qs ? '?' + qs : '');
    var res = await request('GET', url, this._authHeaders(), '');
    var data = JSON.parse(res.body);
    if (!data.ok) throw new Error(data.error || 'Unknown error');
    return data;
  }

  async _post(method, body) {
    var url = BASE + method;
    var res = await request('POST', url, this._headers(), JSON.stringify(body));
    var data = JSON.parse(res.body);
    if (!data.ok) throw new Error(data.error || 'Unknown error');
    return data;
  }

  // Auth
  authTest() {
    return this._post('auth.test', {});
  }

  // Conversations
  conversationsList(types, cursor, limit) {
    return this._get('conversations.list', {
      types: types || 'public_channel,private_channel,mpim,im',
      cursor: cursor,
      limit: limit || 200,
      exclude_archived: true,
    });
  }

  conversationsHistory(channel, cursor, limit) {
    return this._get('conversations.history', {
      channel: channel,
      cursor: cursor,
      limit: limit || 30,
    });
  }

  conversationsReplies(channel, ts, cursor, limit) {
    return this._get('conversations.replies', {
      channel: channel,
      ts: ts,
      cursor: cursor,
      limit: limit || 50,
    });
  }

  conversationsInfo(channel) {
    return this._get('conversations.info', { channel: channel });
  }

  conversationsMembers(channel, cursor, limit) {
    return this._get('conversations.members', {
      channel: channel,
      cursor: cursor,
      limit: limit || 100,
    });
  }

  conversationsOpen(users) {
    return this._post('conversations.open', { users: users });
  }

  conversationsMark(channel, ts) {
    return this._post('conversations.mark', { channel: channel, ts: ts });
  }

  conversationsJoin(channel) {
    return this._post('conversations.join', { channel: channel });
  }

  // Chat
  chatPostMessage(channel, text, threadTs) {
    var body = { channel: channel, text: text };
    if (threadTs) body.thread_ts = threadTs;
    return this._post('chat.postMessage', body);
  }

  chatUpdate(channel, ts, text) {
    return this._post('chat.update', { channel: channel, ts: ts, text: text });
  }

  chatDelete(channel, ts) {
    return this._post('chat.delete', { channel: channel, ts: ts });
  }

  // Reactions
  reactionsAdd(channel, name, timestamp) {
    return this._post('reactions.add', {
      channel: channel,
      name: name,
      timestamp: timestamp,
    });
  }

  reactionsRemove(channel, name, timestamp) {
    return this._post('reactions.remove', {
      channel: channel,
      name: name,
      timestamp: timestamp,
    });
  }

  // Users
  usersList(cursor, limit) {
    return this._get('users.list', {
      cursor: cursor,
      limit: limit || 200,
    });
  }

  usersInfo(user) {
    return this._get('users.info', { user: user });
  }

  usersSetPresence(presence) {
    return this._post('users.setPresence', { presence: presence });
  }

  // Search
  searchMessages(query, cursor, count) {
    return this._get('search.messages', {
      query: query,
      cursor: cursor,
      count: count || 20,
    });
  }

  // Pins
  pinsList(channel) {
    return this._get('pins.list', { channel: channel });
  }

  pinsAdd(channel, timestamp) {
    return this._post('pins.add', { channel: channel, timestamp: timestamp });
  }

  pinsRemove(channel, timestamp) {
    return this._post('pins.remove', { channel: channel, timestamp: timestamp });
  }

  // Stars
  starsAdd(channel, timestamp) {
    return this._post('stars.add', { channel: channel, timestamp: timestamp });
  }

  starsRemove(channel, timestamp) {
    return this._post('stars.remove', { channel: channel, timestamp: timestamp });
  }

  // Files
  filesUpload(channel, fileData, threadTs, comment) {
    var url = BASE + 'files.upload';
    var fields = { channels: channel };
    if (fileData.name) fields.filename = fileData.name;
    if (threadTs) fields.thread_ts = threadTs;
    if (comment) fields.initial_comment = comment;
    return uploadFile(url, this.token, fields, fileData).then(function (res) {
      var data = JSON.parse(res.body);
      if (!data.ok) throw new Error(data.error || 'Upload failed');
      return data;
    });
  }

  // Emoji
  emojiList() {
    return this._get('emoji.list', {});
  }

  // Team
  teamInfo() {
    return this._get('team.info', {});
  }
}
