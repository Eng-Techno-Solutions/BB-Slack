import React, { Component } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import SlackAPI from './api/slack';
import { saveToken, getToken, clearToken, saveTheme, getTheme } from './utils/storage';
import { getColors, getMode, setMode } from './theme';
import LoginScreen from './screens/LoginScreen';
import ChannelListScreen from './screens/ChannelListScreen';
import ChatScreen from './screens/ChatScreen';
import ThreadScreen from './screens/ThreadScreen';
import SearchScreen from './screens/SearchScreen';
import ChannelInfoScreen from './screens/ChannelInfoScreen';
import ProfileScreen from './screens/ProfileScreen';
import { playNotification } from './utils/notificationSound';

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
    };
  }

  componentDidMount() {
    this.loadTheme();
    this.tryAutoLogin();
  }

  componentWillUnmount() {
    this.stopChannelPolling();
  }

  async loadTheme() {
    try {
      var mode = await getTheme();
      setMode(mode);
      this.setState({ themeMode: mode });
    } catch (err) {
      // Default dark
    }
  }

  toggleTheme() {
    var newMode = getMode() === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    this.setState({ themeMode: newMode });
    saveTheme(newMode);
  }

  async tryAutoLogin() {
    try {
      var token = await getToken();
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
    var slack = new SlackAPI(token);
    var auth = await slack.authTest();

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
    var self = this;
    this._channelPollTimer = setInterval(function () {
      self.loadChannels(slack);
    }, 60000);
  }

  stopChannelPolling() {
    if (this._channelPollTimer) {
      clearInterval(this._channelPollTimer);
      this._channelPollTimer = null;
    }
  }

  async loadTeamInfo(slack) {
    try {
      var res = await slack.teamInfo();
      var icon = res.team && res.team.icon ? res.team.icon.image_68 || res.team.icon.image_44 || '' : '';
      this.setState({ teamIcon: icon });
    } catch (err) {
      console.warn('loadTeamInfo error:', err.message);
    }
  }

  async loadUsers(slack) {
    try {
      var usersMap = {};
      var cursor = '';
      do {
        var res = await slack.usersList(cursor || undefined, 200);
        var members = res.members || [];
        for (var i = 0; i < members.length; i++) {
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
    var isFirstLoad = this.state.channels.length === 0;
    var oldChannels = this.state.channels;
    if (isFirstLoad) this.setState({ channelsLoading: true });
    try {
      var allChannels = [];
      var cursor = '';
      do {
        var res = await slack.conversationsList(
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
        var oldUnreadMap = {};
        for (var i = 0; i < oldChannels.length; i++) {
          oldUnreadMap[oldChannels[i].id] = oldChannels[i].unread_count_display || 0;
        }

        var stack = this.state.stack;
        var currentScreen = stack[stack.length - 1];
        var activeChannelId = (currentScreen.screen === 'chat' && currentScreen.params.channel)
          ? currentScreen.params.channel.id
          : null;

        var hasNewUnread = false;
        for (var j = 0; j < allChannels.length; j++) {
          var ch = allChannels[j];
          var oldCount = oldUnreadMap[ch.id] || 0;
          var newCount = ch.unread_count_display || 0;
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
      var newStack = prev.stack.slice(0, -1);
      newStack.push({ screen: screen, params: params || {} });
      return { stack: newStack };
    });
  }

  renderScreen() {
    var { stack, slack, currentUser, usersMap, channels, channelsLoading, teamName, teamIcon } = this.state;
    var current = stack[stack.length - 1];
    var screen = current.screen;
    var params = current.params || {};
    var self = this;

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
            onToggleTheme={function () {
              self.toggleTheme();
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
              // Try to navigate to the channel
              if (msg.channel && msg.channel.id) {
                var ch = channels.find(function (c) { return c.id === msg.channel.id; });
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
    var colors = getColors();

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

var styles = StyleSheet.create({
  app: {
    flex: 1,
  },
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
