import { Icon } from "../components";
import {
	findTeam,
	isMfaRequired,
	mapPinError,
	mapSigninError,
	signin
} from "../services/authService";
import { getColors } from "../theme";
import type { KeyEvent, KeySub } from "../types";
import { API } from "../utils/constants";
import { errorMessage } from "../utils/error";
import { addKeyEventListener, removeKeyEventListener } from "../utils/keyEvents";
import { setMouseEnabled } from "../utils/pointer";
import { styles } from "./LoginScreen.styles";
import type { FieldName, FocusableRef, LoginProps as Props, LoginState as State } from "./types";
import React, { Component } from "react";
import {
	ActivityIndicator,
	Linking,
	ScrollView,
	Text,
	TextInput,
	TouchableHighlight,
	View
} from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

export default class LoginScreen extends Component<Props, State> {
	_keySub: KeySub | null;
	_inputRefs: Record<string, FocusableRef | null>;
	_scrollView: ScrollView | null;
	_scrollY: number;

	constructor(props: Props) {
		super(props);
		this.state = {
			mode: "email",
			workspace: "",
			email: "",
			password: "",
			needsPin: false,
			pin: "",
			_teamId: "",
			token: "",
			loading: false,
			error: null,
			focusIndex: -1
		};
		this._keySub = null;
		this._inputRefs = {};
		this._scrollView = null;
		this._scrollY = 0;
	}

	componentDidMount(): void {
		const self = this;
		this._keySub = addKeyEventListener(function (e: KeyEvent) {
			self._handleKeyEvent(e);
		});
		// Auth screen is hardware D-pad only — disable the BlackBerry trackpad
		// cursor so pointer input can't fight the focus-index navigation.
		setMouseEnabled(false);
	}

	componentWillUnmount(): void {
		removeKeyEventListener(this._keySub);
		setMouseEnabled(true);
	}

	_getFields(): FieldName[] {
		const { mode, needsPin } = this.state;
		if (mode === "email" && needsPin) {
			return ["pin", "verify", "pinBack"];
		}
		if (mode === "email") {
			return ["emailTab", "tokenTab", "workspace", "email", "password", "signin"];
		}
		return ["emailTab", "tokenTab", "token", "signin", "openApps"];
	}

	_handleKeyEvent(e: KeyEvent): void {
		const action = e.action;
		const fields = this._getFields();
		const idx = this.state.focusIndex;

		if (action === "down") {
			const next = Math.min(idx + 1, fields.length - 1);
			this.setState({ focusIndex: next });
			this._focusField(fields[next]);
			this._scrollToField(fields[next]);
		} else if (action === "up") {
			const prev = Math.max(idx - 1, 0);
			this.setState({ focusIndex: prev });
			this._focusField(fields[prev]);
			this._scrollToField(fields[prev]);
		} else if (action === "select") {
			if (idx >= 0 && idx < fields.length) {
				this._activateField(fields[idx]);
			}
		}
	}

	_focusField(field: FieldName): void {
		const ref = this._inputRefs[field];
		if (ref && ref.focus) ref.focus();
	}

	_scrollToField(field: FieldName): void {
		const ref = this._inputRefs[field];
		if (!ref || !ref.measure || !this._scrollView) return;
		const sv = this._scrollView;
		const scrollY = this._scrollY;
		ref.measure(function (fx: number, fy: number, w: number, h: number, px: number, py: number) {
			if (py === undefined) return;
			const target = Math.max(0, scrollY + py - 120);
			sv.scrollTo({ y: target, animated: true });
		});
	}

	_activateField(field: FieldName): void {
		const _self = this;
		if (field === "emailTab") this.setState({ mode: "email", error: null, focusIndex: 0 });
		else if (field === "tokenTab") this.setState({ mode: "token", error: null, focusIndex: 0 });
		else if (field === "signin") {
			if (this.state.mode === "email") this.handleEmailLogin();
			else this.handleTokenLogin();
		} else if (field === "verify") this.handlePinSubmit();
		else if (field === "pinBack")
			this.setState({ needsPin: false, pin: "", error: null, focusIndex: -1 });
		else if (field === "openApps") Linking.openURL(API.SLACK_APPS_PAGE);
	}

	async handleEmailLogin(): Promise<void> {
		const { workspace, email, password } = this.state;
		const trimmedEmail = email.trim();
		if (!workspace.trim() || !trimmedEmail || !password) return;

		this.setState({ loading: true, error: null });
		try {
			const teamId = await findTeam(workspace);
			const signinData = await signin({ teamId, email: trimmedEmail, password, pin: "" });

			if (!signinData.ok) {
				const errCode = signinData.error || "Login failed";
				if (isMfaRequired(errCode)) {
					this.setState({ loading: false, needsPin: true, _teamId: teamId, error: null });
					return;
				}
				throw new Error(mapSigninError(errCode));
			}

			const token = signinData.token;
			if (!token) {
				throw new Error("No token received. Please use the Token method instead.");
			}

			await this.props.onLogin(token);
		} catch (err: unknown) {
			this.setState({ loading: false, error: errorMessage(err, "Login failed") });
		}
	}

	async handlePinSubmit(): Promise<void> {
		const { pin, _teamId, email, password } = this.state;
		const trimmedPin = pin.trim();
		if (!trimmedPin || !_teamId) return;

		this.setState({ loading: true, error: null });
		try {
			const data = await signin({
				teamId: _teamId,
				email: email.trim(),
				password,
				pin: trimmedPin
			});

			if (!data.ok) {
				throw new Error(mapPinError(data.error || "Verification failed"));
			}

			const token = data.token;
			if (!token) {
				throw new Error("No token received. Please use the Token method instead.");
			}

			await this.props.onLogin(token);
		} catch (err: unknown) {
			this.setState({ loading: false, error: errorMessage(err, "Verification failed") });
		}
	}

	async handleTokenLogin(): Promise<void> {
		const token = this.state.token.trim();
		if (!token) return;

		this.setState({ loading: true, error: null });
		try {
			await this.props.onLogin(token);
		} catch (err: unknown) {
			this.setState({ loading: false, error: errorMessage(err, "Invalid token") });
		}
	}

	openTokenPage(): void {
		Linking.openURL(API.SLACK_APPS_PAGE);
	}

	render(): React.ReactElement {
		const { mode, workspace, email, password, token, loading, error, needsPin, pin, focusIndex } =
			this.state;
		const self = this;
		const c = getColors();
		const fields = this._getFields();

		return (
			<ScrollView
				ref={function (r: ScrollView | null) {
					self._scrollView = r;
				}}
				style={{ flex: 1, backgroundColor: c.bg }}
				contentContainerStyle={styles.container}
				keyboardShouldPersistTaps="handled"
				onScroll={function (e: NativeSyntheticEvent<NativeScrollEvent>) {
					self._scrollY = e.nativeEvent.contentOffset.y;
				}}
				scrollEventThrottle={16}>
				{this.props.onBack ? (
					<TouchableHighlight
						style={styles.backBtn}
						underlayColor={c.listUnderlay}
						onPress={this.props.onBack}
						data-type="icon-btn">
						<View style={styles.backBtnInner}>
							<Icon
								name="chevron-left"
								size={20}
								color={c.textTertiary}
							/>
							<Text style={[styles.backBtnText, { color: c.textTertiary }]}>Back</Text>
						</View>
					</TouchableHighlight>
				) : null}
				<Text style={[styles.logo, { color: c.textPrimary }]}>BB Slack</Text>
				<Text style={[styles.subtitle, { color: c.textTertiary }]}>Slack client for BlackBerry</Text>

				{/* Mode tabs */}
				{!needsPin ? (
					<View style={styles.tabs}>
						<TouchableHighlight
							ref={function (r: FocusableRef | null) {
								self._inputRefs.emailTab = r;
							}}
							style={[
								styles.tab,
								{ borderColor: c.border },
								mode === "email" && { backgroundColor: c.purple, borderColor: c.purple },
								focusIndex === fields.indexOf("emailTab") && { borderColor: c.accent, borderWidth: 2 }
							]}
							underlayColor={c.purple}
							onPress={function () {
								self.setState({ mode: "email", error: null });
							}}
							data-type="btn">
							<Text
								style={[
									styles.tabText,
									{ color: c.textSecondary },
									mode === "email" && { color: "#ffffff" }
								]}>
								Email
							</Text>
						</TouchableHighlight>
						<TouchableHighlight
							ref={function (r: FocusableRef | null) {
								self._inputRefs.tokenTab = r;
							}}
							style={[
								styles.tab,
								{ borderColor: c.border },
								mode === "token" && { backgroundColor: c.purple, borderColor: c.purple },
								focusIndex === fields.indexOf("tokenTab") && { borderColor: c.accent, borderWidth: 2 }
							]}
							underlayColor={c.purple}
							onPress={function () {
								self.setState({ mode: "token", error: null });
							}}
							data-type="btn">
							<Text
								style={[
									styles.tabText,
									{ color: c.textSecondary },
									mode === "token" && { color: "#ffffff" }
								]}>
								Token
							</Text>
						</TouchableHighlight>
					</View>
				) : null}

				{/* Email mode */}
				{mode === "email" && !needsPin ? (
					<View style={styles.form}>
						<Text style={[styles.label, { color: c.textSecondary }]}>Workspace</Text>
						<View style={styles.workspaceRow}>
							<TextInput
								ref={function (r: FocusableRef | null) {
									self._inputRefs.workspace = r;
								}}
								style={[
									styles.input,
									styles.workspaceInput,
									{
										backgroundColor: c.bgTertiary,
										color: c.textSecondary,
										borderColor: focusIndex === fields.indexOf("workspace") ? c.accent : c.borderInput
									}
								]}
								placeholder="your-team"
								placeholderTextColor={c.textPlaceholder}
								value={workspace}
								onChangeText={function (t: string) {
									self.setState({ workspace: t });
								}}
								autoCapitalize="none"
								autoCorrect={false}
								returnKeyType="next"
								data-type="input"
							/>
							<Text style={[styles.workspaceSuffix, { color: c.textTertiary }]}>.slack.com</Text>
						</View>

						<Text style={[styles.label, { color: c.textSecondary }]}>Email</Text>
						<TextInput
							ref={function (r: FocusableRef | null) {
								self._inputRefs.email = r;
							}}
							style={[
								styles.input,
								{
									backgroundColor: c.bgTertiary,
									color: c.textSecondary,
									borderColor: focusIndex === fields.indexOf("email") ? c.accent : c.borderInput
								}
							]}
							placeholder="you@example.com"
							placeholderTextColor={c.textPlaceholder}
							value={email}
							onChangeText={function (t: string) {
								self.setState({ email: t });
							}}
							autoCapitalize="none"
							autoCorrect={false}
							keyboardType="email-address"
							returnKeyType="next"
							data-type="input"
						/>

						<Text style={[styles.label, { color: c.textSecondary }]}>Password</Text>
						<TextInput
							ref={function (r: FocusableRef | null) {
								self._inputRefs.password = r;
							}}
							style={[
								styles.input,
								{
									backgroundColor: c.bgTertiary,
									color: c.textSecondary,
									borderColor: focusIndex === fields.indexOf("password") ? c.accent : c.borderInput
								}
							]}
							placeholder="Password"
							placeholderTextColor={c.textPlaceholder}
							value={password}
							onChangeText={function (t: string) {
								self.setState({ password: t });
							}}
							secureTextEntry={true}
							returnKeyType="done"
							onSubmitEditing={function () {
								self.handleEmailLogin();
							}}
							data-type="input"
						/>

						<TouchableHighlight
							ref={function (r: FocusableRef | null) {
								self._inputRefs.signin = r;
							}}
							style={[
								styles.button,
								{ backgroundColor: c.purple },
								(!workspace.trim() || !email.trim() || !password) && styles.buttonDisabled,
								focusIndex === fields.indexOf("signin") && styles.buttonFocused
							]}
							underlayColor="#3a1d6e"
							onPress={function () {
								self.handleEmailLogin();
							}}
							disabled={loading || !workspace.trim() || !email.trim() || !password}
							data-type="btn">
							{loading ? (
								<ActivityIndicator
									size="small"
									color="#ffffff"
								/>
							) : (
								<Text style={styles.buttonText}>Sign In</Text>
							)}
						</TouchableHighlight>

						<Text style={[styles.hint, { color: c.textTertiary, marginTop: 12 }]}>
							Sign in with your Slack workspace credentials. If your workspace uses SSO, use the Token
							method instead.
						</Text>
					</View>
				) : null}

				{/* 2FA PIN mode */}
				{mode === "email" && needsPin ? (
					<View style={styles.form}>
						<Text style={[styles.label, { color: c.textSecondary }]}>Two-Factor Authentication</Text>
						<Text style={[styles.hint, { color: c.textTertiary, marginBottom: 14 }]}>
							Enter the 6-digit code from your authenticator app or SMS.
						</Text>
						<TextInput
							ref={function (r: FocusableRef | null) {
								self._inputRefs.pin = r;
							}}
							style={[
								styles.input,
								{
									backgroundColor: c.bgTertiary,
									color: c.textSecondary,
									borderColor: focusIndex === fields.indexOf("pin") ? c.accent : c.borderInput,
									textAlign: "center",
									fontSize: 20,
									letterSpacing: 8
								}
							]}
							placeholder="000000"
							placeholderTextColor={c.textPlaceholder}
							value={pin}
							onChangeText={function (t: string) {
								self.setState({ pin: t.replace(/[^0-9]/g, "").slice(0, 6) });
							}}
							keyboardType="numeric"
							maxLength={6}
							returnKeyType="done"
							onSubmitEditing={function () {
								self.handlePinSubmit();
							}}
							data-type="input"
						/>

						<TouchableHighlight
							ref={function (r: FocusableRef | null) {
								self._inputRefs.verify = r;
							}}
							style={[
								styles.button,
								{ backgroundColor: c.purple },
								pin.trim().length < 6 && styles.buttonDisabled,
								focusIndex === fields.indexOf("verify") && styles.buttonFocused
							]}
							underlayColor="#3a1d6e"
							onPress={function () {
								self.handlePinSubmit();
							}}
							disabled={loading || pin.trim().length < 6}
							data-type="btn">
							{loading ? (
								<ActivityIndicator
									size="small"
									color="#ffffff"
								/>
							) : (
								<Text style={styles.buttonText}>Verify</Text>
							)}
						</TouchableHighlight>

						<TouchableHighlight
							ref={function (r: FocusableRef | null) {
								self._inputRefs.pinBack = r;
							}}
							style={[
								styles.linkButton,
								{ borderColor: c.border, marginTop: 12 },
								focusIndex === fields.indexOf("pinBack") && { borderColor: c.accent }
							]}
							underlayColor={c.bgTertiary}
							onPress={function () {
								self.setState({ needsPin: false, pin: "", error: null });
							}}
							data-type="btn">
							<Text style={[styles.linkButtonText, { color: c.textSecondary }]}>Back</Text>
						</TouchableHighlight>
					</View>
				) : null}

				{/* Token mode */}
				{mode === "token" ? (
					<View style={styles.form}>
						<Text style={[styles.label, { color: c.textSecondary }]}>Slack Token</Text>
						<TextInput
							ref={function (r: FocusableRef | null) {
								self._inputRefs.token = r;
							}}
							style={[
								styles.input,
								{
									backgroundColor: c.bgTertiary,
									color: c.textSecondary,
									borderColor: focusIndex === fields.indexOf("token") ? c.accent : c.borderInput
								}
							]}
							placeholder="xoxp-... or xoxb-..."
							placeholderTextColor={c.textPlaceholder}
							value={token}
							onChangeText={function (t: string) {
								self.setState({ token: t });
							}}
							autoCapitalize="none"
							autoCorrect={false}
							returnKeyType="done"
							onSubmitEditing={function () {
								self.handleTokenLogin();
							}}
							data-type="input"
						/>

						<TouchableHighlight
							ref={function (r: FocusableRef | null) {
								if (self.state.mode === "token") self._inputRefs.signin = r;
							}}
							style={[
								styles.button,
								{ backgroundColor: c.purple },
								!token.trim() && styles.buttonDisabled,
								focusIndex === fields.indexOf("signin") && styles.buttonFocused
							]}
							underlayColor="#3a1d6e"
							onPress={function () {
								self.handleTokenLogin();
							}}
							disabled={loading || !token.trim()}
							data-type="btn">
							{loading ? (
								<ActivityIndicator
									size="small"
									color="#ffffff"
								/>
							) : (
								<Text style={styles.buttonText}>Sign In</Text>
							)}
						</TouchableHighlight>

						{/* Instructions */}
						<View style={[styles.instructions, { borderColor: c.border }]}>
							<Text style={[styles.instructionsTitle, { color: c.textSecondary }]}>
								How to get your token:
							</Text>
							<Text style={[styles.step, { color: c.textTertiary }]}>1. Go to api.slack.com/apps</Text>
							<Text style={[styles.step, { color: c.textTertiary }]}>
								2. Create a new app (or select existing)
							</Text>
							<Text style={[styles.step, { color: c.textTertiary }]}>3. Go to "OAuth & Permissions"</Text>
							<Text style={[styles.step, { color: c.textTertiary }]}>
								4. Add scopes: channels:read, channels:history, chat:write, users:read, files:read,
								search:read, reactions:write, pins:write, stars:write, team:read, groups:read,
								groups:history, im:read, im:history, mpim:read, mpim:history
							</Text>
							<Text style={[styles.step, { color: c.textTertiary }]}>
								5. Install the app to your workspace
							</Text>
							<Text style={[styles.step, { color: c.textTertiary }]}>
								6. Copy the "User OAuth Token" (xoxp-...)
							</Text>

							<TouchableHighlight
								ref={function (r: FocusableRef | null) {
									self._inputRefs.openApps = r;
								}}
								style={[
									styles.linkButton,
									{ borderColor: c.purple },
									focusIndex === fields.indexOf("openApps") && { borderColor: c.accent, borderWidth: 2 }
								]}
								underlayColor={c.bgTertiary}
								onPress={function () {
									self.openTokenPage();
								}}
								data-type="btn">
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
