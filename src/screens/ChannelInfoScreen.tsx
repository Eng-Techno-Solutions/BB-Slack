import Header from "../components/Header";
import Icon from "../components/Icon";
import SlackText from "../components/SlackText";
import { getColors } from "../theme";
import { getChannelDisplayName, getUserName } from "../utils/format";
import { addKeyEventListener, removeKeyEventListener } from "../utils/keyEvents";
import React, { Component } from "react";
import {
	ActivityIndicator,
	FlatList,
	Image,
	Platform,
	StyleSheet,
	Text,
	TouchableHighlight,
	TouchableOpacity,
	View
} from "react-native";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

interface SlackUserProfile {
	display_name?: string;
	image_72?: string;
	image_48?: string;
	[key: string]: unknown;
}

interface SlackUser {
	id: string;
	name?: string;
	real_name?: string;
	deleted?: boolean;
	is_bot?: boolean;
	profile?: SlackUserProfile;
	[key: string]: unknown;
}

interface SlackChannel {
	id: string;
	is_im?: boolean;
	is_mpim?: boolean;
	is_private?: boolean;
	purpose?: { value: string };
	topic?: { value: string };
	[key: string]: unknown;
}

interface SlackAPI {
	token: string;
	conversationsMembers(channelId: string): Promise<{ members?: string[] }>;
	pinsList(channelId: string): Promise<{ items?: PinItem[] }>;
	[key: string]: unknown;
}

interface PinMessage {
	user: string;
	text: string;
	ts: string;
	[key: string]: unknown;
}

interface PinItem {
	message?: PinMessage;
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
	channel: SlackChannel;
	usersMap: Record<string, SlackUser>;
	currentUserId: string;
	onBack?: () => void;
	onProfile?: (userId: string) => void;
	themeMode?: string;
}

interface State {
	members: string[];
	loading: boolean;
	pins: PinItem[];
	pinsLoading: boolean;
	showPins: boolean;
	focusIndex: number;
}

export default class ChannelInfoScreen extends Component<Props, State> {
	_keySub: KeySub | null;
	_list: FlatList<string | PinItem> | null;

	constructor(props: Props) {
		super(props);
		this.state = {
			members: [],
			loading: true,
			pins: [],
			pinsLoading: true,
			showPins: false,
			focusIndex: -1
		};
		this._keySub = null;
		this._list = null;
	}

	componentDidMount(): void {
		this.loadMembers();
		this.loadPins();
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
		const { showPins, members, pins, focusIndex } = this.state;
		const data: Array<string | PinItem> = showPins ? pins : members;
		const idx = focusIndex;

		if (action === "down") {
			if (data.length === 0) return;
			const next = idx < 0 ? 0 : Math.min(idx + 1, data.length - 1);
			this.setState({ focusIndex: next });
			if (this._list)
				try {
					this._list.scrollToIndex({ index: next, viewOffset: 80, animated: true });
				} catch (_e) {}
		} else if (action === "up") {
			if (data.length === 0) return;
			const prev = idx <= 0 ? 0 : idx - 1;
			this.setState({ focusIndex: prev });
			if (this._list)
				try {
					this._list.scrollToIndex({ index: prev, viewOffset: 80, animated: true });
				} catch (_e) {}
		} else if (action === "select" && idx >= 0 && idx < data.length) {
			if (!showPins) {
				this.props.onProfile && this.props.onProfile(data[idx] as string);
			}
		} else if (action === "right") {
			this.setState({ showPins: !showPins, focusIndex: -1 });
		} else if (action === "back") {
			this.props.onBack && this.props.onBack();
		}
	}

	async loadMembers(): Promise<void> {
		const { slack, channel, usersMap } = this.props;
		try {
			const res = await slack.conversationsMembers(channel.id);
			const activeMembers = (res.members || []).filter(function (id: string) {
				const u = usersMap[id];
				if (!u) return true;
				if (u.deleted) return false;
				const name = (u.profile && u.profile.display_name) || u.real_name || u.name || "";
				if (name.toLowerCase() === "deactivateduser") return false;
				return true;
			});
			this.setState({ members: activeMembers, loading: false });
		} catch (err) {
			this.setState({ loading: false });
		}
	}

	async loadPins(): Promise<void> {
		const { slack, channel } = this.props;
		try {
			const res = await slack.pinsList(channel.id);
			this.setState({ pins: res.items || [], pinsLoading: false });
		} catch (err) {
			this.setState({ pinsLoading: false });
		}
	}

	getProfileImage(userId: string): string | null {
		const u = this.props.usersMap[userId];
		if (u && u.profile) {
			return u.profile.image_72 || u.profile.image_48 || null;
		}
		return null;
	}

	renderMember(userId: string, focused: boolean): React.ReactElement {
		const { usersMap, onProfile, slack } = this.props;
		const c = getColors();
		const name = getUserName(userId, usersMap);
		let imageUrl = this.getProfileImage(userId);
		if (Platform.OS === "web" && imageUrl && slack && slack.token) {
			imageUrl =
				"/slack-file?url=" + encodeURIComponent(imageUrl) + "&token=" + encodeURIComponent(slack.token);
		}

		return (
			<TouchableHighlight
				style={[
					styles.memberItem,
					{ borderBottomColor: c.border },
					focused && { backgroundColor: c.listUnderlay }
				]}
				underlayColor={c.listUnderlay}
				onPress={function () {
					onProfile && onProfile(userId);
				}}
				data-type="list-item">
				<View style={styles.memberInner}>
					{imageUrl ? (
						<Image
							source={{ uri: imageUrl }}
							style={styles.memberAvatar}
						/>
					) : (
						<View
							style={[
								styles.memberAvatar,
								styles.memberAvatarPlaceholder,
								{ backgroundColor: c.avatarPlaceholderBg }
							]}>
							<Text style={styles.memberAvatarText}>{(name[0] || "?").toUpperCase()}</Text>
						</View>
					)}
					<Text style={[styles.memberName, { color: c.textSecondary }]}>{name}</Text>
					<Icon
						name="chevron-right"
						size={16}
						color={c.textPlaceholder}
					/>
				</View>
			</TouchableHighlight>
		);
	}

	renderPin(item: PinItem): React.ReactElement | null {
		const { usersMap } = this.props;
		const c = getColors();
		const msg = item.message;
		if (!msg) return null;
		const userName = getUserName(msg.user, usersMap);

		return (
			<View style={[styles.pinItem, { borderBottomColor: c.border }]}>
				<Text style={[styles.pinUser, { color: c.textSecondary }]}>{userName}</Text>
				<Text
					style={[styles.pinText, { color: c.textTertiary }]}
					numberOfLines={3}>
					{msg.text}
				</Text>
			</View>
		);
	}

	render(): React.ReactElement {
		const { channel, usersMap, currentUserId, onBack } = this.props;
		const { members, loading, pins, pinsLoading, showPins } = this.state;
		const self = this;
		const channelName = getChannelDisplayName(channel, usersMap, currentUserId);
		const c = getColors();

		return (
			<View style={[styles.container, { backgroundColor: c.bg }]}>
				<Header
					title="Info"
					onBack={onBack}
				/>

				<View style={[styles.infoSection, { borderBottomColor: c.border }]}>
					<Text style={[styles.channelName, { color: c.textPrimary }]}>
						{!channel.is_im ? "# " : ""}
						{channelName}
					</Text>
					{channel.purpose && channel.purpose.value ? (
						<SlackText
							text={channel.purpose.value}
							style={[styles.purpose, { color: c.textSecondary }]}
						/>
					) : null}
					{channel.topic && channel.topic.value ? (
						<SlackText
							text={"Topic: " + channel.topic.value}
							style={[styles.topic, { color: c.textTertiary }]}
						/>
					) : null}
					<Text style={[styles.memberCount, { color: c.textPlaceholder }]}>
						{members.length} members
					</Text>
				</View>

				<View style={[styles.tabRow, { borderBottomColor: c.border }]}>
					<TouchableOpacity
						style={[styles.tabBtn, !showPins && [styles.tabBtnActive, { borderBottomColor: c.accent }]]}
						onPress={function () {
							self.setState({ showPins: false, focusIndex: -1 });
						}}
						data-type="tab-btn">
						<Text
							style={[
								styles.tabBtnText,
								{ color: c.textTertiary },
								!showPins && { color: c.textPrimary, fontWeight: "bold" }
							]}>
							Members
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.tabBtn, showPins && [styles.tabBtnActive, { borderBottomColor: c.accent }]]}
						onPress={function () {
							self.setState({ showPins: true, focusIndex: -1 });
						}}
						data-type="tab-btn">
						<Text
							style={[
								styles.tabBtnText,
								{ color: c.textTertiary },
								showPins && { color: c.textPrimary, fontWeight: "bold" }
							]}>
							Pins ({pins.length})
						</Text>
					</TouchableOpacity>
				</View>

				{!showPins ? (
					loading ? (
						<View style={styles.center}>
							<ActivityIndicator
								size="large"
								color={c.accent}
							/>
						</View>
					) : (
						<FlatList
							ref={function (r: FlatList<string> | null) {
								self._list = r as any;
							}}
							data={members}
							keyExtractor={function (item: string) {
								return item;
							}}
							renderItem={function (obj: { item: string; index: number }) {
								return self.renderMember(obj.item, obj.index === self.state.focusIndex);
							}}
						/>
					)
				) : pinsLoading ? (
					<View style={styles.center}>
						<ActivityIndicator
							size="large"
							color={c.accent}
						/>
					</View>
				) : (
					<FlatList
						ref={function (r: FlatList<PinItem> | null) {
							self._list = r as any;
						}}
						data={pins}
						keyExtractor={function (_item: PinItem, i: number) {
							return "" + i;
						}}
						renderItem={function (obj: { item: PinItem }) {
							return self.renderPin(obj.item);
						}}
						ListEmptyComponent={
							<View style={styles.center}>
								<Text style={[styles.emptyText, { color: c.textTertiary }]}>No pinned messages</Text>
							</View>
						}
					/>
				)}
			</View>
		);
	}
}

interface Styles {
	container: ViewStyle;
	infoSection: ViewStyle;
	channelName: TextStyle;
	purpose: TextStyle;
	topic: TextStyle;
	memberCount: TextStyle;
	tabRow: ViewStyle;
	tabBtn: ViewStyle;
	tabBtnActive: ViewStyle;
	tabBtnText: TextStyle;
	center: ViewStyle;
	emptyText: TextStyle;
	memberItem: ViewStyle;
	memberInner: ViewStyle;
	memberAvatar: ImageStyle;
	memberAvatarPlaceholder: ViewStyle;
	memberAvatarText: TextStyle;
	memberName: TextStyle;
	pinItem: ViewStyle;
	pinUser: TextStyle;
	pinText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
	container: {
		flex: 1
	},
	infoSection: {
		padding: 16,
		borderBottomWidth: 1
	},
	channelName: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 4
	},
	purpose: {
		fontSize: 14,
		marginBottom: 4
	},
	topic: {
		fontSize: 13,
		marginBottom: 4
	},
	memberCount: {
		fontSize: 13,
		marginTop: 4
	},
	tabRow: {
		flexDirection: "row",
		borderBottomWidth: 1
	},
	tabBtn: {
		flex: 1,
		paddingVertical: 10,
		alignItems: "center"
	},
	tabBtnActive: {
		borderBottomWidth: 2
	},
	tabBtnText: {
		fontSize: 14
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 40
	},
	emptyText: {
		fontSize: 14
	},
	memberItem: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1
	},
	memberInner: {
		flexDirection: "row",
		alignItems: "center"
	},
	memberAvatar: {
		width: 32,
		height: 32,
		borderRadius: 4,
		marginRight: 10
	},
	memberAvatarPlaceholder: {
		justifyContent: "center",
		alignItems: "center"
	},
	memberAvatarText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "bold"
	},
	memberName: {
		flex: 1,
		fontSize: 15
	},
	pinItem: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1
	},
	pinUser: {
		fontSize: 14,
		fontWeight: "bold",
		marginBottom: 2
	},
	pinText: {
		fontSize: 14
	}
});
