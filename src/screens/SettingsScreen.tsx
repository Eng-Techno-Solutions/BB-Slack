import Header from "../components/Header";
import Icon from "../components/Icon";
import { getColors, getMode } from "../theme";
import { addKeyEventListener, removeKeyEventListener } from "../utils/keyEvents";
import React, { Component } from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableHighlight, View } from "react-native";
import type { LayoutChangeEvent, TextStyle, ViewStyle } from "react-native";

interface IntervalOption {
	label: string;
	value: number;
}

interface FontSizeOption {
	label: string;
	value: string;
}

const INTERVAL_OPTIONS: IntervalOption[] = [
	{ label: "1 minute", value: 60000 },
	{ label: "2 minutes", value: 120000 },
	{ label: "3 minutes", value: 180000 },
	{ label: "5 minutes", value: 300000 },
	{ label: "10 minutes", value: 600000 }
];

const FONT_SIZE_OPTIONS: FontSizeOption[] = [
	{ label: "Small", value: "small" },
	{ label: "Medium", value: "medium" },
	{ label: "Large", value: "large" }
];

interface KeyEvent {
	action: string;
	[key: string]: unknown;
}

interface KeySub {
	remove(): void;
}

interface ActionItem {
	type: string;
	action: () => void;
}

interface Props {
	notifEnabled: boolean;
	notifInterval: number;
	soundEnabled: boolean;
	fontSize: string;
	onToggleNotif: () => void;
	onChangeInterval: (value: number) => void;
	onToggleSound: () => void;
	onToggleTheme: () => void;
	onChangeFontSize: (value: string) => void;
	onBack: () => void;
	themeMode?: string;
}

interface State {
	focusIndex: number;
}

export default class SettingsScreen extends Component<Props, State> {
	_keySub: KeySub | null;
	_actions: ActionItem[];
	_rowY: Record<number, number>;
	_scrollView: ScrollView | null;
	_renderIdx: number;

	constructor(props: Props) {
		super(props);
		this.state = { focusIndex: -1 };
		this._keySub = null;
		this._actions = [];
		this._rowY = {};
		this._scrollView = null;
		this._renderIdx = 0;
	}

	componentDidMount(): void {
		const self = this;
		this._keySub = addKeyEventListener(function (e: KeyEvent) {
			self._handleKeyEvent(e);
		});
	}

	componentWillUnmount(): void {
		removeKeyEventListener(this._keySub);
	}

	_buildActions(): ActionItem[] {
		const actions: ActionItem[] = [];
		const {
			notifEnabled,
			onToggleNotif,
			onToggleSound,
			onChangeInterval,
			onToggleTheme,
			onChangeFontSize
		} = this.props;
		actions.push({ type: "toggle", action: onToggleNotif });
		actions.push({ type: "toggle", action: onToggleSound });
		if (notifEnabled) {
			for (let i = 0; i < INTERVAL_OPTIONS.length; i++) {
				const opt = INTERVAL_OPTIONS[i];
				actions.push({
					type: "select",
					action: (function (v: number) {
						return function () {
							onChangeInterval(v);
						};
					})(opt.value)
				});
			}
		}
		actions.push({ type: "toggle", action: onToggleTheme });
		for (let j = 0; j < FONT_SIZE_OPTIONS.length; j++) {
			const fopt = FONT_SIZE_OPTIONS[j];
			actions.push({
				type: "select",
				action: (function (v: string) {
					return function () {
						onChangeFontSize(v);
					};
				})(fopt.value)
			});
		}
		actions.push({
			type: "link",
			action: function () {
				Linking.openURL("https://ammaryaser.com/");
			}
		});
		actions.push({
			type: "link",
			action: function () {
				Linking.openURL("https://ammaryaser.com/");
			}
		});
		actions.push({
			type: "link",
			action: function () {
				Linking.openURL("https://buymeacoffee.com/ammaryaserh");
			}
		});
		actions.push({
			type: "link",
			action: function () {
				Linking.openURL("https://ipn.eg/S/ammar.yaser1998/instapay/9txW8n");
			}
		});
		actions.push({
			type: "link",
			action: function () {
				Linking.openURL("https://paypal.me/ammartechno?locale.x=en_US&country.x=EG");
			}
		});
		this._actions = actions;
		return actions;
	}

	_scrollToFocused(idx: number): void {
		const y = this._rowY[idx];
		if (y !== undefined && this._scrollView) {
			this._scrollView.scrollTo({ y: Math.max(0, y - 80), animated: true });
		}
	}

	_handleKeyEvent(e: KeyEvent): void {
		const action = e.action;
		const actions = this._buildActions();
		const idx = this.state.focusIndex;
		const self = this;

		if (action === "down") {
			const next = Math.min(idx + 1, actions.length - 1);
			this.setState({ focusIndex: next });
			self._scrollToFocused(next);
		} else if (action === "up") {
			const prev = Math.max(idx - 1, 0);
			this.setState({ focusIndex: prev });
			self._scrollToFocused(prev);
		} else if (action === "select") {
			if (idx >= 0 && idx < actions.length) {
				actions[idx].action();
			}
		} else if (action === "back") {
			this.props.onBack();
		}
	}

	renderToggleRow(
		icon: string,
		label: string,
		enabled: boolean,
		onPress: () => void
	): React.ReactElement {
		const c = getColors();
		const self = this;
		const ri = this._renderIdx++;
		const focused = this.state.focusIndex === ri;
		return (
			<TouchableHighlight
				onLayout={function (e: LayoutChangeEvent) {
					self._rowY[ri] = e.nativeEvent.layout.y;
				}}
				style={[
					styles.row,
					{ borderBottomColor: c.border },
					focused && { backgroundColor: c.listUnderlay }
				]}
				underlayColor={c.listUnderlay}
				onPress={onPress}
				data-type="list-item">
				<View style={styles.rowInner}>
					<View style={styles.rowLeft}>
						<Icon
							name={icon}
							size={18}
							color={c.textTertiary}
						/>
						<Text style={[styles.rowLabel, { color: c.textSecondary }]}>{label}</Text>
					</View>
					<View
						style={[styles.toggle, { backgroundColor: enabled ? c.green || "#2BAC76" : c.bgTertiary }]}>
						<View style={[styles.toggleKnob, enabled && styles.toggleKnobOn]} />
					</View>
				</View>
			</TouchableHighlight>
		);
	}

	renderSelectList(
		options: Array<{ label: string; value: string | number }>,
		selectedValue: string | number,
		onSelect: (value: any) => void
	): React.ReactElement[] {
		const c = getColors();
		const self = this;
		return options.map(function (opt) {
			const selected = selectedValue === opt.value;
			const ri = self._renderIdx++;
			const focused = self.state.focusIndex === ri;
			return (
				<TouchableHighlight
					key={String(opt.value)}
					onLayout={function (e: LayoutChangeEvent) {
						self._rowY[ri] = e.nativeEvent.layout.y;
					}}
					style={[
						styles.row,
						{ borderBottomColor: c.border },
						focused && { backgroundColor: c.listUnderlay }
					]}
					underlayColor={c.listUnderlay}
					onPress={function () {
						onSelect(opt.value);
					}}
					data-type="list-item">
					<View style={styles.rowInner}>
						<Text style={[styles.rowLabel, { color: c.textSecondary, marginLeft: 0 }]}>{opt.label}</Text>
						{selected ? (
							<Icon
								name="check"
								size={18}
								color={c.accent || "#1264A3"}
							/>
						) : null}
					</View>
				</TouchableHighlight>
			);
		});
	}

	render(): React.ReactElement {
		const {
			notifEnabled,
			notifInterval,
			onToggleNotif,
			onChangeInterval,
			soundEnabled,
			onToggleSound,
			themeMode: _themeMode,
			onToggleTheme,
			fontSize,
			onChangeFontSize,
			onBack
		} = this.props;
		const c = getColors();
		const isDark = getMode() === "dark";
		const fi = this.state.focusIndex;

		// Reset render index counter - used by renderToggleRow/renderSelectList
		this._renderIdx = 0;
		const self = this;

		// Inline rows need their own index tracking
		let themeIdx: number,
			engTechnoIdx: number,
			websiteIdx: number,
			coffeeIdx: number,
			instapayIdx: number,
			paypalIdx: number;

		return (
			<View style={[styles.container, { backgroundColor: c.bg }]}>
				<Header
					title="Settings"
					onBack={onBack}
				/>
				<ScrollView
					ref={function (r: ScrollView | null) {
						self._scrollView = r;
					}}>
					<Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>NOTIFICATIONS</Text>
					{this.renderToggleRow("bell", "Push Notifications", notifEnabled, onToggleNotif)}
					{this.renderToggleRow("mic", "Notification Sound", soundEnabled, onToggleSound)}

					{notifEnabled ? (
						<Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>CHECK INTERVAL</Text>
					) : null}
					{notifEnabled
						? this.renderSelectList(INTERVAL_OPTIONS, notifInterval, onChangeInterval)
						: null}
					{notifEnabled ? (
						<Text style={[styles.hint, { color: c.textPlaceholder }]}>
							How often the app checks for new DMs and mentions.
						</Text>
					) : null}

					<Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>APPEARANCE</Text>

					{((themeIdx = this._renderIdx++), null)}
					<TouchableHighlight
						onLayout={function (e: LayoutChangeEvent) {
							self._rowY[themeIdx] = e.nativeEvent.layout.y;
						}}
						style={[
							styles.row,
							{ borderBottomColor: c.border },
							fi === themeIdx && { backgroundColor: c.listUnderlay }
						]}
						underlayColor={c.listUnderlay}
						onPress={onToggleTheme}
						data-type="list-item">
						<View style={styles.rowInner}>
							<View style={styles.rowLeft}>
								<Icon
									name={isDark ? "moon" : "sun"}
									size={18}
									color={c.textTertiary}
								/>
								<Text style={[styles.rowLabel, { color: c.textSecondary }]}>Theme</Text>
							</View>
							<Text style={[styles.rowValue, { color: c.textPlaceholder }]}>
								{isDark ? "Dark" : "Light"}
							</Text>
						</View>
					</TouchableHighlight>

					<Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>MESSAGE TEXT SIZE</Text>
					{this.renderSelectList(FONT_SIZE_OPTIONS, fontSize, onChangeFontSize)}

					<Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>ABOUT</Text>
					<View style={[styles.row, { borderBottomColor: c.border }]}>
						<View style={styles.rowInner}>
							<Text style={[styles.rowLabel, { color: c.textSecondary, marginLeft: 0 }]}>App</Text>
							<Text style={[styles.rowValue, { color: c.textPlaceholder }]}>BB Slack</Text>
						</View>
					</View>
					<View style={[styles.row, { borderBottomColor: c.border }]}>
						<View style={styles.rowInner}>
							<Text style={[styles.rowLabel, { color: c.textSecondary, marginLeft: 0 }]}>Version</Text>
							<Text style={[styles.rowValue, { color: c.textPlaceholder }]}>1.0.0</Text>
						</View>
					</View>
					{((engTechnoIdx = this._renderIdx++), null)}
					<TouchableHighlight
						onLayout={function (e: LayoutChangeEvent) {
							self._rowY[engTechnoIdx] = e.nativeEvent.layout.y;
						}}
						style={[
							styles.row,
							{ borderBottomColor: c.border },
							fi === engTechnoIdx && { backgroundColor: c.listUnderlay }
						]}
						underlayColor={c.listUnderlay}
						onPress={function () {
							Linking.openURL("https://ammaryaser.com/");
						}}
						data-type="list-item">
						<View style={styles.rowInner}>
							<View style={styles.rowLeft}>
								<Icon
									name="globe"
									size={18}
									color={c.textTertiary}
								/>
								<Text style={[styles.rowLabel, { color: c.textSecondary }]}>Powered by Eng Techno</Text>
							</View>
							<Icon
								name="external-link"
								size={14}
								color={c.textPlaceholder}
							/>
						</View>
					</TouchableHighlight>

					<Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>DEVELOPER</Text>
					<View style={[styles.row, { borderBottomColor: c.border }]}>
						<View style={styles.rowInner}>
							<View style={styles.rowLeft}>
								<Icon
									name="user"
									size={18}
									color={c.textTertiary}
								/>
								<Text style={[styles.rowLabel, { color: c.textSecondary }]}>Ammar Yaser</Text>
							</View>
						</View>
					</View>
					<View style={[styles.devBio, { borderBottomColor: c.border }]}>
						<Text style={[styles.bioText, { color: c.textPlaceholder }]}>
							Senior Software Engineer & Product Builder. Full-stack development across frontend, backend,
							mobile & desktop with over a decade of experience.
						</Text>
					</View>
					{((websiteIdx = this._renderIdx++), null)}
					<TouchableHighlight
						onLayout={function (e: LayoutChangeEvent) {
							self._rowY[websiteIdx] = e.nativeEvent.layout.y;
						}}
						style={[
							styles.row,
							{ borderBottomColor: c.border },
							fi === websiteIdx && { backgroundColor: c.listUnderlay }
						]}
						underlayColor={c.listUnderlay}
						onPress={function () {
							Linking.openURL("https://ammaryaser.com/");
						}}
						data-type="list-item">
						<View style={styles.rowInner}>
							<View style={styles.rowLeft}>
								<Icon
									name="globe"
									size={18}
									color={c.textTertiary}
								/>
								<Text style={[styles.rowLabel, { color: c.textSecondary }]}>ammaryaser.com</Text>
							</View>
							<Icon
								name="external-link"
								size={14}
								color={c.textPlaceholder}
							/>
						</View>
					</TouchableHighlight>

					<Text style={[styles.sectionTitle, { color: c.textPlaceholder }]}>SUPPORT</Text>
					{((coffeeIdx = this._renderIdx++), null)}
					<TouchableHighlight
						onLayout={function (e: LayoutChangeEvent) {
							self._rowY[coffeeIdx] = e.nativeEvent.layout.y;
						}}
						style={[
							styles.row,
							{ borderBottomColor: c.border },
							fi === coffeeIdx && { backgroundColor: c.listUnderlay }
						]}
						underlayColor={c.listUnderlay}
						onPress={function () {
							Linking.openURL("https://buymeacoffee.com/ammaryaserh");
						}}
						data-type="list-item">
						<View style={styles.rowInner}>
							<View style={styles.rowLeft}>
								<Icon
									name="coffee"
									size={18}
									color={c.textTertiary}
								/>
								<Text style={[styles.rowLabel, { color: c.textSecondary }]}>Buy Me a Coffee</Text>
							</View>
							<Icon
								name="external-link"
								size={14}
								color={c.textPlaceholder}
							/>
						</View>
					</TouchableHighlight>
					{((instapayIdx = this._renderIdx++), null)}
					<TouchableHighlight
						onLayout={function (e: LayoutChangeEvent) {
							self._rowY[instapayIdx] = e.nativeEvent.layout.y;
						}}
						style={[
							styles.row,
							{ borderBottomColor: c.border },
							fi === instapayIdx && { backgroundColor: c.listUnderlay }
						]}
						underlayColor={c.listUnderlay}
						onPress={function () {
							Linking.openURL("https://ipn.eg/S/ammar.yaser1998/instapay/9txW8n");
						}}
						data-type="list-item">
						<View style={styles.rowInner}>
							<View style={styles.rowLeft}>
								<Icon
									name="smartphone"
									size={18}
									color={c.textTertiary}
								/>
								<Text style={[styles.rowLabel, { color: c.textSecondary }]}>Donate via InstaPay</Text>
							</View>
							<Icon
								name="external-link"
								size={14}
								color={c.textPlaceholder}
							/>
						</View>
					</TouchableHighlight>
					{((paypalIdx = this._renderIdx++), null)}
					<TouchableHighlight
						onLayout={function (e: LayoutChangeEvent) {
							self._rowY[paypalIdx] = e.nativeEvent.layout.y;
						}}
						style={[
							styles.row,
							{ borderBottomColor: c.border },
							fi === paypalIdx && { backgroundColor: c.listUnderlay }
						]}
						underlayColor={c.listUnderlay}
						onPress={function () {
							Linking.openURL("https://paypal.me/ammartechno?locale.x=en_US&country.x=EG");
						}}
						data-type="list-item">
						<View style={styles.rowInner}>
							<View style={styles.rowLeft}>
								<Icon
									name="heart"
									size={18}
									color={c.textTertiary}
								/>
								<Text style={[styles.rowLabel, { color: c.textSecondary }]}>Donate via PayPal</Text>
							</View>
							<Icon
								name="external-link"
								size={14}
								color={c.textPlaceholder}
							/>
						</View>
					</TouchableHighlight>

					<View style={styles.bottomPad} />
				</ScrollView>
			</View>
		);
	}
}

interface Styles {
	container: ViewStyle;
	sectionTitle: TextStyle;
	row: ViewStyle;
	rowInner: ViewStyle;
	rowLeft: ViewStyle;
	rowLabel: TextStyle;
	rowValue: TextStyle;
	toggle: ViewStyle;
	toggleKnob: ViewStyle;
	toggleKnobOn: ViewStyle;
	hint: TextStyle;
	devBio: ViewStyle;
	bioText: TextStyle;
	bottomPad: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
	container: {
		flex: 1
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "bold",
		paddingHorizontal: 16,
		paddingTop: 20,
		paddingBottom: 8
	},
	row: {
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1
	},
	rowInner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between"
	},
	rowLeft: {
		flexDirection: "row",
		alignItems: "center"
	},
	rowLabel: {
		fontSize: 15,
		marginLeft: 12
	},
	rowValue: {
		fontSize: 14
	},
	toggle: {
		width: 44,
		height: 24,
		borderRadius: 12,
		padding: 2,
		justifyContent: "center"
	},
	toggleKnob: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: "#FFFFFF"
	},
	toggleKnobOn: {
		alignSelf: "flex-end"
	},
	hint: {
		fontSize: 12,
		paddingHorizontal: 16,
		paddingTop: 8,
		lineHeight: 16
	},
	devBio: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1
	},
	bioText: {
		fontSize: 13,
		lineHeight: 18
	},
	bottomPad: {
		height: 40
	}
});
