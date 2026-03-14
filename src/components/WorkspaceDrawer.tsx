import { getColors } from "../theme";
import Icon from "./Icon";
import React, { Component } from "react";
import {
	Animated,
	Dimensions,
	Image,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableHighlight,
	TouchableOpacity,
	View
} from "react-native";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

const DRAWER_WIDTH: number = Math.min(280, Dimensions.get("window").width * 0.8);

interface WorkspaceAccount {
	userId: string;
	teamName?: string;
	teamIcon?: string;
	userName?: string;
}

interface WorkspaceDrawerProps {
	visible: boolean;
	accounts: WorkspaceAccount[];
	activeAccountId: string;
	onSwitch: (account: WorkspaceAccount) => void;
	onAddAccount: () => void;
	onRemoveAccount: (account: WorkspaceAccount) => void;
	onClose: () => void;
}

interface WorkspaceDrawerStyles {
	container: ViewStyle;
	overlay: ViewStyle;
	overlayTouch: ViewStyle;
	drawer: ViewStyle;
	drawerHeader: ViewStyle;
	drawerTitle: TextStyle;
	accountsList: ViewStyle;
	accountItem: ViewStyle;
	accountInner: ViewStyle;
	accountIcon: ImageStyle;
	accountIconPlaceholder: ViewStyle;
	accountIconText: TextStyle;
	accountInfo: ViewStyle;
	accountTeam: TextStyle;
	accountUser: TextStyle;
	removeBtn: ViewStyle;
	addBtn: ViewStyle;
	addBtnInner: ViewStyle;
	addIconWrap: ViewStyle;
	addBtnText: TextStyle;
}

export default class WorkspaceDrawer extends Component<WorkspaceDrawerProps> {
	_slideAnim: Animated.Value;
	_overlayAnim: Animated.Value;

	constructor(props: WorkspaceDrawerProps) {
		super(props);
		this._slideAnim = new Animated.Value(-DRAWER_WIDTH);
		this._overlayAnim = new Animated.Value(0);
	}

	componentDidUpdate(prevProps: WorkspaceDrawerProps): void {
		if (this.props.visible && !prevProps.visible) {
			this._open();
		} else if (!this.props.visible && prevProps.visible) {
			this._close();
		}
	}

	_open(): void {
		Animated.parallel([
			Animated.timing(this._slideAnim, {
				toValue: 0,
				duration: 200,
				useNativeDriver: false
			}),
			Animated.timing(this._overlayAnim, {
				toValue: 1,
				duration: 200,
				useNativeDriver: false
			})
		]).start();
	}

	_close(): void {
		Animated.parallel([
			Animated.timing(this._slideAnim, {
				toValue: -DRAWER_WIDTH,
				duration: 150,
				useNativeDriver: false
			}),
			Animated.timing(this._overlayAnim, {
				toValue: 0,
				duration: 150,
				useNativeDriver: false
			})
		]).start();
	}

	render(): React.ReactNode {
		const { visible, accounts, activeAccountId, onSwitch, onAddAccount, onRemoveAccount, onClose } =
			this.props;
		const c = getColors();

		if (!visible) return null;

		const _self = this;

		return (
			<View style={styles.container}>
				<Animated.View style={[styles.overlay, { opacity: this._overlayAnim }]}>
					<TouchableOpacity
						style={styles.overlayTouch}
						activeOpacity={1}
						onPress={onClose}
					/>
				</Animated.View>
				<Animated.View
					style={[
						styles.drawer,
						{
							backgroundColor: c.bgSecondary,
							width: DRAWER_WIDTH,
							transform: [{ translateX: this._slideAnim }]
						}
					]}>
					<View style={[styles.drawerHeader, { borderBottomColor: c.border }]}>
						<Text style={[styles.drawerTitle, { color: c.textPrimary }]}>Workspaces</Text>
					</View>
					<ScrollView style={styles.accountsList}>
						{accounts.map(function (account: WorkspaceAccount) {
							const isActive = account.userId === activeAccountId;
							return (
								<TouchableHighlight
									key={account.userId}
									style={[styles.accountItem, isActive && { backgroundColor: c.listUnderlay }]}
									underlayColor={c.listUnderlay}
									onPress={function () {
										if (!isActive) {
											onSwitch(account);
										}
										onClose();
									}}
									data-type="list-item">
									<View style={styles.accountInner}>
										{account.teamIcon ? (
											<Image
												source={{ uri: account.teamIcon }}
												style={styles.accountIcon}
											/>
										) : (
											<View
												style={[
													styles.accountIcon as ViewStyle,
													styles.accountIconPlaceholder,
													{ backgroundColor: c.avatarPlaceholderBg }
												]}>
												<Text style={styles.accountIconText}>
													{(account.teamName || "?").charAt(0).toUpperCase()}
												</Text>
											</View>
										)}
										<View style={styles.accountInfo}>
											<Text
												style={[styles.accountTeam, { color: c.textPrimary }]}
												numberOfLines={1}>
												{account.teamName || "Workspace"}
											</Text>
											<Text
												style={[styles.accountUser, { color: c.textTertiary }]}
												numberOfLines={1}>
												{account.userName || account.userId}
											</Text>
										</View>
										{isActive ? (
											<Icon
												name="check"
												size={18}
												color={c.accent}
											/>
										) : (
											<TouchableOpacity
												style={styles.removeBtn}
												onPress={function () {
													onRemoveAccount(account);
												}}
												data-type="icon-btn">
												<Icon
													name="x"
													size={16}
													color={c.textTertiary}
												/>
											</TouchableOpacity>
										)}
									</View>
								</TouchableHighlight>
							);
						})}
					</ScrollView>
					<TouchableHighlight
						style={[styles.addBtn, { borderTopColor: c.border }]}
						underlayColor={c.listUnderlay}
						onPress={function () {
							onClose();
							onAddAccount();
						}}
						data-type="list-item">
						<View style={styles.addBtnInner}>
							<View style={[styles.addIconWrap, { backgroundColor: c.avatarPlaceholderBg }]}>
								<Icon
									name="plus"
									size={18}
									color="#FFFFFF"
								/>
							</View>
							<Text style={[styles.addBtnText, { color: c.textPrimary }]}>Add Workspace</Text>
						</View>
					</TouchableHighlight>
				</Animated.View>
			</View>
		);
	}
}

const styles = StyleSheet.create<WorkspaceDrawerStyles>({
	container: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 100
	},
	overlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0,0,0,0.5)"
	},
	overlayTouch: {
		flex: 1
	},
	drawer: {
		position: "absolute",
		top: 0,
		left: 0,
		bottom: 0,
		...Platform.select({
			web: { boxShadow: "2px 0 8px rgba(0,0,0,0.3)" },
			default: { elevation: 16 }
		})
	},
	drawerHeader: {
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1
	},
	drawerTitle: {
		fontSize: 18,
		fontWeight: "bold"
	},
	accountsList: {
		flex: 1
	},
	accountItem: {
		paddingHorizontal: 16,
		paddingVertical: 12
	},
	accountInner: {
		flexDirection: "row",
		alignItems: "center"
	},
	accountIcon: {
		width: 36,
		height: 36,
		borderRadius: 8,
		marginRight: 12
	},
	accountIconPlaceholder: {
		justifyContent: "center",
		alignItems: "center"
	},
	accountIconText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "bold"
	},
	accountInfo: {
		flex: 1
	},
	accountTeam: {
		fontSize: 15,
		fontWeight: "600"
	},
	accountUser: {
		fontSize: 13,
		marginTop: 1
	},
	removeBtn: {
		padding: 8
	},
	addBtn: {
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderTopWidth: 1
	},
	addBtnInner: {
		flexDirection: "row",
		alignItems: "center"
	},
	addIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12
	},
	addBtnText: {
		fontSize: 15,
		fontWeight: "600"
	}
});
