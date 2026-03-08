import React, { Component } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  BackHandler,
  AppState,
  DeviceEventEmitter,
} from 'react-native';
import SlackAPI from './src/api/slack';
import { saveToken, getToken, clearToken, getNotifInterval, saveNotifInterval, getNotifEnabled, saveNotifEnabled, saveSoundEnabled, getSoundEnabled, saveFontSize, getFontSize } from './src/utils/storage';
import {
  startNotificationService,
  stopNotificationService,
  setAppForeground,
  cancelAllNotifications,
  clearUnreadTracking,
} from './src/utils/notification';
import { playNotification, setNotificationMuted } from './src/utils/notificationSound';
import { setFontSizeKey, getMode, setMode } from './src/theme';
import { saveTheme, getTheme } from './src/utils/storage';
import LoginScreen from './src/screens/LoginScreen';
import ChannelListScreen from './src/screens/ChannelListScreen';
import ChatScreen from './src/screens/ChatScreen';
import ThreadScreen from './src/screens/ThreadScreen';
import SearchScreen from './src/screens/SearchScreen';
import ChannelInfoScreen from './src/screens/ChannelInfoScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      initializing: true,
      slack: null,
      currentUser: null,
      teamName: '',
      usersMap: {},
      channels: [],
      channelsLoading: false,
      stack: [{ screen: 'login', params: {} }],
      notifInterval: 120000,
      notifEnabled: true,
      soundEnabled: true,
      fontSize: 'medium',
      themeMode: 'dark',
    };
    this._unreadState = {};
    this._notifPollTimer = null;
  }

  componentDidMount() {
    this._loadTheme();
    this.tryAutoLogin();
    const self = this;
    this._backHandler = BackHandler.addEventListener('hardwareBackPress', function () {
      if (self.state.stack.length > 1) {
        self.goBack();
        return true;
      }
      return false;
    });
    this._appStateListener = AppState.addEventListener
      ? AppState.addEventListener('change', function (state) { self._handleAppState(state); })
      : null;
    if (!this._appStateListener) {
      AppState.addEventListener('change', function (state) { self._handleAppState(state); });
    }
    this._notifOpenListener = DeviceEventEmitter.addListener('onNotificationOpen', function (channelId) {
      self._handleNotificationOpen(channelId);
    });
  }

  componentWillUnmount() {
    if (this._backHandler) {
      this._backHandler.remove();
    }
    if (this._appStateListener && this._appStateListener.remove) {
      this._appStateListener.remove();
    }
    if (this._notifOpenListener) {
      this._notifOpenListener.remove();
    }
    this._stopNotifPolling();
  }

  async tryAutoLogin() {
    try {
      const token = await getToken();
      if (token) {
        await this.doLogin(token);
      } else {
        this.setState({ initializing: false });
      }
    } catch (err) {
      this.setState({ initializing: false });
    }
  }

  async doLogin(token) {
    const slack = new SlackAPI(token);
    const auth = await slack.authTest();

    this.setState({
      slack: slack,
      currentUser: auth.user_id,
      teamName: auth.team || '',
      stack: [{ screen: 'channelList', params: {} }],
      initializing: false,
    });

    await saveToken(token);
    this.loadUsers(slack);
    this.loadChannels(slack);
    this._loadNotifSettings();
  }

  async loadUsers(slack) {
    try {
      const usersMap = {};
      let cursor = '';
      do {
        const res = await slack.usersList(cursor || undefined, 200);
        const members = res.members || [];
        for (let i = 0; i < members.length; i++) {
          usersMap[members[i].id] = members[i];
        }
        cursor = res.response_metadata && res.response_metadata.next_cursor
          ? res.response_metadata.next_cursor
          : '';
      } while (cursor);

      this.setState({ usersMap: usersMap });
    } catch (err) {
      // Users will load on demand
    }
  }

  async loadChannels(slack) {
    this.setState({ channelsLoading: true });
    try {
      let allChannels = [];
      let cursor = '';
      do {
        const res = await slack.conversationsList(
          'public_channel,private_channel,mpim,im',
          cursor || undefined,
          200
        );
        allChannels = allChannels.concat(res.channels || []);
        cursor = res.response_metadata && res.response_metadata.next_cursor
          ? res.response_metadata.next_cursor
          : '';
      } while (cursor);

      this.setState({ channels: allChannels, channelsLoading: false });
      this._updateUnreadState(allChannels);
      this._startBackgroundService();
    } catch (err) {
      this.setState({ channelsLoading: false });
    }
  }

  async handleLogout() {
    this._stopNotifPolling();
    stopNotificationService();
    clearUnreadTracking();
    cancelAllNotifications();
    await clearToken();
    this.setState({
      slack: null,
      currentUser: null,
      teamName: '',
      usersMap: {},
      channels: [],
      stack: [{ screen: 'login', params: {} }],
    });
  }

  _handleAppState(state) {
    if (state === 'active') {
      setAppForeground(true);
      cancelAllNotifications();
      if (this.state.notifEnabled) this._startNotifPolling();
    } else if (state === 'background') {
      setAppForeground(false);
      this._stopNotifPolling();
    }
  }

  _handleNotificationOpen(channelId) {
    if (!channelId) return;
    const ch = this.state.channels.find(function (c) { return c.id === channelId; });
    if (ch) {
      this.navigate('chat', { channel: ch });
    }
  }

  _startBackgroundService() {
    const { slack, currentUser, usersMap, notifEnabled, notifInterval } = this.state;
    if (!slack || !currentUser || !notifEnabled) {
      stopNotificationService();
      return;
    }
    const minimalUsersMap = {};
    const keys = Object.keys(usersMap);
    for (let i = 0; i < keys.length; i++) {
      const u = usersMap[keys[i]];
      minimalUsersMap[keys[i]] = {
        name: u.name || '',
        real_name: u.real_name || '',
        profile: {
          display_name: (u.profile && u.profile.display_name) || '',
          real_name: (u.profile && u.profile.real_name) || '',
        },
      };
    }
    startNotificationService(slack.token, currentUser, minimalUsersMap, notifInterval);
  }

  async _loadTheme() {
    try {
      const mode = await getTheme();
      setMode(mode);
      this.setState({ themeMode: mode });
    } catch (err) {}
  }

  _toggleTheme() {
    const newMode = getMode() === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    this.setState({ themeMode: newMode });
    saveTheme(newMode);
  }

  async _loadNotifSettings() {
    try {
      const interval = await getNotifInterval();
      const enabled = await getNotifEnabled();
      const sound = await getSoundEnabled();
      const font = await getFontSize();
      setNotificationMuted(!sound);
      setFontSizeKey(font);
      this.setState({ notifInterval: interval, notifEnabled: enabled, soundEnabled: sound, fontSize: font }, function () {
        if (enabled) {
          this._startNotifPolling();
        }
      }.bind(this));
    } catch (err) {
      this._startNotifPolling();
    }
  }

  async _handleToggleNotif() {
    const enabled = !this.state.notifEnabled;
    await saveNotifEnabled(enabled);
    this.setState({ notifEnabled: enabled });
    if (enabled) {
      this._startNotifPolling();
      this._startBackgroundService();
    } else {
      this._stopNotifPolling();
      stopNotificationService();
      cancelAllNotifications();
    }
  }

  async _handleChangeInterval(ms) {
    await saveNotifInterval(ms);
    this.setState({ notifInterval: ms });
    this._startNotifPolling();
    this._startBackgroundService();
  }

  async _handleToggleSound() {
    const enabled = !this.state.soundEnabled;
    await saveSoundEnabled(enabled);
    setNotificationMuted(!enabled);
    this.setState({ soundEnabled: enabled });
  }

  async _handleChangeFontSize(size) {
    await saveFontSize(size);
    setFontSizeKey(size);
    this.setState({ fontSize: size });
  }

  _updateUnreadState(channels) {
    for (let i = 0; i < channels.length; i++) {
      const ch = channels[i];
      this._unreadState[ch.id] = {
        unread: ch.unread_count_display || 0,
        mentions: ch.mention_count_display || 0,
      };
    }
  }

  _startNotifPolling() {
    this._stopNotifPolling();
    if (!this.state.notifEnabled) return;
    const self = this;
    const interval = this.state.notifInterval || 120000;
    this._notifPollTimer = setInterval(function () {
      if (self.state.slack && !self._notifPolling) self._pollUnreads();
    }, interval);
  }

  _stopNotifPolling() {
    if (this._notifPollTimer) {
      clearInterval(this._notifPollTimer);
      this._notifPollTimer = null;
    }
  }

  _getCurrentChannelId() {
    const stack = this.state.stack;
    const current = stack[stack.length - 1];
    if (current.screen === 'chat' && current.params && current.params.channel) {
      return current.params.channel.id;
    }
    return null;
  }

  async _pollUnreads() {
    const { slack, currentUser } = this.state;
    if (!slack || !currentUser) return;
    this._notifPolling = true;
    try {
      let allChannels = [];
      let cursor = '';
      do {
        const res = await slack.conversationsList(
          'public_channel,private_channel,mpim,im',
          cursor || undefined,
          200
        );
        allChannels = allChannels.concat(res.channels || []);
        cursor = res.response_metadata && res.response_metadata.next_cursor
          ? res.response_metadata.next_cursor
          : '';
      } while (cursor);

      const currentChId = this._getCurrentChannelId();
      let hasNewNotif = false;
      let hasAnyChange = false;

      for (let i = 0; i < allChannels.length; i++) {
        const ch = allChannels[i];
        const prev = this._unreadState[ch.id];
        const unread = ch.unread_count_display || 0;
        const mentions = ch.mention_count_display || 0;

        if (!prev || prev.unread !== unread || prev.mentions !== mentions) {
          hasAnyChange = true;
        }

        if (ch.id !== currentChId && prev) {
          const isDm = ch.is_im || ch.is_mpim;
          if (isDm && unread > prev.unread && unread > 0) {
            hasNewNotif = true;
          } else if (!isDm && mentions > prev.mentions && mentions > 0) {
            hasNewNotif = true;
          }
        }
      }

      if (hasNewNotif) {
        playNotification();
      }

      this._updateUnreadState(allChannels);

      if (hasAnyChange) {
        this.setState({ channels: allChannels });
      }
    } catch (err) {
      // Silent fail
    }
    this._notifPolling = false;
  }

  navigate(screen, params) {
    this.setState(function (prev) {
      return {
        stack: prev.stack.concat([{ screen: screen, params: params || {} }]),
      };
    });
  }

  goBack() {
    this.setState(function (prev) {
      if (prev.stack.length <= 1) return null;
      return { stack: prev.stack.slice(0, -1) };
    });
  }

  replaceTop(screen, params) {
    this.setState(function (prev) {
      const newStack = prev.stack.slice(0, -1);
      newStack.push({ screen: screen, params: params || {} });
      return { stack: newStack };
    });
  }

  renderScreen() {
    const { stack, slack, currentUser, usersMap, channels, channelsLoading, teamName } = this.state;
    const current = stack[stack.length - 1];
    const screen = current.screen;
    const params = current.params || {};
    const self = this;

    switch (screen) {
      case 'login':
        return (
          <LoginScreen
            onLogin={function (token) { return self.doLogin(token); }}
          />
        );

      case 'channelList':
        return (
          <ChannelListScreen
            slack={slack}
            channels={channels}
            usersMap={usersMap}
            currentUserId={currentUser}
            loading={channelsLoading}
            teamName={teamName}
            onSelect={function (ch) {
              self.navigate('chat', { channel: ch });
            }}
            onSearch={function () {
              self.navigate('search');
            }}
            onLogout={function () {
              self.handleLogout();
            }}
            onSettings={function () {
              self.navigate('settings');
            }}
          />
        );

      case 'chat':
        return (
          <ChatScreen
            key={params.channel.id}
            slack={slack}
            channel={params.channel}
            usersMap={usersMap}
            currentUserId={currentUser}
            onBack={function () { self.goBack(); }}
            onThread={function (msg) {
              self.navigate('thread', { channel: params.channel, parentMessage: msg });
            }}
            onMembers={function () {
              self.navigate('channelInfo', { channel: params.channel });
            }}
          />
        );

      case 'thread':
        return (
          <ThreadScreen
            key={params.parentMessage.ts}
            slack={slack}
            channel={params.channel}
            parentMessage={params.parentMessage}
            usersMap={usersMap}
            currentUserId={currentUser}
            onBack={function () { self.goBack(); }}
          />
        );

      case 'search':
        return (
          <SearchScreen
            slack={slack}
            usersMap={usersMap}
            onBack={function () { self.goBack(); }}
            onSelectMessage={function (msg) {
              if (msg.channel && msg.channel.id) {
                const ch = channels.find(function (c) { return c.id === msg.channel.id; });
                if (ch) {
                  self.navigate('chat', { channel: ch });
                }
              }
            }}
          />
        );

      case 'channelInfo':
        return (
          <ChannelInfoScreen
            slack={slack}
            channel={params.channel}
            usersMap={usersMap}
            currentUserId={currentUser}
            onBack={function () { self.goBack(); }}
            onProfile={function (userId) {
              self.navigate('profile', { userId: userId, channel: params.channel });
            }}
          />
        );

      case 'settings':
        return (
          <SettingsScreen
            notifEnabled={this.state.notifEnabled}
            notifInterval={this.state.notifInterval}
            soundEnabled={this.state.soundEnabled}
            fontSize={this.state.fontSize}
            onToggleNotif={function () { self._handleToggleNotif(); }}
            onChangeInterval={function (ms) { self._handleChangeInterval(ms); }}
            onToggleSound={function () { self._handleToggleSound(); }}
            onToggleTheme={function () { self._toggleTheme(); }}
            onChangeFontSize={function (s) { self._handleChangeFontSize(s); }}
            onBack={function () { self.goBack(); }}
          />
        );

      case 'profile':
        return (
          <ProfileScreen
            slack={slack}
            userId={params.userId}
            usersMap={usersMap}
            currentUserId={currentUser}
            onBack={function () { self.goBack(); }}
            onOpenDM={function (dmChannel) {
              self.navigate('chat', { channel: dmChannel });
            }}
          />
        );

      default:
        return null;
    }
  }

  render() {
    if (this.state.initializing) {
      return (
        <View style={styles.splash}>
          <ActivityIndicator size="large" color="#1264A3" />
        </View>
      );
    }

    return (
      <View style={styles.app}>
        <StatusBar backgroundColor="#19171D" barStyle="light-content" />
        {this.renderScreen()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#1A1D21',
  },
  splash: {
    flex: 1,
    backgroundColor: '#1A1D21',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
