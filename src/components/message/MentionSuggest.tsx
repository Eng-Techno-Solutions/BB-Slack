import { getColors } from "../../theme";
import type { UsersMap } from "../../types";
import Avatar from "./Avatar";
import type {
	FilteredUser,
	MentionSuggestProps,
	MentionSuggestState,
	MentionSuggestStyles
} from "./types";
import React, { Component } from "react";
import { ScrollView, StyleSheet, Text, TouchableHighlight, View } from "react-native";

function getLastMentionQuery(text: string): string | null {
	var at = text.lastIndexOf("@");
	if (at === -1) return null;
	var before = at > 0 ? text.charAt(at - 1) : " ";
	if (before !== " " && before !== "\n") return null;
	return text.substring(at + 1).toLowerCase();
}

function filterUsers(usersMap: UsersMap, query: string): FilteredUser[] {
	var results: FilteredUser[] = [];
	var keys = Object.keys(usersMap);
	for (var i = 0; i < keys.length; i++) {
		var u = usersMap[keys[i]];
		if (u.deleted || u.is_bot) continue;
		var name = (u.real_name || u.name || "").toLowerCase();
		var display = ((u.profile && u.profile.display_name) || "").toLowerCase();
		if (
			name.indexOf(query) !== -1 ||
			display.indexOf(query) !== -1 ||
			keys[i].toLowerCase().indexOf(query) !== -1
		) {
			results.push({
				id: keys[i],
				name: u.real_name || u.name || keys[i],
				display: (u.profile && u.profile.display_name) || ""
			});
		}
		if (results.length >= 8) break;
	}
	return results;
}

export default class MentionSuggest extends Component<MentionSuggestProps, MentionSuggestState> {
	constructor(props: MentionSuggestProps) {
		super(props);
		this.state = { focusIndex: 0 };
	}

	componentDidUpdate(prevProps: MentionSuggestProps): void {
		if (prevProps.text !== this.props.text) {
			this.setState({ focusIndex: 0 });
		}
	}

	getUsers(): FilteredUser[] {
		var { text, usersMap } = this.props;
		if (!text || !usersMap) return [];
		var query = getLastMentionQuery(text);
		if (query === null) return [];
		return filterUsers(usersMap, query);
	}

	isVisible(): boolean {
		return this.getUsers().length > 0;
	}

	handleKeyEvent(action: string): boolean {
		var users = this.getUsers();
		if (users.length === 0) return false;
		var idx = this.state.focusIndex;

		if (action === "up") {
			this.setState({ focusIndex: idx <= 0 ? 0 : idx - 1 });
			return true;
		} else if (action === "down") {
			this.setState({ focusIndex: idx < 0 ? 0 : Math.min(idx + 1, users.length - 1) });
			return true;
		} else if (action === "select") {
			var safeIdx = idx < 0 ? 0 : idx;
			var u = users[safeIdx];
			if (u) this.props.onSelect(u.id, u.name);
			return true;
		}
		return false;
	}

	render(): React.ReactNode {
		var { usersMap, onSelect } = this.props;
		var users = this.getUsers();
		if (users.length === 0) return null;

		var c = getColors();
		var focusIndex = this.state.focusIndex;

		return (
			<ScrollView
				style={[styles.container, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
				keyboardShouldPersistTaps="always">
				{users.map(function (u: FilteredUser, i: number) {
					var focused = i === focusIndex;

					return (
						<TouchableHighlight
							key={u.id}
							style={[styles.item, focused && { backgroundColor: c.messageUnderlay }]}
							underlayColor={c.messageUnderlay}
							data-type="mention-item"
							onPress={function () {
								onSelect(u.id, u.name);
							}}>
							<View style={styles.itemInner}>
								<View style={styles.avatarWrap}>
									<Avatar
										userId={u.id}
										userName={u.name}
										usersMap={usersMap}
										size={28}
									/>
								</View>
								<Text style={[styles.name, { color: c.textSecondary }]}>{u.name}</Text>
								{u.display ? (
									<Text style={[styles.display, { color: c.textTertiary }]}>{u.display}</Text>
								) : null}
							</View>
						</TouchableHighlight>
					);
				})}
			</ScrollView>
		);
	}
}

var styles = StyleSheet.create<MentionSuggestStyles>({
	container: {
		borderTopWidth: 1,
		maxHeight: 200
	},
	item: {
		paddingHorizontal: 12,
		paddingVertical: 8
	},
	itemInner: {
		flexDirection: "row",
		alignItems: "center"
	},
	avatarWrap: {
		marginRight: 10
	},
	name: {
		fontSize: 14,
		fontWeight: "600",
		marginRight: 8
	},
	display: {
		fontSize: 13
	}
});
