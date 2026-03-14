import { getColors } from "../theme";
import Icon from "./Icon";
import SlackText from "./SlackText";
import React, { Component } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

interface HeaderProps {
	title: string;
	subtitle?: string;
	onBack?: () => void;
	rightLabel?: string;
	rightIcon?: string;
	onRight?: () => void;
}

interface HeaderStyles {
	header: ViewStyle;
	left: ViewStyle;
	center: ViewStyle;
	right: ViewStyle;
	backBtn: ViewStyle;
	title: TextStyle;
	subtitle: TextStyle;
	rightBtn: ViewStyle;
	rightText: TextStyle;
}

export default class Header extends Component<HeaderProps> {
	render(): React.ReactNode {
		const { title, subtitle, onBack, rightLabel, rightIcon, onRight } = this.props;
		const c = getColors();
		return (
			<View
				style={[styles.header, { backgroundColor: c.bgHeader, borderBottomColor: c.headerBorder }]}>
				<View style={styles.left}>
					{onBack ? (
						<TouchableOpacity
							onPress={onBack}
							style={styles.backBtn}
							data-type="header-btn">
							<Icon
								name="chevron-left"
								size={22}
								color={c.headerIcon}
							/>
						</TouchableOpacity>
					) : null}
				</View>
				<View style={styles.center}>
					<Text
						style={[styles.title, { color: c.headerText }]}
						numberOfLines={1}>
						{title}
					</Text>
					{subtitle ? (
						<SlackText
							text={subtitle}
							style={[styles.subtitle, { color: c.tabText }]}
							numberOfLines={1}
						/>
					) : null}
				</View>
				<View style={styles.right}>
					{onRight ? (
						<TouchableOpacity
							onPress={onRight}
							style={styles.rightBtn}
							data-type="header-btn">
							{rightIcon ? (
								<Icon
									name={rightIcon}
									size={20}
									color={c.headerIcon}
								/>
							) : rightLabel ? (
								<Text style={[styles.rightText, { color: c.headerIcon }]}>{rightLabel}</Text>
							) : null}
						</TouchableOpacity>
					) : null}
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create<HeaderStyles>({
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 10,
		borderBottomWidth: 1
	},
	left: {
		width: 50
	},
	center: {
		flex: 1,
		alignItems: "center"
	},
	right: {
		width: 50,
		alignItems: "flex-end"
	},
	backBtn: {
		padding: 4
	},
	title: {
		fontSize: 16,
		fontWeight: "bold"
	},
	subtitle: {
		fontSize: 11,
		marginTop: 1
	},
	rightBtn: {
		padding: 4
	},
	rightText: {
		fontSize: 13
	}
});
