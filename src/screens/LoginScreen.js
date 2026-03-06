import React, { Component } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';

export default class LoginScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      token: '',
      loading: false,
      error: null,
    };
  }

  async handleLogin() {
    var token = this.state.token.trim();
    if (!token) return;

    this.setState({ loading: true, error: null });
    try {
      await this.props.onLogin(token);
    } catch (err) {
      this.setState({ loading: false, error: err.message || 'Invalid token' });
    }
  }

  render() {
    var { token, loading, error } = this.state;
    var self = this;

    return (
      <View style={styles.container}>
        <Text style={styles.logo}>BB Slack</Text>
        <Text style={styles.subtitle}>Slack client for BlackBerry 10</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Slack Token</Text>
          <Text style={styles.hint}>
            Get your token from your Slack workspace settings.
            Use a User OAuth Token (xoxp-...) or Bot Token (xoxb-...).
          </Text>
          <TextInput
            style={styles.input}
            placeholder="xoxp-... or xoxb-..."
            placeholderTextColor="#696969"
            value={token}
            onChangeText={function (t) { self.setState({ token: t }); }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={function () { self.handleLogin(); }}
          />
          <TouchableOpacity
            style={[styles.button, !token.trim() && styles.buttonDisabled]}
            onPress={function () { self.handleLogin(); }}
            disabled={loading || !token.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Text style={styles.footer}>
          Your token is stored locally on this device only.
        </Text>
      </View>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1D21',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#ABABAD',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 40,
  },
  form: {},
  label: {
    fontSize: 14,
    color: '#D1D2D3',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#ABABAD',
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#222529',
    color: '#D1D2D3',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#565856',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4A154B',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: '#E01E5A',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    color: '#696969',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 30,
  },
});
