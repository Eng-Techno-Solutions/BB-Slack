import React, { Component } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  BackHandler,
  AppState,
} from 'react-native';
import SlackAPI from './src/api/slack';
import { saveToken, getToken, clearToken, getNotifInterval, saveNotifInterval, getNotifEnabled, saveNotifEnabled, saveSoundEnabled, getSoundEnabled, saveFontSize, getFontSize, getAccounts, saveAccounts, getActiveAccountId, saveActiveAccountId } from './src/utils/storage';
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
      teamIcon: '',
      usersMap: {},
      channels: [],
      channelsLoading: false,
      stack: [{ screen: 'login', params: {} }],
      notifInterval: 120000,
      notifEnabled: true,
      soundEnabled: true,
      fontSize: 'medium',
      themeMode: 'dark',
      accounts: [],
    };
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
  }

  componentWillUnmount() {
    if (this._backHandler) {
      this._backHandler.remove();
    }
    if (this._appStateListener && this._appStateListener.remove) {
      this._appStateListener.remove();
    }
    this._stopNotifPolling();
  }

  async tryAutoLogin() {
    try {
      const accounts = await getAccounts();
      if (accounts.length > 0) {
        this.setState({ accounts: accounts });
        const activeId = await getActiveAccountId();
        const active = activeId
          ? accounts.find(function (a) { return a.userId === activeId; })
          : accounts[0];
        if (active) {
          await this.doLogin(active.token);
        } else {
          await this.doLogin(accounts[0].token);
        }
      } else {
        // Migrate from single-token storage
        const token = await getToken();
        if (token) {
          await this.doLogin(token);
        } else {
          this.setState({ initializing: false });
        }
      }
    } catch (err) {
      this.setState({ initializing: false });
    }
  }

  async doLogin(token) {
    const slack = new SlackAPI(token);
    let auth;
    try {
      auth = await slack.authTest();
    } catch (err) {
      this.setState({ initializing: false });
      throw new Error(err.message || 'Authentication failed');
    }

    if (!auth || !auth.user_id) {
      this.setState({ initializing: false });
      throw new Error('Invalid authentication response');
    }

    try {
      await saveToken(token);
    } catch (err) {
      // Token save failed but login can continue
    }

    // Save to accounts list
    const self = this;
    const accounts = this.state.accounts.slice();
    const existingIdx = accounts.findIndex(function (a) { return a.userId === auth.user_id; });
    const accountEntry = {
      token: token,
      teamName: auth.team || '',
      teamId: auth.team_id || '',
      userId: auth.user_id,
      userName: auth.user || '',
      teamIcon: '',
    };
    if (existingIdx >= 0) {
      accounts[existingIdx] = Object.assign({}, accounts[existingIdx], accountEntry);
    } else {
      accounts.push(accountEntry);
    }

    try {
      await saveAccounts(accounts);
      await saveActiveAccountId(auth.user_id);
    } catch (err) {}

    this.setState({
      slack: slack,
      currentUser: auth.user_id,
      teamName: auth.team || '',
      stack: [{ screen: 'channelList', params: {} }],
      initializing: false,
      accounts: accounts,
    });

    this.loadUsers(slack);
    this.loadChannels(slack);
    this.loadTeamInfo(slack);
    this._loadNotifSettings();
  }

  async loadTeamInfo(slack) {
    try {
      const res = await slack.teamInfo();
      const icon = res.team && res.team.icon ? res.team.icon.image_68 || res.team.icon.image_44 || '' : '';
      this.setState({ teamIcon: icon });
      // Update account's teamIcon
      const self = this;
      const accounts = this.state.accounts.slice();
      const idx = accounts.findIndex(function (a) { return a.userId === self.state.currentUser; });
      if (idx >= 0 && accounts[idx].teamIcon !== icon) {
        accounts[idx] = Object.assign({}, accounts[idx], { teamIcon: icon });
        this.setState({ accounts: accounts });
        try { await saveAccounts(accounts); } catch (e) {}
      }
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
    } catch (err) {
      this.setState({ channelsLoading: false });
    }
  }

  async handleLogout() {
    this._stopNotifPolling();
    const currentUserId = this.state.currentUser;
    const accounts = this.state.accounts.filter(function (a) { return a.userId !== currentUserId; });
    try {
      await saveAccounts(accounts);
    } catch (e) {}

    if (accounts.length > 0) {
      // Switch to next account
      this.setState({ accounts: accounts });
      try {
        await this.switchAccount(accounts[0]);
      } catch (err) {
        await clearToken();
        this.setState({
          slack: null,
          currentUser: null,
          teamName: '',
          teamIcon: '',
          usersMap: {},
          channels: [],
          accounts: accounts,
          stack: [{ screen: 'login', params: {} }],
        });
      }
    } else {
      await clearToken();
      this.setState({
        slack: null,
        currentUser: null,
        teamName: '',
        teamIcon: '',
        usersMap: {},
        channels: [],
        accounts: [],
        stack: [{ screen: 'login', params: {} }],
      });
    }
  }

  async switchAccount(account) {
    this._stopNotifPolling();
    this.setState({
      slack: null,
      currentUser: null,
      teamName: '',
      teamIcon: '',
      usersMap: {},
      channels: [],
      channelsLoading: false,
      initializing: true,
    });
    await this.doLogin(account.token);
  }

  handleAddAccount() {
    this.navigate('login', { addingAccount: true });
  }

  async handleRemoveAccount(account) {
    const accounts = this.state.accounts.filter(function (a) { return a.userId !== account.userId; });
    try {
      await saveAccounts(accounts);
    } catch (e) {}
    this.setState({ accounts: accounts });
  }

  _handleAppState(state) {
    if (state === 'active') {
      if (this.state.notifEnabled) this._startNotifPolling();
    } else if (state === 'background') {
      this._stopNotifPolling();
    }
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
    } else {
      this._stopNotifPolling();
    }
  }

  async _handleChangeInterval(ms) {
    await saveNotifInterval(ms);
    this.setState({ notifInterval: ms });
    this._startNotifPolling();
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
    const { slack, currentUser, channels: oldChannels } = this.state;
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

      // Build old unread map
      const oldUnreadMap = {};
      for (let i = 0; i < oldChannels.length; i++) {
        oldUnreadMap[oldChannels[i].id] = oldChannels[i].unread_count_display || 0;
      }

      const currentChId = this._getCurrentChannelId();
      let hasNewUnread = false;

      for (let i = 0; i < allChannels.length; i++) {
        const ch = allChannels[i];
        const oldCount = oldUnreadMap[ch.id] || 0;
        const newCount = ch.unread_count_display || 0;
        if (newCount > oldCount && ch.id !== currentChId) {
          hasNewUnread = true;
          break;
        }
      }

      if (hasNewUnread) {
        playNotification();
      }

      // Only update state if unread counts actually changed
      let unreadChanged = allChannels.length !== oldChannels.length || hasNewUnread;
      if (!unreadChanged) {
        for (let u = 0; u < allChannels.length; u++) {
          if ((allChannels[u].unread_count_display || 0) !== (oldUnreadMap[allChannels[u].id] || 0)) {
            unreadChanged = true;
            break;
          }
        }
      }
      if (unreadChanged) this.setState({ channels: allChannels });
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
    const { stack, slack, currentUser, usersMap, channels, channelsLoading, teamName, teamIcon } = this.state;
    const current = stack[stack.length - 1];
    const screen = current.screen;
    const params = current.params || {};
    const self = this;

    switch (screen) {
      case 'login':
        return (
          <LoginScreen
            onLogin={function (token) { return self.doLogin(token); }}
            onBack={params.addingAccount ? function () { self.goBack(); } : null}
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
            teamIcon={teamIcon}
            accounts={this.state.accounts}
            activeAccountId={currentUser}
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
            onSwitchAccount={function (account) {
              self.switchAccount(account);
            }}
            onAddAccount={function () {
              self.handleAddAccount();
            }}
            onRemoveAccount={function (account) {
              self.handleRemoveAccount(account);
            }}
          />
        );

      case 'chat':
        if (!params.channel) { self.goBack(); return null; }
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
        if (!params.parentMessage || !params.channel) { self.goBack(); return null; }
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
