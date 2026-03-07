import React, { Component } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  BackHandler,
} from 'react-native';
import SlackAPI from './src/api/slack';
import { saveToken, getToken, clearToken } from './src/utils/storage';
import LoginScreen from './src/screens/LoginScreen';
import ChannelListScreen from './src/screens/ChannelListScreen';
import ChatScreen from './src/screens/ChatScreen';
import ThreadScreen from './src/screens/ThreadScreen';
import SearchScreen from './src/screens/SearchScreen';
import ChannelInfoScreen from './src/screens/ChannelInfoScreen';
import ProfileScreen from './src/screens/ProfileScreen';

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
    };
  }

  componentDidMount() {
    this.tryAutoLogin();
    var self = this;
    this._backHandler = BackHandler.addEventListener('hardwareBackPress', function () {
      if (self.state.stack.length > 1) {
        self.goBack();
        return true;
      }
      return false;
    });
  }

  componentWillUnmount() {
    if (this._backHandler) {
      this._backHandler.remove();
    }
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
    this.loadUsers(slack);
    this.loadChannels(slack);
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
    this.setState({ channelsLoading: true });
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

      this.setState({ channels: allChannels, channelsLoading: false });
    } catch (err) {
      this.setState({ channelsLoading: false });
    }
  }

  async handleLogout() {
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
    var { stack, slack, currentUser, usersMap, channels, channelsLoading, teamName } = this.state;
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
            onSelect={function (ch) {
              self.navigate('chat', { channel: ch });
            }}
            onSearch={function () {
              self.navigate('search');
            }}
            onLogout={function () {
              self.handleLogout();
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

var styles = StyleSheet.create({
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
