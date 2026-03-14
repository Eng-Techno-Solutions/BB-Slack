import React, { Component } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableHighlight,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { getColors } from '../theme';
import { request } from '../api/http';
import { addKeyEventListener, removeKeyEventListener } from '../utils/keyEvents';
import Icon from '../components/Icon';

const SLACK_API = Platform.OS === 'web' ? '/slack-api/' : 'https://slack.com/api/';

export default class LoginScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'email', // 'email' or 'token'
      // Email mode fields
      workspace: '',
      email: '',
      password: '',
      // 2FA fields
      needsPin: false,
      pin: '',
      _teamId: '',
      // Token mode fields
      token: '',
      // Shared state
      loading: false,
      error: null,
      focusIndex: -1,
    };
    this._keySub = null;
    this._inputRefs = {};
    this._scrollView = null;
    this._scrollY = 0;
  }

  componentDidMount() {
    const self = this;
    this._keySub = addKeyEventListener(function (e) {
      self._handleKeyEvent(e);
    });
  }

  componentWillUnmount() {
    removeKeyEventListener(this._keySub);
  }

  _getFields() {
    const { mode, needsPin } = this.state;
    if (mode === 'email' && needsPin) {
      return ['pin', 'verify', 'pinBack'];
    }
    if (mode === 'email') {
      return ['emailTab', 'tokenTab', 'workspace', 'email', 'password', 'signin'];
    }
    return ['emailTab', 'tokenTab', 'token', 'signin', 'openApps'];
  }

  _handleKeyEvent(e) {
    const action = e.action;
    const fields = this._getFields();
    const idx = this.state.focusIndex;

    if (action === 'down') {
      const next = Math.min(idx + 1, fields.length - 1);
      this.setState({ focusIndex: next });
      this._focusField(fields[next]);
      this._scrollToField(fields[next]);
    } else if (action === 'up') {
      const prev = Math.max(idx - 1, 0);
      this.setState({ focusIndex: prev });
      this._focusField(fields[prev]);
      this._scrollToField(fields[prev]);
    } else if (action === 'select') {
      if (idx >= 0 && idx < fields.length) {
        this._activateField(fields[idx]);
      }
    }
  }

  _focusField(field) {
    const ref = this._inputRefs[field];
    if (ref && ref.focus) ref.focus();
  }

  _scrollToField(field) {
    const ref = this._inputRefs[field];
    if (!ref || !this._scrollView) return;
    const sv = this._scrollView;
    const scrollY = this._scrollY;
    ref.measure(function (fx, fy, w, h, px, py) {
      if (py === undefined) return;
      const target = Math.max(0, scrollY + py - 120);
      sv.scrollTo({ y: target, animated: true });
    });
  }

  _activateField(field) {
    const self = this;
    if (field === 'emailTab') this.setState({ mode: 'email', error: null, focusIndex: 0 });
    else if (field === 'tokenTab') this.setState({ mode: 'token', error: null, focusIndex: 0 });
    else if (field === 'signin') {
      if (this.state.mode === 'email') this.handleEmailLogin();
      else this.handleTokenLogin();
    }
    else if (field === 'verify') this.handlePinSubmit();
    else if (field === 'pinBack') this.setState({ needsPin: false, pin: '', error: null, focusIndex: -1 });
    else if (field === 'openApps') Linking.openURL('https://api.slack.com/apps');
  }

  async handleEmailLogin() {
    let { workspace, email, password } = this.state;
    workspace = workspace.trim().toLowerCase().replace(/\.slack\.com$/, '');
    email = email.trim();
    if (!workspace || !email || !password) return;

    this.setState({ loading: true, error: null });
    try {
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

      // Step 1: Find the team to verify it exists
      const findBody = 'domain=' + encodeURIComponent(workspace);
      const findRes = await request('POST', SLACK_API + 'auth.findTeam', headers, findBody);
      const findData = JSON.parse(findRes.body);

      if (!findData.ok) {
        throw new Error('Workspace "' + workspace + '" not found. Check the workspace name.');
      }

      const teamId = findData.team_id;

      // Step 2: Sign in with email + password
      const signinData = await this._callSignin(headers, teamId, email, password, '');

      if (!signinData.ok) {
        const errCode = signinData.error || 'Login failed';
        // 2FA required — show PIN input
        if (errCode === 'missing_pin_app_sms' || errCode === 'missing_pin' ||
            errCode === 'two_factor_setup_required' || errCode === 'two_factor_required') {
          this.setState({ loading: false, needsPin: true, _teamId: teamId, error: null });
          return;
        }
        let errMsg = errCode;
        if (errMsg === 'invalid_auth' || errMsg === 'invalid_password') {
          errMsg = 'Invalid email or password.';
        } else if (errMsg === 'ratelimited') {
          errMsg = 'Too many attempts. Please wait and try again.';
        } else if (errMsg === 'team_login_method_not_supported' || errMsg === 'sso_required') {
          errMsg = 'This workspace requires SSO login. Please use the Token method instead.';
        }
        throw new Error(errMsg);
      }

      const token = signinData.token;
      if (!token) {
        throw new Error('No token received. Please use the Token method instead.');
      }

      await this.props.onLogin(token);
    } catch (err) {
      this.setState({ loading: false, error: err.message || 'Login failed' });
    }
  }

  async _callSignin(headers, teamId, email, password, pin) {
    let signinBody = 'team=' + encodeURIComponent(teamId) +
      '&email=' + encodeURIComponent(email) +
      '&password=' + encodeURIComponent(password);
    if (pin) {
      signinBody += '&pin=' + encodeURIComponent(pin);
    }
    const signinRes = await request('POST', SLACK_API + 'auth.signin', headers, signinBody);
    return JSON.parse(signinRes.body);
  }

  async handlePinSubmit() {
    let { pin, _teamId, email, password } = this.state;
    pin = pin.trim();
    if (!pin || !_teamId) return;

    this.setState({ loading: true, error: null });
    try {
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      const data = await this._callSignin(headers, _teamId, email.trim(), password, pin);

      if (!data.ok) {
        let errMsg = data.error || 'Verification failed';
        if (errMsg === 'invalid_pin' || errMsg === 'missing_pin_app_sms' || errMsg === 'missing_pin') {
          errMsg = 'Invalid code. Please try again.';
        } else if (errMsg === 'ratelimited') {
          errMsg = 'Too many attempts. Please wait and try again.';
        }
        throw new Error(errMsg);
      }

      const token = data.token;
      if (!token) {
        throw new Error('No token received. Please use the Token method instead.');
      }

      await this.props.onLogin(token);
    } catch (err) {
      this.setState({ loading: false, error: err.message || 'Verification failed' });
    }
  }

  async handleTokenLogin() {
    const token = this.state.token.trim();
    if (!token) return;

    this.setState({ loading: true, error: null });
    try {
      await this.props.onLogin(token);
    } catch (err) {
      this.setState({ loading: false, error: err.message || 'Invalid token' });
    }
  }

  openTokenPage() {
    Linking.openURL('https://api.slack.com/apps');
  }

  render() {
    const { mode, workspace, email, password, token, loading, error, needsPin, pin, focusIndex } = this.state;
    const self = this;
    const c = getColors();
    const fields = this._getFields();

    return (
      <ScrollView
        ref={function (r) { self._scrollView = r; }}
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        onScroll={function (e) { self._scrollY = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        {this.props.onBack ? (
          <TouchableHighlight
            style={styles.backBtn}
            underlayColor={c.listUnderlay}
            onPress={this.props.onBack}
            data-type="icon-btn"
          >
            <View style={styles.backBtnInner}>
              <Icon name="chevron-left" size={20} color={c.textTertiary} />
              <Text style={[styles.backBtnText, { color: c.textTertiary }]}>Back</Text>
            </View>
          </TouchableHighlight>
        ) : null}
        <Text style={[styles.logo, { color: c.textPrimary }]}>BB Slack</Text>
        <Text style={[styles.subtitle, { color: c.textTertiary }]}>Slack client for BlackBerry</Text>

        {/* Mode tabs */}
        {!needsPin ? <View style={styles.tabs}>
          <TouchableHighlight
            ref={function (r) { self._inputRefs.emailTab = r; }}
            style={[
              styles.tab,
              { borderColor: c.border },
              mode === 'email' && { backgroundColor: c.purple, borderColor: c.purple },
              focusIndex === fields.indexOf('emailTab') && { borderColor: c.accent, borderWidth: 2 },
            ]}
            underlayColor={c.purple}
            onPress={function () { self.setState({ mode: 'email', error: null }); }}
            data-type="btn"
          >
            <Text style={[
              styles.tabText,
              { color: c.textSecondary },
              mode === 'email' && { color: '#ffffff' },
            ]}>Email</Text>
          </TouchableHighlight>
          <TouchableHighlight
            ref={function (r) { self._inputRefs.tokenTab = r; }}
            style={[
              styles.tab,
              { borderColor: c.border },
              mode === 'token' && { backgroundColor: c.purple, borderColor: c.purple },
              focusIndex === fields.indexOf('tokenTab') && { borderColor: c.accent, borderWidth: 2 },
            ]}
            underlayColor={c.purple}
            onPress={function () { self.setState({ mode: 'token', error: null }); }}
            data-type="btn"
          >
            <Text style={[
              styles.tabText,
              { color: c.textSecondary },
              mode === 'token' && { color: '#ffffff' },
            ]}>Token</Text>
          </TouchableHighlight>
        </View> : null}

        {/* Email mode */}
        {mode === 'email' && !needsPin ? (
          <View style={styles.form}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Workspace</Text>
            <View style={styles.workspaceRow}>
              <TextInput
                ref={function (r) { self._inputRefs.workspace = r; }}
                style={[styles.input, styles.workspaceInput, { backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: focusIndex === fields.indexOf('workspace') ? c.accent : c.borderInput }]}
                placeholder="your-team"
                placeholderTextColor={c.textPlaceholder}
                value={workspace}
                onChangeText={function (t) { self.setState({ workspace: t }); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                data-type="input"
              />
              <Text style={[styles.workspaceSuffix, { color: c.textTertiary }]}>.slack.com</Text>
            </View>

            <Text style={[styles.label, { color: c.textSecondary }]}>Email</Text>
            <TextInput
              ref={function (r) { self._inputRefs.email = r; }}
              style={[styles.input, { backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: focusIndex === fields.indexOf('email') ? c.accent : c.borderInput }]}
              placeholder="you@example.com"
              placeholderTextColor={c.textPlaceholder}
              value={email}
              onChangeText={function (t) { self.setState({ email: t }); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              data-type="input"
            />

            <Text style={[styles.label, { color: c.textSecondary }]}>Password</Text>
            <TextInput
              ref={function (r) { self._inputRefs.password = r; }}
              style={[styles.input, { backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: focusIndex === fields.indexOf('password') ? c.accent : c.borderInput }]}
              placeholder="Password"
              placeholderTextColor={c.textPlaceholder}
              value={password}
              onChangeText={function (t) { self.setState({ password: t }); }}
              secureTextEntry={true}
              returnKeyType="done"
              onSubmitEditing={function () { self.handleEmailLogin(); }}
              data-type="input"
            />

            <TouchableHighlight
              ref={function (r) { self._inputRefs.signin = r; }}
              style={[styles.button, { backgroundColor: c.purple }, (!workspace.trim() || !email.trim() || !password) && styles.buttonDisabled, focusIndex === fields.indexOf('signin') && styles.buttonFocused]}
              underlayColor="#3a1d6e"
              onPress={function () { self.handleEmailLogin(); }}
              disabled={loading || !workspace.trim() || !email.trim() || !password}
              data-type="btn"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableHighlight>

            <Text style={[styles.hint, { color: c.textTertiary, marginTop: 12 }]}>
              Sign in with your Slack workspace credentials.
              If your workspace uses SSO, use the Token method instead.
            </Text>
          </View>
        ) : null}

        {/* 2FA PIN mode */}
        {mode === 'email' && needsPin ? (
          <View style={styles.form}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Two-Factor Authentication</Text>
            <Text style={[styles.hint, { color: c.textTertiary, marginBottom: 14 }]}>
              Enter the 6-digit code from your authenticator app or SMS.
            </Text>
            <TextInput
              ref={function (r) { self._inputRefs.pin = r; }}
              style={[styles.input, { backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: focusIndex === fields.indexOf('pin') ? c.accent : c.borderInput, textAlign: 'center', fontSize: 20, letterSpacing: 8 }]}
              placeholder="000000"
              placeholderTextColor={c.textPlaceholder}
              value={pin}
              onChangeText={function (t) { self.setState({ pin: t.replace(/[^0-9]/g, '').slice(0, 6) }); }}
              keyboardType="numeric"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={function () { self.handlePinSubmit(); }}
              data-type="input"
            />

            <TouchableHighlight
              ref={function (r) { self._inputRefs.verify = r; }}
              style={[styles.button, { backgroundColor: c.purple }, pin.trim().length < 6 && styles.buttonDisabled, focusIndex === fields.indexOf('verify') && styles.buttonFocused]}
              underlayColor="#3a1d6e"
              onPress={function () { self.handlePinSubmit(); }}
              disabled={loading || pin.trim().length < 6}
              data-type="btn"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableHighlight>

            <TouchableHighlight
              ref={function (r) { self._inputRefs.pinBack = r; }}
              style={[styles.linkButton, { borderColor: c.border, marginTop: 12 }, focusIndex === fields.indexOf('pinBack') && { borderColor: c.accent }]}
              underlayColor={c.bgTertiary}
              onPress={function () { self.setState({ needsPin: false, pin: '', error: null }); }}
              data-type="btn"
            >
              <Text style={[styles.linkButtonText, { color: c.textSecondary }]}>Back</Text>
            </TouchableHighlight>
          </View>
        ) : null}

        {/* Token mode */}
        {mode === 'token' ? (
          <View style={styles.form}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Slack Token</Text>
            <TextInput
              ref={function (r) { self._inputRefs.token = r; }}
              style={[styles.input, { backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: focusIndex === fields.indexOf('token') ? c.accent : c.borderInput }]}
              placeholder="xoxp-... or xoxb-..."
              placeholderTextColor={c.textPlaceholder}
              value={token}
              onChangeText={function (t) { self.setState({ token: t }); }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={function () { self.handleTokenLogin(); }}
              data-type="input"
            />

            <TouchableHighlight
              ref={function (r) { if (self.state.mode === 'token') self._inputRefs.signin = r; }}
              style={[styles.button, { backgroundColor: c.purple }, !token.trim() && styles.buttonDisabled, focusIndex === fields.indexOf('signin') && styles.buttonFocused]}
              underlayColor="#3a1d6e"
              onPress={function () { self.handleTokenLogin(); }}
              disabled={loading || !token.trim()}
              data-type="btn"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableHighlight>

            {/* Instructions */}
            <View style={[styles.instructions, { borderColor: c.border }]}>
              <Text style={[styles.instructionsTitle, { color: c.textSecondary }]}>How to get your token:</Text>
              <Text style={[styles.step, { color: c.textTertiary }]}>1. Go to api.slack.com/apps</Text>
              <Text style={[styles.step, { color: c.textTertiary }]}>2. Create a new app (or select existing)</Text>
              <Text style={[styles.step, { color: c.textTertiary }]}>3. Go to "OAuth & Permissions"</Text>
              <Text style={[styles.step, { color: c.textTertiary }]}>4. Add scopes: channels:read, channels:history, chat:write, users:read, files:read, search:read, reactions:write, pins:write, stars:write, team:read, groups:read, groups:history, im:read, im:history, mpim:read, mpim:history</Text>
              <Text style={[styles.step, { color: c.textTertiary }]}>5. Install the app to your workspace</Text>
              <Text style={[styles.step, { color: c.textTertiary }]}>6. Copy the "User OAuth Token" (xoxp-...)</Text>

              <TouchableHighlight
                ref={function (r) { self._inputRefs.openApps = r; }}
                style={[styles.linkButton, { borderColor: c.purple }, focusIndex === fields.indexOf('openApps') && { borderColor: c.accent, borderWidth: 2 }]}
                underlayColor={c.bgTertiary}
                onPress={function () { self.openTokenPage(); }}
                data-type="btn"
              >
                <Text style={[styles.linkButtonText, { color: c.purple }]}>Open Slack Apps Page</Text>
              </TouchableHighlight>
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={[styles.footer, { color: c.textPlaceholder }]}>
          Your credentials are sent directly to Slack and stored locally on this device only.
        </Text>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
    minHeight: '100%',
  },
  backBtn: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    marginBottom: 12,
  },
  backBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  backBtnText: {
    fontSize: 15,
    marginLeft: 4,
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
    marginBottom: 24,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  form: {},
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  workspaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  workspaceInput: {
    flex: 1,
    marginBottom: 0,
  },
  workspaceSuffix: {
    fontSize: 14,
    marginLeft: 8,
  },
  input: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 14,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonFocused: {
    borderWidth: 2,
    borderColor: '#1264A3',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
  },
  instructions: {
    marginTop: 20,
    padding: 14,
    borderWidth: 1,
    borderRadius: 4,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  step: {
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 4,
  },
  linkButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 14,
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
    marginTop: 24,
  },
});
