import { getColors } from "../theme";
import React, { Component } from "react";
import { Modal, StyleSheet, Text, TouchableHighlight, TouchableOpacity, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

interface ActionSheetAction {
	label: string;
	onPress: () => void;
	destructive?: boolean;
}

interface ActionSheetProps {
	visible: boolean;
	actions: ActionSheetAction[];
	onClose: () => void;
}

interface ActionSheetStyles {
	overlay: ViewStyle;
	sheet: ViewStyle;
	action: ViewStyle;
	actionText: TextStyle;
	cancelBtn: ViewStyle;
	cancelText: TextStyle;
}

export default class ActionSheet extends Component<ActionSheetProps> {
	render(): React.ReactNode {
		const { visible, actions, onClose } = this.props;
		const c = getColors();

		return (
			<Modal
				visible={visible}
				transparent={true}
				animationType="fade"
				onRequestClose={onClose}>
				<TouchableOpacity
					style={[styles.overlay, { backgroundColor: c.overlayLight }]}
					activeOpacity={1}
					onPress={onClose}
					data-type="overlay">
					<View style={[styles.sheet, { backgroundColor: c.bgTertiary }]}>
						{actions.map(function (action: ActionSheetAction, i: number) {
							return (
								<TouchableHighlight
									key={i}
									style={[styles.action, { borderBottomColor: c.border }]}
									underlayColor={c.actionUnderlay}
									onPress={action.onPress}
									data-type="action-item">
									<Text
										style={[
											styles.actionText,
											{ color: c.textSecondary },
											action.destructive && { color: c.error }
										]}>
										{action.label}
									</Text>
								</TouchableHighlight>
							);
						})}
						<TouchableOpacity
							style={styles.cancelBtn}
							onPress={onClose}
							data-type="text-btn">
							<Text style={[styles.cancelText, { color: c.textTertiary }]}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>
		);
	}
}

const styles = StyleSheet.create<ActionSheetStyles>({
	overlay: {
		flex: 1,
		justifyContent: "flex-end"
	},
	sheet: {
		borderTopLeftRadius: 12,
		borderTopRightRadius: 12,
		paddingBottom: 20
	},
	action: {
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderBottomWidth: 1
	},
	actionText: {
		fontSize: 16
	},
	cancelBtn: {
		paddingVertical: 14,
		paddingHorizontal: 20,
		marginTop: 8,
		alignItems: "center"
	},
	cancelText: {
		fontSize: 16
	}
});
