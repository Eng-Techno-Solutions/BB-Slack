import { getAvatarColor, getProfileImage } from "../../utils/avatar";
import type { AvatarProps } from "./types";
import React, { Component } from "react";
import { Image, Text, View } from "react-native";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";
import { StyleSheet } from "react-native";

export default class Avatar extends Component<AvatarProps> {
	shouldComponentUpdate(nextProps: AvatarProps): boolean {
		return (
			this.props.userId !== nextProps.userId ||
			this.props.userName !== nextProps.userName ||
			this.props.size !== nextProps.size
		);
	}

	render(): React.ReactNode {
		const { userId, userName, usersMap, size } = this.props;
		const profileImg = getProfileImage(userId, usersMap);
		const initial = (userName || "?").charAt(0).toUpperCase();
		const avatarBg = getAvatarColor(userId);
		const s = size || 36;
		const sizeStyle = { width: s, height: s, borderRadius: 4 };

		if (profileImg) {
			return (
				<Image
					source={{ uri: profileImg }}
					style={[styles.avatar, sizeStyle]}
				/>
			);
		}
		return (
			<View style={[styles.avatar, styles.avatarFallback, sizeStyle, { backgroundColor: avatarBg }]}>
				<Text style={styles.avatarInitial}>{initial}</Text>
			</View>
		);
	}
}

const styles = StyleSheet.create<{
	avatar: ImageStyle;
	avatarFallback: ViewStyle;
	avatarInitial: TextStyle;
}>({
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 4
	},
	avatarFallback: {
		justifyContent: "center",
		alignItems: "center"
	},
	avatarInitial: {
		color: "#FFFFFF",
		fontSize: 13,
		fontWeight: "bold"
	}
});
