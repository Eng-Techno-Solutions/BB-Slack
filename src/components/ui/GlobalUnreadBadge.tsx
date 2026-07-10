import { getColors } from "../../theme";
import Icon from "./Icon";
import type { GlobalUnreadBadgeProps, GlobalUnreadBadgeStyles } from "./types";
import React, { Component } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Persistent floating indicator shown on every screen (except the channel list
// itself) whenever there are unread messages. Tapping it jumps to the channel
// list. Presentational only — the parent decides the count and destination.
export default class GlobalUnreadBadge extends Component<GlobalUnreadBadgeProps> {
	render(): React.ReactNode {
		const { count, onPress } = this.props;
		if (count <= 0) return null;
		const c = getColors();
		return (
			<TouchableOpacity
				activeOpacity={0.85}
				onPress={onPress}
				style={[styles.wrap, { backgroundColor: c.accent }]}
				data-type="global-unread"
				hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
				<Icon
					name="message-square"
					size={16}
					color="#FFFFFF"
				/>
				<View style={[styles.count, { backgroundColor: c.badgeBg }]}>
					<Text style={styles.countText}>{count > 99 ? "99+" : count}</Text>
				</View>
			</TouchableOpacity>
		);
	}
}

const styles = StyleSheet.create<GlobalUnreadBadgeStyles>({
	wrap: {
		position: "absolute",
		right: 14,
		bottom: 20,
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.35,
		shadowRadius: 4,
		elevation: 6,
		zIndex: 900
	},
	count: {
		position: "absolute",
		top: -4,
		right: -4,
		minWidth: 18,
		height: 18,
		borderRadius: 9,
		paddingHorizontal: 4,
		alignItems: "center",
		justifyContent: "center"
	},
	countText: {
		color: "#FFFFFF",
		fontSize: 11,
		fontWeight: "bold"
	}
});
