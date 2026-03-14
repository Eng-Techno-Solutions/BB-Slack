import Header from "../components/Header";
import { getColors } from "../theme";
import { addKeyEventListener, removeKeyEventListener } from "../utils/keyEvents";
import React, { Component } from "react";
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

interface SlackUserProfile {
	display_name?: string;
	title?: string;
	status_text?: string;
	email?: string;
	phone?: string;
	[key: string]: unknown;
}

interface SlackUser {
	id: string;
	name?: string;
	real_name?: string;
	is_bot?: boolean;
	tz_label?: string;
	tz?: string;
	profile?: SlackUserProfile;
	[key: string]: unknown;
}

interface SlackChannel {
	id: string;
	[key: string]: unknown;
}

interface SlackAPI {
	usersInfo(userId: string): Promise<{ user: SlackUser }>;
	conversationsOpen(userId: string): Promise<{ channel: SlackChannel }>;
	[key: string]: unknown;
}

interface KeyEvent {
	action: string;
	[key: string]: unknown;
}

interface KeySub {
	remove(): void;
}

interface Props {
	slack: SlackAPI;
	userId: string;
	usersMap: Record<string, SlackUser>;
	currentUserId: string;
	onBack?: () => void;
	onOpenDM?: (channel: SlackChannel) => void;
	themeMode?: string;
}

interface State {
	user: SlackUser | null;
	loading: boolean;
}

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
			this.setState({ user: res.user, loading: false });
		} catch (err: any) {
			this.setState({ loading: false });
			Alert.alert("Error", err.message);
		}
	}

	async openDM(): Promise<void> {
		const { slack, userId, onOpenDM } = this.props;
		try {
			const res = await slack.conversationsOpen(userId);
			if (res.channel && onOpenDM) {
				onOpenDM(res.channel);
			}
		} catch (err: any) {
			Alert.alert("Error", err.message);
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

interface Styles {
	container: ViewStyle;
	center: ViewStyle;
	errorText: TextStyle;
	profileSection: ViewStyle;
	avatar: ViewStyle;
	avatarText: TextStyle;
	displayName: TextStyle;
	realName: TextStyle;
	title: TextStyle;
	status: TextStyle;
	botBadge: TextStyle;
	detailsSection: ViewStyle;
	detailRow: ViewStyle;
	detailLabel: TextStyle;
	detailValue: TextStyle;
	dmButton: ViewStyle;
	dmButtonText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
	container: {
		flex: 1
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center"
	},
	errorText: {
		color: "#E01E5A",
		fontSize: 14
	},
	profileSection: {
		alignItems: "center",
		padding: 24,
		borderBottomWidth: 1
	},
	avatar: {
		width: 72,
		height: 72,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 12
	},
	avatarText: {
		color: "#ffffff",
		fontSize: 30,
		fontWeight: "bold"
	},
	displayName: {
		fontSize: 22,
		fontWeight: "bold"
	},
	realName: {
		fontSize: 15,
		marginTop: 2
	},
	title: {
		fontSize: 14,
		marginTop: 4
	},
	status: {
		fontSize: 14,
		marginTop: 4
	},
	botBadge: {
		fontSize: 11,
		fontWeight: "bold",
		marginTop: 6,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
		overflow: "hidden"
	},
	detailsSection: {
		padding: 16
	},
	detailRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 12,
		borderBottomWidth: 1
	},
	detailLabel: {
		fontSize: 14
	},
	detailValue: {
		fontSize: 14
	},
	dmButton: {
		margin: 16,
		paddingVertical: 14,
		borderRadius: 4,
		alignItems: "center"
	},
	dmButtonText: {
		color: "#ffffff",
		fontSize: 16,
		fontWeight: "bold"
	}
});
