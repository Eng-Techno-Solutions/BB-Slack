import { getColors } from "../../theme";
import type { SlackAttachment, UsersMap } from "../../types";
import { styles } from "./MessageItem.styles";
import SlackText from "./SlackText";
import React, { Component } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";

interface AttachmentRendererProps {
	attachments: SlackAttachment[];
	usersMap: UsersMap;
}

const NAMED_COLORS: Record<string, string> = {
	good: "#2EB67D",
	warning: "#ECB22E",
	danger: "#E01E5A"
};

function resolveBarColor(color: string | undefined, fallback: string): string {
	if (!color) return fallback;
	if (NAMED_COLORS[color]) return NAMED_COLORS[color];
	if (color[0] === "#") return color;
	if (/^[0-9a-fA-F]{6}$/.test(color)) return "#" + color;
	return fallback;
}

function openLink(url: string): void {
	Linking.openURL(url).catch(function () {});
}

export default class AttachmentRenderer extends Component<AttachmentRendererProps> {
	render(): React.ReactNode {
		const { attachments, usersMap } = this.props;
		const c = getColors();

		return (
			<View style={styles.attachmentsContainer}>
				{attachments.map(function (att: SlackAttachment, i: number) {
					const barColor = resolveBarColor(att.color, c.systemLine);
					const titleLink = att.title_link;

					return (
						<View key={i}>
							{att.pretext ? (
								<SlackText
									text={att.pretext}
									usersMap={usersMap}
									style={[styles.attachmentPretext, { color: c.textSecondary }]}
								/>
							) : null}

							<View style={styles.attachmentBlock}>
								<View style={[styles.attachmentBar, { backgroundColor: barColor }]} />
								<View style={styles.attachmentBody}>
									{att.author_name ? (
										<Text style={[styles.attachmentAuthor, { color: c.textTertiary }]}>
											{att.author_name}
										</Text>
									) : null}

									{att.title ? (
										titleLink ? (
											<TouchableOpacity
												onPress={function () {
													openLink(titleLink);
												}}
												data-type="attachment-title">
												<Text style={[styles.attachmentTitle, { color: c.accentLight }]}>{att.title}</Text>
											</TouchableOpacity>
										) : (
											<Text style={[styles.attachmentTitle, { color: c.textSecondary }]}>{att.title}</Text>
										)
									) : null}

									{att.text ? (
										<SlackText
											text={att.text}
											usersMap={usersMap}
											style={[styles.attachmentText, { color: c.textSecondary }]}
										/>
									) : null}

									{att.footer ? (
										<Text style={[styles.attachmentFooter, { color: c.textTertiary }]}>{att.footer}</Text>
									) : null}
								</View>
							</View>
						</View>
					);
				})}
			</View>
		);
	}
}
