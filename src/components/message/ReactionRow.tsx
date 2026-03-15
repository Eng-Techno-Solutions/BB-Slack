import { getColors } from "../../theme";
import type { SlackReaction } from "../../types";
import { getTwemojiUrlByName } from "../../utils/emoji";
import { emojiFromName } from "../../utils/emoji";
import { getUserName } from "../../utils/format";
import { styles } from "./MessageItem.styles";
import type { ReactionRowProps, ReactionRowState } from "./types";
import React, { Component } from "react";
import { Image, Platform, Text, TouchableOpacity, View } from "react-native";

const IS_ANDROID: boolean = Platform.OS === "android";

export default class ReactionRow extends Component<ReactionRowProps, ReactionRowState> {
	constructor(props: ReactionRowProps) {
		super(props);
		this.state = { showReactionUsers: null };
	}

	shouldComponentUpdate(nextProps: ReactionRowProps, nextState: ReactionRowState): boolean {
		if (this.state.showReactionUsers !== nextState.showReactionUsers) return true;
		const prevR = this.props.reactions;
		const nextR = nextProps.reactions;
		if (prevR.length !== nextR.length) return true;
		for (let i = 0; i < prevR.length; i++) {
			if (prevR[i].name !== nextR[i].name || prevR[i].count !== nextR[i].count) return true;
		}
		return false;
	}

	render(): React.ReactNode {
		const { reactions, currentUserId, usersMap, onReactionPress } = this.props;
		const self = this;

		if (reactions.length === 0) return null;

		const c = getColors();

		return (
			<View style={styles.reactionsRow}>
				{reactions.map(function (r: SlackReaction, i: number) {
					const emoji = emojiFromName(r.name);
					const reacted = r.users && r.users.indexOf(currentUserId) !== -1;
					const isExpanded = self.state.showReactionUsers === i;
					return (
						<View
							key={i}
							style={styles.reactionWrapper}>
							<TouchableOpacity
								style={[
									styles.reactionBadge,
									{ backgroundColor: c.bgTertiary, borderColor: c.border },
									reacted && { backgroundColor: c.reactionActiveBg, borderColor: c.accent }
								]}
								activeOpacity={0.7}
								data-type="reaction"
								onPress={function () {
									if (onReactionPress) {
										onReactionPress(r.name, !!reacted);
									}
								}}
								onLongPress={function () {
									self.setState({ showReactionUsers: isExpanded ? null : i });
								}}>
								{IS_ANDROID ? (
									<Image
										source={{ uri: getTwemojiUrlByName(r.name) }}
										style={styles.reactionImg}
									/>
								) : emoji ? (
									<Text style={styles.reactionEmoji}>{emoji}</Text>
								) : (
									<Text style={[styles.reactionShortcode, { color: c.textSecondary }]}>:{r.name}:</Text>
								)}
								<Text
									style={[
										styles.reactionCount,
										{ color: c.textTertiary },
										reacted && { color: c.accentLight }
									]}>
									{r.count}
								</Text>
							</TouchableOpacity>
							{isExpanded && r.users ? (
								<View
									style={[
										styles.reactionTooltip,
										{ backgroundColor: c.tooltipBg, borderColor: c.borderInput }
									]}>
									<Text style={[styles.reactionTooltipText, { color: c.textSecondary }]}>
										{r.users
											.map(function (uid: string) {
												return getUserName(uid, usersMap);
											})
											.join(", ")}
									</Text>
								</View>
							) : null}
						</View>
					);
				})}
			</View>
		);
	}
}
