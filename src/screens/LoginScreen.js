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
import { getColors } from '../theme';

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
    var c = getColors();

    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <Text style={[styles.logo, { color: c.textPrimary }]}>BB Slack</Text>
        <Text style={[styles.subtitle, { color: c.textTertiary }]}>Slack client for BlackBerry 10</Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: c.textSecondary }]}>Slack Token</Text>
          <Text style={[styles.hint, { color: c.textTertiary }]}>
            Get your token from your Slack workspace settings.
            Use a User OAuth Token (xoxp-...) or Bot Token (xoxb-...).
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: c.borderInput }]}
            placeholder="xoxp-... or xoxb-..."
            placeholderTextColor={c.textPlaceholder}
            value={token}
            onChangeText={function (t) { self.setState({ token: t }); }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={function () { self.handleLogin(); }}
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: c.purple }, !token.trim() && styles.buttonDisabled]}
            onPress={function () { self.handleLogin(); }}
            disabled={loading || !token.trim()}
            data-type="btn"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Text style={[styles.footer, { color: c.textPlaceholder }]}>
          Your token is stored locally on this device only.
        </Text>
      </View>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 40,
  },
  form: {},
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 16,
  },
  button: {
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
    fontSize: 11,
    textAlign: 'center',
    marginTop: 30,
  },
});
