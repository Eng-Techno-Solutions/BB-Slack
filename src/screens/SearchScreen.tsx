import Header from "../components/Header";
import Icon from "../components/Icon";
import SlackText from "../components/SlackText";
import { getColors } from "../theme";
import { formatDateFull, getUserName } from "../utils/format";
import { addKeyEventListener, removeKeyEventListener } from "../utils/keyEvents";
import React, { Component } from "react";
import {
	ActivityIndicator,
	FlatList,
	StyleSheet,
	Text,
	TextInput,
	TouchableHighlight,
	TouchableOpacity,
	View
} from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

interface SlackUser {
	id: string;
	name?: string;
	real_name?: string;
	profile?: Record<string, unknown>;
	[key: string]: unknown;
}

interface SearchMatch {
	ts: string;
	text: string;
	user?: string;
	username?: string;
	channel?: { id: string; name: string };
	[key: string]: unknown;
}

interface SlackAPI {
	searchMessages(query: string): Promise<{ messages?: { matches?: SearchMatch[] } }>;
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
	usersMap: Record<string, SlackUser>;
	onBack?: () => void;
	onSelectMessage?: (msg: SearchMatch) => void;
	themeMode?: string;
}

interface State {
	query: string;
	results: SearchMatch[];
	loading: boolean;
	searched: boolean;
	focusIndex: number;
}

export default class SearchScreen extends Component<Props, State> {
	_keySub: KeySub | null;
	_list: FlatList<SearchMatch> | null;
	_listRef: (r: FlatList<SearchMatch> | null) => void;
	_keyExtractor: (item: SearchMatch) => string;
	_renderItem: (obj: { item: SearchMatch; index: number }) => React.ReactElement;
	_onChangeText: (t: string) => void;
	_onSubmit: () => void;

	constructor(props: Props) {
		super(props);
		this.state = {
			query: "",
			results: [],
			loading: false,
			searched: false,
			focusIndex: -1
		};
		this._keySub = null;
		this._list = null;
		const self = this;
		this._listRef = function (r: FlatList<SearchMatch> | null) {
			self._list = r;
		};
		this._keyExtractor = function (item: SearchMatch) {
			return item.ts;
		};
		this._renderItem = function (obj: { item: SearchMatch; index: number }) {
			return self.renderItem(obj.item, obj.index === self.state.focusIndex);
		};
		this._onChangeText = function (t: string) {
			self.setState({ query: t });
		};
		this._onSubmit = function () {
			self.doSearch();
		};
	}

	componentDidMount(): void {
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
		const results = this.state.results;
		const idx = this.state.focusIndex;

		if (action === "down") {
			if (results.length === 0) return;
			const next = idx < 0 ? 0 : Math.min(idx + 1, results.length - 1);
			this.setState({ focusIndex: next });
			if (this._list)
				try {
					this._list.scrollToIndex({ index: next, viewOffset: 80, animated: true });
				} catch (_e) {}
		} else if (action === "up") {
			if (results.length === 0) return;
			const prev = idx <= 0 ? 0 : idx - 1;
			this.setState({ focusIndex: prev });
			if (this._list)
				try {
					this._list.scrollToIndex({ index: prev, viewOffset: 80, animated: true });
				} catch (_e) {}
		} else if (action === "select" && idx >= 0 && idx < results.length) {
			this.props.onSelectMessage && this.props.onSelectMessage(results[idx]);
		} else if (action === "back") {
			this.props.onBack && this.props.onBack();
		}
	}

	async doSearch(): Promise<void> {
		const { slack } = this.props;
		const { query } = this.state;
		if (!query.trim()) return;

		this.setState({ loading: true, searched: true });
		try {
			const res = await slack.searchMessages(query.trim());
			const matches = res.messages && res.messages.matches ? res.messages.matches : [];
			this.setState({ results: matches, loading: false });
		} catch (err) {
			this.setState({ results: [], loading: false });
		}
	}

	renderItem(item: SearchMatch, focused: boolean): React.ReactElement {
		const { usersMap, onSelectMessage } = this.props;
		const c = getColors();
		const userName = getUserName(item.user || item.username || "", usersMap);
		const channelName = item.channel && item.channel.name ? "#" + item.channel.name : "";

		return (
			<TouchableHighlight
				style={[
					styles.item,
					{ borderBottomColor: c.border },
					focused && { backgroundColor: c.listUnderlay }
				]}
				underlayColor={c.listUnderlay}
				onPress={function () {
					onSelectMessage && onSelectMessage(item);
				}}
				data-type="list-item">
				<View>
					<View style={styles.itemHeader}>
						<Text style={[styles.itemUser, { color: c.textSecondary }]}>{userName}</Text>
						<Text style={[styles.itemChannel, { color: c.accentLight }]}>{channelName}</Text>
					</View>
					<SlackText
						text={item.text}
						usersMap={usersMap}
						style={[styles.itemText, { color: c.textSecondary }]}
					/>
					<Text style={[styles.itemTime, { color: c.textTertiary }]}>{formatDateFull(item.ts)}</Text>
				</View>
			</TouchableHighlight>
		);
	}

	render(): React.ReactElement {
		const { onBack } = this.props;
		const { query, results, loading, searched } = this.state;
		const _self = this;
		const c = getColors();

		return (
			<View style={[styles.container, { backgroundColor: c.bg }]}>
				<Header
					title="Search"
					onBack={onBack}
				/>
				<View style={[styles.searchRow, { borderBottomColor: c.border }]}>
					<TextInput
						style={[
							styles.input,
							{ backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: c.borderInput }
						]}
						placeholder="Search messages..."
						placeholderTextColor={c.textPlaceholder}
						value={query}
						onChangeText={this._onChangeText}
						onSubmitEditing={this._onSubmit}
						returnKeyType="search"
						autoCorrect={false}
						autoFocus={true}
					/>
					<TouchableOpacity
						style={[styles.searchBtn, { backgroundColor: c.green }]}
						onPress={this._onSubmit}
						data-type="btn">
						<Icon
							name="search"
							size={18}
							color="#ffffff"
						/>
					</TouchableOpacity>
				</View>

				{loading ? (
					<View style={styles.center}>
						<ActivityIndicator
							size="large"
							color={c.accent}
						/>
					</View>
				) : (
					<FlatList
						ref={this._listRef}
						data={results}
						keyExtractor={this._keyExtractor}
						renderItem={this._renderItem}
						removeClippedSubviews={true}
						maxToRenderPerBatch={10}
						windowSize={9}
						initialNumToRender={15}
						ListEmptyComponent={
							searched ? (
								<View style={styles.center}>
									<Text style={[styles.emptyText, { color: c.textTertiary }]}>No results</Text>
								</View>
							) : null
						}
					/>
				)}
			</View>
		);
	}
}

interface Styles {
	container: ViewStyle;
	searchRow: ViewStyle;
	input: TextStyle;
	searchBtn: ViewStyle;
	center: ViewStyle;
	emptyText: TextStyle;
	item: ViewStyle;
	itemHeader: ViewStyle;
	itemUser: TextStyle;
	itemChannel: TextStyle;
	itemText: TextStyle;
	itemTime: TextStyle;
}

const styles = StyleSheet.create<Styles>({
	container: {
		flex: 1
	},
	searchRow: {
		flexDirection: "row",
		padding: 8,
		borderBottomWidth: 1
	},
	input: {
		flex: 1,
		fontSize: 15,
		paddingHorizontal: 12,
		paddingVertical: 9,
		borderRadius: 4,
		borderWidth: 1,
		marginRight: 8
	},
	searchBtn: {
		paddingHorizontal: 16,
		paddingVertical: 9,
		borderRadius: 4,
		justifyContent: "center"
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
	item: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1
	},
	itemHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 4
	},
	itemUser: {
		fontSize: 14,
		fontWeight: "bold"
	},
	itemChannel: {
		fontSize: 12
	},
	itemText: {
		fontSize: 14,
		lineHeight: 20
	},
	itemTime: {
		fontSize: 11,
		marginTop: 4
	}
});
