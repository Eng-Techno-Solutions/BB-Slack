import { getColors } from "../theme";
import Icon from "./Icon";
import React, { Component } from "react";
import {
	ActivityIndicator,
	Dimensions,
	Image,
	Modal,
	PanResponder,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from "react-native";
import type {
	GestureResponderEvent,
	ImageSourcePropType,
	PanResponderInstance,
	TextStyle,
	ViewStyle
} from "react-native";

interface ImageViewerProps {
	visible: boolean;
	source: string;
	fileName?: string;
	token?: string;
	onClose: () => void;
}

interface ImageViewerState {
	loading: boolean;
	error: boolean;
	scale: number;
	translateX: number;
	translateY: number;
	dragging: boolean;
}

interface MousePosition {
	x: number;
	y: number;
}

interface WindowDimensions {
	width: number;
	height: number;
}

interface ImageViewerStyles {
	overlay: ViewStyle;
	topBar: ViewStyle;
	titleArea: ViewStyle;
	fileName: TextStyle;
	closeBtn: ViewStyle;
	imageArea: ViewStyle;
	imageContainer: ViewStyle;
	loader: ViewStyle;
	errorBox: ViewStyle;
	errorText: TextStyle;
	retryBtn: ViewStyle;
	retryText: TextStyle;
	zoomControls: ViewStyle;
	zoomBtn: ViewStyle;
	zoomBtnText: TextStyle;
}

function imageSource(url: string, token?: string): ImageSourcePropType {
	if (Platform.OS !== "web" && url && token) {
		return { uri: url, headers: { Authorization: "Bearer " + token } };
	}
	return { uri: url };
}

export default class ImageViewer extends Component<ImageViewerProps, ImageViewerState> {
	lastMouse: MousePosition;
	imgRef: React.RefObject<View>;
	_panResponder: PanResponderInstance | null;
	_baseScale: number;
	_baseTX: number;
	_baseTY: number;
	_pinchStartDist: number;
	_lastMoveX: number;
	_lastMoveY: number;

	constructor(props: ImageViewerProps) {
		super(props);
		this.state = {
			loading: true,
			error: false,
			scale: 1,
			translateX: 0,
			translateY: 0,
			dragging: false
		};
		this.lastMouse = { x: 0, y: 0 };
		this.imgRef = React.createRef();
		this._panResponder = null;
		this._baseScale = 1;
		this._baseTX = 0;
		this._baseTY = 0;
		this._pinchStartDist = 0;
		this._lastMoveX = 0;
		this._lastMoveY = 0;
	}

	componentDidUpdate(prevProps: ImageViewerProps): void {
		if (this.props.source !== prevProps.source) {
			this.setState({ loading: true, error: false, scale: 1, translateX: 0, translateY: 0 });
			this._panResponder = null;
		}
	}

	handleWheel(e: any): void {
		e.preventDefault();
		this.setState(function (prev: ImageViewerState) {
			const delta = e.deltaY > 0 ? -0.15 : 0.15;
			const next = Math.min(5, Math.max(0.5, prev.scale + delta));
			if (next <= 1) {
				return { scale: next, translateX: 0, translateY: 0 } as ImageViewerState;
			}
			return { scale: next } as ImageViewerState;
		});
	}

	handleMouseDown(e: any): void {
		if (this.state.scale <= 1) return;
		e.preventDefault();
		this.lastMouse = { x: e.clientX, y: e.clientY };
		this.setState({ dragging: true });
	}

	handleMouseMove(e: any): void {
		if (!this.state.dragging) return;
		const dx = e.clientX - this.lastMouse.x;
		const dy = e.clientY - this.lastMouse.y;
		this.lastMouse = { x: e.clientX, y: e.clientY };
		this.setState(function (prev: ImageViewerState) {
			return {
				translateX: prev.translateX + dx,
				translateY: prev.translateY + dy
			} as ImageViewerState;
		});
	}

	handleMouseUp(): void {
		this.setState({ dragging: false });
	}

	renderWebImage(win: WindowDimensions, source: string, token?: string): React.ReactNode {
		const self = this;
		const s = this.state;
		const c = getColors();

		return (
			<View style={styles.imageContainer}>
				{s.loading ? (
					<ActivityIndicator
						size="large"
						color={c.accent}
						style={styles.loader}
					/>
				) : null}
				<View
					ref={this.imgRef}
					style={
						{
							cursor: s.scale > 1 ? (s.dragging ? "grabbing" : "grab") : "zoom-in",
							overflow: "hidden",
							width: win.width - 32,
							height: win.height - 160,
							justifyContent: "center",
							alignItems: "center"
						} as any
					}
					{...({
						onWheel: function (e: any) {
							self.handleWheel(e.nativeEvent || e);
						},
						onMouseDown: function (e: any) {
							self.handleMouseDown(e.nativeEvent || e);
						},
						onMouseMove: function (e: any) {
							self.handleMouseMove(e.nativeEvent || e);
						},
						onMouseUp: function () {
							self.handleMouseUp();
						},
						onMouseLeave: function () {
							self.handleMouseUp();
						}
					} as any)}>
					<Image
						source={imageSource(source, token)}
						style={{
							width: win.width - 32,
							height: win.height - 160,
							transform: [
								{ scale: s.scale },
								{ translateX: s.translateX / s.scale },
								{ translateY: s.translateY / s.scale }
							]
						}}
						resizeMode="contain"
						onLoad={function () {
							self.setState({ loading: false });
						}}
						onError={function () {
							self.setState({ loading: false, error: true });
						}}
					/>
				</View>
				<View style={styles.zoomControls}>
					<TouchableOpacity
						style={[styles.zoomBtn, { borderColor: c.border }]}
						onPress={function () {
							self.setState(function (prev: ImageViewerState) {
								const next = Math.min(5, prev.scale + 0.5);
								return { scale: next } as ImageViewerState;
							});
						}}
						data-type="btn">
						<Text style={styles.zoomBtnText}>+</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.zoomBtn, { borderColor: c.border }]}
						onPress={function () {
							self.setState(function (prev: ImageViewerState) {
								const next = Math.max(0.5, prev.scale - 0.5);
								if (next <= 1) {
									return { scale: next, translateX: 0, translateY: 0 } as ImageViewerState;
								}
								return { scale: next } as ImageViewerState;
							});
						}}
						data-type="btn">
						<Text style={styles.zoomBtnText}>{"\u2212"}</Text>
					</TouchableOpacity>
					{s.scale !== 1 ? (
						<TouchableOpacity
							style={[styles.zoomBtn, { borderColor: c.border }]}
							onPress={function () {
								self.setState({ scale: 1, translateX: 0, translateY: 0 });
							}}
							data-type="btn">
							<Text style={styles.zoomBtnText}>{"\u21BA"}</Text>
						</TouchableOpacity>
					) : null}
				</View>
			</View>
		);
	}

	_getDistance(touches: any[]): number {
		const dx = touches[0].pageX - touches[1].pageX;
		const dy = touches[0].pageY - touches[1].pageY;
		return Math.sqrt(dx * dx + dy * dy);
	}

	_setupPanResponder(): PanResponderInstance {
		if (this._panResponder) return this._panResponder;
		const self = this;
		this._baseScale = 1;
		this._baseTX = 0;
		this._baseTY = 0;
		this._pinchStartDist = 0;
		this._lastMoveX = 0;
		this._lastMoveY = 0;

		this._panResponder = PanResponder.create({
			onStartShouldSetPanResponder: function () {
				return true;
			},
			onMoveShouldSetPanResponder: function () {
				return true;
			},
			onPanResponderGrant: function (e: GestureResponderEvent) {
				const touches = (e.nativeEvent as any).touches;
				self._baseScale = self.state.scale;
				self._baseTX = self.state.translateX;
				self._baseTY = self.state.translateY;
				if (touches && touches.length === 2) {
					self._pinchStartDist = self._getDistance(touches);
				} else if (touches && touches.length === 1) {
					self._lastMoveX = touches[0].pageX;
					self._lastMoveY = touches[0].pageY;
				}
			},
			onPanResponderMove: function (e: GestureResponderEvent) {
				const touches = (e.nativeEvent as any).touches;
				if (touches && touches.length === 2) {
					const dist = self._getDistance(touches);
					if (self._pinchStartDist > 0) {
						const newScale = Math.min(5, Math.max(0.5, self._baseScale * (dist / self._pinchStartDist)));
						self.setState({ scale: newScale });
					}
				} else if (touches && touches.length === 1 && self.state.scale > 1) {
					const dx = touches[0].pageX - self._lastMoveX;
					const dy = touches[0].pageY - self._lastMoveY;
					self._lastMoveX = touches[0].pageX;
					self._lastMoveY = touches[0].pageY;
					self.setState(function (prev: ImageViewerState) {
						return {
							translateX: prev.translateX + dx,
							translateY: prev.translateY + dy
						} as ImageViewerState;
					});
				}
			},
			onPanResponderRelease: function () {
				if (self.state.scale < 1) {
					self.setState({ scale: 1, translateX: 0, translateY: 0 });
				}
			}
		});
		return this._panResponder;
	}

	renderNativeImage(win: WindowDimensions, source: string, token?: string): React.ReactNode {
		const self = this;
		const s = this.state;
		const c = getColors();
		const panHandlers = this._setupPanResponder().panHandlers;

		return (
			<View style={styles.imageContainer}>
				{s.loading ? (
					<ActivityIndicator
						size="large"
						color={c.accent}
						style={styles.loader}
					/>
				) : null}
				<View
					style={{
						width: win.width - 32,
						height: win.height - 160,
						overflow: "hidden"
					}}
					{...panHandlers}>
					<Image
						source={imageSource(source, token)}
						style={{
							width: win.width - 32,
							height: win.height - 160,
							transform: [
								{ scale: s.scale },
								{ translateX: s.translateX / s.scale },
								{ translateY: s.translateY / s.scale }
							]
						}}
						resizeMode="contain"
						onLoad={function () {
							self.setState({ loading: false });
						}}
						onError={function () {
							self.setState({ loading: false, error: true });
						}}
					/>
				</View>
				<View style={styles.zoomControls}>
					<TouchableOpacity
						style={[styles.zoomBtn, { borderColor: c.border }]}
						onPress={function () {
							self.setState(function (prev: ImageViewerState) {
								const next = Math.min(5, prev.scale + 0.5);
								return { scale: next } as ImageViewerState;
							});
						}}
						data-type="btn">
						<Text style={styles.zoomBtnText}>+</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.zoomBtn, { borderColor: c.border }]}
						onPress={function () {
							self.setState(function (prev: ImageViewerState) {
								const next = Math.max(0.5, prev.scale - 0.5);
								if (next <= 1) {
									return { scale: next, translateX: 0, translateY: 0 } as ImageViewerState;
								}
								return { scale: next } as ImageViewerState;
							});
						}}
						data-type="btn">
						<Text style={styles.zoomBtnText}>{"\u2212"}</Text>
					</TouchableOpacity>
					{s.scale !== 1 ? (
						<TouchableOpacity
							style={[styles.zoomBtn, { borderColor: c.border }]}
							onPress={function () {
								self.setState({ scale: 1, translateX: 0, translateY: 0 });
							}}
							data-type="btn">
							<Text style={styles.zoomBtnText}>{"\u21BA"}</Text>
						</TouchableOpacity>
					) : null}
				</View>
			</View>
		);
	}

	render(): React.ReactNode {
		const { visible, source, fileName, token, onClose } = this.props;
		const { error } = this.state;
		const self = this;
		const win = Dimensions.get("window");
		const c = getColors();

		return (
			<Modal
				visible={visible}
				transparent={true}
				animationType="fade"
				onRequestClose={onClose}>
				<View style={[styles.overlay, { backgroundColor: c.overlayHeavy }]}>
					<View
						style={[styles.topBar, { backgroundColor: "rgba(0,0,0,0.85)", borderBottomColor: c.border }]}>
						<View style={styles.titleArea}>
							<Text
								style={[styles.fileName, { color: "#FFFFFF" }]}
								numberOfLines={1}>
								{fileName || "Image"}
							</Text>
						</View>
						<TouchableOpacity
							style={[styles.closeBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
							onPress={onClose}
							data-type="icon-btn">
							<Icon
								name="close"
								size={18}
								color="#FFFFFF"
							/>
						</TouchableOpacity>
					</View>

					<View style={styles.imageArea}>
						{error ? (
							<View style={[styles.errorBox, { backgroundColor: c.bgTertiary }]}>
								<Text style={[styles.errorText, { color: c.textTertiary }]}>Failed to load image</Text>
								<TouchableOpacity
									style={[styles.retryBtn, { backgroundColor: c.accent }]}
									onPress={function () {
										self.setState({ loading: true, error: false, scale: 1, translateX: 0, translateY: 0 });
									}}
									data-type="btn">
									<Text style={styles.retryText}>Retry</Text>
								</TouchableOpacity>
							</View>
						) : Platform.OS === "web" ? (
							this.renderWebImage(win, source, token)
						) : (
							this.renderNativeImage(win, source, token)
						)}
					</View>
				</View>
			</Modal>
		);
	}
}

const styles = StyleSheet.create<ImageViewerStyles>({
	overlay: {
		flex: 1
	},
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1
	},
	titleArea: {
		flex: 1
	},
	fileName: {
		fontSize: 16,
		fontWeight: "700"
	},
	closeBtn: {
		width: 36,
		height: 36,
		borderRadius: 4,
		justifyContent: "center",
		alignItems: "center",
		marginLeft: 12
	},
	imageArea: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 16
	},
	imageContainer: {
		justifyContent: "center",
		alignItems: "center"
	},
	loader: {
		position: "absolute",
		zIndex: 1
	},
	errorBox: {
		padding: 24,
		borderRadius: 8,
		alignItems: "center"
	},
	errorText: {
		fontSize: 15,
		marginBottom: 12
	},
	retryBtn: {
		paddingHorizontal: 20,
		paddingVertical: 8,
		borderRadius: 4
	},
	retryText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "600"
	},
	zoomControls: {
		position: "absolute",
		bottom: 16,
		flexDirection: "row",
		gap: 8
	},
	zoomBtn: {
		backgroundColor: "rgba(0,0,0,0.7)",
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		justifyContent: "center",
		alignItems: "center",
		marginHorizontal: 4
	},
	zoomBtnText: {
		color: "#FFFFFF",
		fontSize: 18,
		fontWeight: "700",
		includeFontPadding: false,
		textAlignVertical: "center"
	}
});
