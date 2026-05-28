import { Header } from "../components";
import { getColors } from "../theme";
import type { KeyEvent, KeySub, SlackChannel, SlackUser } from "../types";
import { errorMessage } from "../utils/error";
import { addKeyEventListener, removeKeyEventListener } from "../utils/keyEvents";
import { styles } from "./ProfileScreen.styles";
import type { ProfileProps as Props, ProfileState as State } from "./types";
import React, { Component } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default class ProfileScreen extends Component<Props, State> {
	_keySub: KeySub | null;

	constructor(props: Props) {
		super(props);
		this.state = {
			user: null,
			loading: true
		};
		this._keySub = null;
	}

	componentDidMount(): void {
		this.loadUser();
		const self = this;
		this._keySub = addKeyEventListener(function (e: KeyEvent) {
			self.handleKeyEvent(e);
		});
	}

	componentWillUnmount(): void {
		removeKeyEventListener(this._keySub);
	}

	handleKeyEvent(e: KeyEvent): void {
		const action = e.action;
		if (action === "back") {
			this.props.onBack && this.props.onBack();
		} else if (action === "select") {
			if (this.props.userId !== this.props.currentUserId && this.state.user) {
				this.openDM();
			}
		}
	}

	async loadUser(): Promise<void> {
		const { slack, userId, usersMap } = this.props;

		if (usersMap[userId]) {
			this.setState({ user: usersMap[userId], loading: false });
			return;
		}

		try {
			const res = await slack.usersInfo(userId);
			this.setState({ user: res.user as SlackUser, loading: false });
		} catch (err: unknown) {
			this.setState({ loading: false });
			Alert.alert("Error", errorMessage(err, "Failed to load user"));
		}
	}

	async openDM(): Promise<void> {
		const { slack, userId, onOpenDM } = this.props;
		try {
			const res = await slack.conversationsOpen(userId);
			if (res.channel && onOpenDM) {
				onOpenDM(res.channel as SlackChannel);
			}
		} catch (err: unknown) {
			Alert.alert("Error", errorMessage(err, "Failed to open DM"));
		}
	}

	render(): React.ReactElement {
		const { onBack, currentUserId, userId } = this.props;
		const { user, loading } = this.state;
		const self = this;
		const c = getColors();

		if (loading) {
			return (
				<View style={[styles.container, { backgroundColor: c.bg }]}>
					<Header
						title="Profile"
						onBack={onBack}
					/>
					<View style={styles.center}>
						<ActivityIndicator
							size="large"
							color={c.accent}
						/>
					</View>
				</View>
			);
		}

		if (!user) {
			return (
				<View style={[styles.container, { backgroundColor: c.bg }]}>
					<Header
						title="Profile"
						onBack={onBack}
					/>
					<View style={styles.center}>
						<Text style={styles.errorText}>User not found</Text>
					</View>
				</View>
			);
		}

		const displayName =
			user.profile && user.profile.display_name
				? user.profile.display_name
				: user.real_name || user.name;
		const realName = user.real_name || "";
		const title = user.profile && user.profile.title ? user.profile.title : "";
		const status = user.profile && user.profile.status_text ? user.profile.status_text : "";
		const email = user.profile && user.profile.email ? user.profile.email : "";
		const phone = user.profile && user.profile.phone ? user.profile.phone : "";
		const tz = user.tz_label || user.tz || "";
		const isBot = user.is_bot;
		const isOwn = userId === currentUserId;

		return (
			<View style={[styles.container, { backgroundColor: c.bg }]}>
				<Header
					title="Profile"
					onBack={onBack}
				/>
				<ScrollView>
					<View style={[styles.profileSection, { borderBottomColor: c.border }]}>
						<View style={[styles.avatar, { backgroundColor: c.purple }]}>
							<Text style={styles.avatarText}>{(displayName || "?").charAt(0).toUpperCase()}</Text>
						</View>
						<Text style={[styles.displayName, { color: c.textPrimary }]}>{displayName}</Text>
						{realName && realName !== displayName ? (
							<Text style={[styles.realName, { color: c.textSecondary }]}>{realName}</Text>
						) : null}
						{title ? <Text style={[styles.title, { color: c.textTertiary }]}>{title}</Text> : null}
						{status ? <Text style={[styles.status, { color: c.textSecondary }]}>{status}</Text> : null}
						{isBot ? (
							<Text style={[styles.botBadge, { color: c.textSecondary, backgroundColor: c.bgTertiary }]}>
								BOT
							</Text>
						) : null}
					</View>

					<View style={styles.detailsSection}>
						{email ? (
							<View style={[styles.detailRow, { borderBottomColor: c.border }]}>
								<Text style={[styles.detailLabel, { color: c.textTertiary }]}>Email</Text>
								<Text style={[styles.detailValue, { color: c.textSecondary }]}>{email}</Text>
							</View>
						) : null}
						{phone ? (
							<View style={[styles.detailRow, { borderBottomColor: c.border }]}>
								<Text style={[styles.detailLabel, { color: c.textTertiary }]}>Phone</Text>
								<Text style={[styles.detailValue, { color: c.textSecondary }]}>{phone}</Text>
							</View>
						) : null}
						{tz ? (
							<View style={[styles.detailRow, { borderBottomColor: c.border }]}>
								<Text style={[styles.detailLabel, { color: c.textTertiary }]}>Timezone</Text>
								<Text style={[styles.detailValue, { color: c.textSecondary }]}>{tz}</Text>
							</View>
						) : null}
						<View style={[styles.detailRow, { borderBottomColor: c.border }]}>
							<Text style={[styles.detailLabel, { color: c.textTertiary }]}>Username</Text>
							<Text style={[styles.detailValue, { color: c.textSecondary }]}>@{user.name}</Text>
						</View>
					</View>

					{!isOwn ? (
						<TouchableOpacity
							style={[styles.dmButton, { backgroundColor: c.green }]}
							onPress={function () {
								self.openDM();
							}}
							data-type="btn">
							<Text style={styles.dmButtonText}>Message</Text>
						</TouchableOpacity>
					) : null}
				</ScrollView>
			</View>
		);
	}
}
