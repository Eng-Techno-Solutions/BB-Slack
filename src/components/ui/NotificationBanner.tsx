import { getColors } from "../../theme";
import type { NotificationBannerProps, NotificationBannerStyles } from "./types";
import React, { Component } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";

const SLIDE_DURATION = 220;

// App-wide transient banner shown when a message arrives on a screen other
// than the one being viewed (the foreground analog of an OS notification,
// which is suppressed while the app is open). Presentational only — the parent
// owns visibility, auto-dismiss timing, and the sound.
export default class NotificationBanner extends Component<NotificationBannerProps> {
	private _translateY: Animated.Value;

	constructor(props: NotificationBannerProps) {
		super(props);
		this._translateY = new Animated.Value(-120);
	}

	componentDidMount(): void {
		this._animateIn();
	}

	componentDidUpdate(prev: NotificationBannerProps): void {
		// A new message reusing the mounted banner re-triggers the slide-in.
		if (prev.title !== this.props.title || prev.body !== this.props.body) {
			this._translateY.setValue(-120);
			this._animateIn();
		}
	}

	_animateIn(): void {
		Animated.timing(this._translateY, {
			toValue: 0,
			duration: SLIDE_DURATION,
			useNativeDriver: true
		}).start();
	}

	render(): React.ReactNode {
		const { title, body, onPress, onDismiss } = this.props;
		const c = getColors();
		return (
			<Animated.View
				style={[styles.wrap, { transform: [{ translateY: this._translateY }] }]}
				pointerEvents="box-none">
				<TouchableOpacity
					activeOpacity={0.85}
					onPress={onPress}
					style={[styles.banner, { backgroundColor: c.bgHeader, borderColor: c.border }]}
					data-type="notif-banner">
					<Text
						style={[styles.title, { color: c.headerText }]}
						numberOfLines={1}>
						{title}
					</Text>
					<Text
						style={[styles.body, { color: c.textSecondary }]}
						numberOfLines={2}>
						{body}
					</Text>
					<TouchableOpacity
						onPress={onDismiss}
						style={styles.close}
						hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						data-type="notif-banner-close">
						<Text style={[styles.closeText, { color: c.textSecondary }]}>×</Text>
					</TouchableOpacity>
				</TouchableOpacity>
			</Animated.View>
		);
	}
}

const styles = StyleSheet.create<NotificationBannerStyles>({
	wrap: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		paddingTop: 8,
		paddingHorizontal: 8,
		zIndex: 1000
	},
	banner: {
		borderRadius: 10,
		borderWidth: StyleSheet.hairlineWidth,
		paddingVertical: 10,
		paddingLeft: 14,
		paddingRight: 34,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 6
	},
	title: {
		fontSize: 14,
		fontWeight: "bold",
		marginBottom: 2
	},
	body: {
		fontSize: 13
	},
	close: {
		position: "absolute",
		top: 6,
		right: 8
	},
	closeText: {
		fontSize: 20,
		lineHeight: 22,
		fontWeight: "bold"
	}
});
