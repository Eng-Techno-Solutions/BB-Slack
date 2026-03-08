import React, { Component } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import SlackAPI from './api/slack';
import { saveToken, getToken, clearToken, saveTheme, getTheme, saveSoundEnabled, getSoundEnabled, saveFontSize, getFontSize } from './utils/storage';
import { getColors, getMode, setMode, setFontSizeKey } from './theme';
import LoginScreen from './screens/LoginScreen';
import ChannelListScreen from './screens/ChannelListScreen';
import ChatScreen from './screens/ChatScreen';
import ThreadScreen from './screens/ThreadScreen';
import SearchScreen from './screens/SearchScreen';
import ChannelInfoScreen from './screens/ChannelInfoScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import { playNotification, setNotificationMuted } from './utils/notificationSound';
import { getNotifInterval, saveNotifInterval, getNotifEnabled, saveNotifEnabled } from './utils/storage';

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      initializing: true,
      slack: null,
      currentUser: null,
      teamName: '',
      teamIcon: '',
      usersMap: {},
      channels: [],
      channelsLoading: false,
      stack: [{ screen: 'login', params: {} }],
      themeMode: 'dark',
      notifInterval: 120000,
      notifEnabled: true,
      soundEnabled: true,
      fontSize: 'medium',
    };
  }

  componentDidMount() {
    this.loadTheme();
    this.loadNotifSettings();
    this.tryAutoLogin();
  }

  componentWillUnmount() {
    this.stopChannelPolling();
  }

  async loadTheme() {
    try {
      const mode = await getTheme();
      setMode(mode);
      this.setState({ themeMode: mode });
      this._applyThemeToDOM(mode);
    } catch (err) {
      // Default dark
    }
  }

  _applyThemeToDOM(mode) {
    try {
      document.documentElement.setAttribute('data-theme', mode);
    } catch (e) {
      // Non-web platform
    }
  }

  toggleTheme() {
    const newMode = getMode() === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    this.setState({ themeMode: newMode });
    saveTheme(newMode);
    this._applyThemeToDOM(newMode);
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
    this.loadTeamInfo(slack);
    this.loadUsers(slack);
    this.loadChannels(slack);
    this.startChannelPolling(slack);
  }

  startChannelPolling(slack) {
    this.stopChannelPolling();
    if (!this.state.notifEnabled) return;
    const self = this;
    const interval = this.state.notifInterval || 120000;
    this._channelPollTimer = setInterval(function () {
      self.loadChannels(slack);
    }, interval);
  }

  stopChannelPolling() {
    if (this._channelPollTimer) {
      clearInterval(this._channelPollTimer);
      this._channelPollTimer = null;
    }
  }

  async loadTeamInfo(slack) {
    try {
      const res = await slack.teamInfo();
      const icon = res.team && res.team.icon ? res.team.icon.image_68 || res.team.icon.image_44 || '' : '';
      this.setState({ teamIcon: icon });
    } catch (err) {
      console.warn('loadTeamInfo error:', err.message);
    }
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
    if (this._loadingChannels) return;
    this._loadingChannels = true;
    const isFirstLoad = this.state.channels.length === 0;
    const oldChannels = this.state.channels;
    if (isFirstLoad) this.setState({ channelsLoading: true });
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

      // Detect new unreads and play sound if not viewing that channel
      if (!isFirstLoad && oldChannels.length > 0) {
        const oldUnreadMap = {};
        for (let i = 0; i < oldChannels.length; i++) {
          oldUnreadMap[oldChannels[i].id] = oldChannels[i].unread_count_display || 0;
        }

        const stack = this.state.stack;
        const currentScreen = stack[stack.length - 1];
        const activeChannelId = (currentScreen.screen === 'chat' && currentScreen.params.channel)
          ? currentScreen.params.channel.id
          : null;

        let hasNewUnread = false;
        for (let j = 0; j < allChannels.length; j++) {
          const ch = allChannels[j];
          const oldCount = oldUnreadMap[ch.id] || 0;
          const newCount = ch.unread_count_display || 0;
          if (newCount > oldCount && ch.id !== activeChannelId) {
            hasNewUnread = true;
            break;
          }
        }

        if (hasNewUnread) {
          playNotification();
        }
      }

      this.setState({ channels: allChannels, channelsLoading: false });
    } catch (err) {
      if (err.message === 'ratelimited') {
        // Back off - skip this cycle, next interval will retry
        console.warn('loadChannels rate limited, backing off');
      } else {
        console.warn('loadChannels error: ' + err.message);
      }
      this.setState({ channelsLoading: false });
    }
    this._loadingChannels = false;
  }

  async loadNotifSettings() {
    try {
      const interval = await getNotifInterval();
      const enabled = await getNotifEnabled();
      const sound = await getSoundEnabled();
      const font = await getFontSize();
      setNotificationMuted(!sound);
      setFontSizeKey(font);
      this.setState({ notifInterval: interval, notifEnabled: enabled, soundEnabled: sound, fontSize: font });
    } catch (err) {
      // Defaults
    }
  }

  async handleToggleNotif() {
    const enabled = !this.state.notifEnabled;
    await saveNotifEnabled(enabled);
    this.setState({ notifEnabled: enabled });
    if (enabled) {
      this.startChannelPolling(this.state.slack);
    } else {
      this.stopChannelPolling();
    }
  }

  async handleChangeInterval(ms) {
    await saveNotifInterval(ms);
    this.setState({ notifInterval: ms });
    if (this.state.notifEnabled && this.state.slack) {
      this.stopChannelPolling();
      this.startChannelPolling(this.state.slack);
    }
  }

  async handleToggleSound() {
    const enabled = !this.state.soundEnabled;
    await saveSoundEnabled(enabled);
    setNotificationMuted(!enabled);
    this.setState({ soundEnabled: enabled });
  }

  async handleChangeFontSize(size) {
    await saveFontSize(size);
    setFontSizeKey(size);
    this.setState({ fontSize: size });
  }

  async handleLogout() {
    this.stopChannelPolling();
    await clearToken();
    this.setState({
      slack: null,
      currentUser: null,
      teamName: '',
      teamIcon: '',
      usersMap: {},
      channels: [],
      stack: [{ screen: 'login', params: {} }],
    });
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
    const { stack, slack, currentUser, usersMap, channels, channelsLoading, teamName, teamIcon, themeMode } = this.state;
    const current = stack[stack.length - 1];
    const screen = current.screen;
    const params = current.params || {};
    const self = this;

    switch (screen) {
      case 'login':
        return (
          <LoginScreen
            themeMode={themeMode}
            onLogin={function (token) { return self.doLogin(token); }}
          />
        );

      case 'channelList':
        return (
          <ChannelListScreen
            themeMode={themeMode}
            slack={slack}
            channels={channels}
            usersMap={usersMap}
            currentUserId={currentUser}
            loading={channelsLoading}
            teamName={teamName}
            teamIcon={teamIcon}
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
            themeMode={themeMode}
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
            themeMode={themeMode}
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
            themeMode={themeMode}
            slack={slack}
            usersMap={usersMap}
            onBack={function () { self.goBack(); }}
            onSelectMessage={function (msg) {
              // Try to navigate to the channel
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
            themeMode={themeMode}
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
            themeMode={themeMode}
            notifEnabled={this.state.notifEnabled}
            notifInterval={this.state.notifInterval}
            soundEnabled={this.state.soundEnabled}
            fontSize={this.state.fontSize}
            onToggleNotif={function () { self.handleToggleNotif(); }}
            onChangeInterval={function (ms) { self.handleChangeInterval(ms); }}
            onToggleSound={function () { self.handleToggleSound(); }}
            onToggleTheme={function () { self.toggleTheme(); }}
            onChangeFontSize={function (s) { self.handleChangeFontSize(s); }}
            onBack={function () { self.goBack(); }}
          />
        );

      case 'profile':
        return (
          <ProfileScreen
            themeMode={themeMode}
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
    const colors = getColors();

    if (this.state.initializing) {
      return (
        <View style={[styles.splash, { backgroundColor: colors.bgSplash }]}>
          <ActivityIndicator size="large" color={colors.splash} />
        </View>
      );
    }

    return (
      <View style={[styles.app, { backgroundColor: colors.bgSplash }]}>
        <StatusBar backgroundColor={colors.statusBar} barStyle={colors.statusBarStyle} />
        {this.renderScreen()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
