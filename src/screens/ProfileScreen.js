import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import Header from '../components/Header';

export default class ProfileScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      loading: true,
    };
  }

  componentDidMount() {
    this.loadUser();
  }

  async loadUser() {
    var { slack, userId, usersMap } = this.props;

    if (usersMap[userId]) {
      this.setState({ user: usersMap[userId], loading: false });
      return;
    }

    try {
      var res = await slack.usersInfo(userId);
      this.setState({ user: res.user, loading: false });
    } catch (err) {
      this.setState({ loading: false });
      Alert.alert('Error', err.message);
    }
  }

  async openDM() {
    var { slack, userId, onOpenDM } = this.props;
    try {
      var res = await slack.conversationsOpen(userId);
      if (res.channel && onOpenDM) {
        onOpenDM(res.channel);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  render() {
    var { onBack, currentUserId, userId } = this.props;
    var { user, loading } = this.state;
    var self = this;

    if (loading) {
      return (
        <View style={styles.container}>
          <Header title="Profile" onBack={onBack} />
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1264A3" />
          </View>
        </View>
      );
    }

    if (!user) {
      return (
        <View style={styles.container}>
          <Header title="Profile" onBack={onBack} />
          <View style={styles.center}>
            <Text style={styles.errorText}>User not found</Text>
          </View>
        </View>
      );
    }

    var displayName = user.profile && user.profile.display_name
      ? user.profile.display_name
      : user.real_name || user.name;
    var realName = user.real_name || '';
    var title = user.profile && user.profile.title ? user.profile.title : '';
    var status = user.profile && user.profile.status_text ? user.profile.status_text : '';
    var email = user.profile && user.profile.email ? user.profile.email : '';
    var phone = user.profile && user.profile.phone ? user.profile.phone : '';
    var tz = user.tz_label || user.tz || '';
    var isBot = user.is_bot;
    var isOwn = userId === currentUserId;

    return (
      <View style={styles.container}>
        <Header title="Profile" onBack={onBack} />
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(displayName || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          {realName && realName !== displayName ? (
            <Text style={styles.realName}>{realName}</Text>
          ) : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {status ? <Text style={styles.status}>{status}</Text> : null}
          {isBot ? <Text style={styles.botBadge}>BOT</Text> : null}
        </View>

        <View style={styles.detailsSection}>
          {email ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{email}</Text>
            </View>
          ) : null}
          {phone ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{phone}</Text>
            </View>
          ) : null}
          {tz ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Timezone</Text>
              <Text style={styles.detailValue}>{tz}</Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Username</Text>
            <Text style={styles.detailValue}>@{user.name}</Text>
          </View>
        </View>

        {!isOwn ? (
          <TouchableOpacity
            style={styles.dmButton}
            onPress={function () { self.openDM(); }}
          >
            <Text style={styles.dmButtonText}>Message</Text>
          </TouchableOpacity>
        ) : null}
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
  errorText: {
    color: '#E01E5A',
    fontSize: 14,
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#4A154B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  displayName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  realName: {
    color: '#D1D2D3',
    fontSize: 15,
    marginTop: 2,
  },
  title: {
    color: '#ABABAD',
    fontSize: 14,
    marginTop: 4,
  },
  status: {
    color: '#D1D2D3',
    fontSize: 14,
    marginTop: 4,
  },
  botBadge: {
    color: '#D1D2D3',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 6,
    backgroundColor: '#222529',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  detailsSection: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
  },
  detailLabel: {
    color: '#ABABAD',
    fontSize: 14,
  },
  detailValue: {
    color: '#D1D2D3',
    fontSize: 14,
  },
  dmButton: {
    margin: 16,
    backgroundColor: '#007A5A',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  dmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
