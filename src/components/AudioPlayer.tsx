import { getColors } from "../theme";
import audioDownload from "../utils/audioDownload";
import Icon from "./Icon";
import React, { Component } from "react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

interface NativeSoundInstance {
	getDuration(): number;
	getCurrentTime(cb: (sec: number) => void): void;
	setCurrentTime(val: number): void;
	play(cb: (success: boolean) => void): void;
	pause(): void;
	stop(): void;
	release(): void;
}

interface NativeSoundConstructor {
	new (url: string, basePath: string | null, cb: (err: any) => void): NativeSoundInstance;
}

interface AudioPlayerProps {
	visible: boolean;
	source: string;
	fileName?: string;
	token?: string;
	onClose?: () => void;
}

interface AudioPlayerState {
	playing: boolean;
	duration: number;
	position: number;
	error: string | null;
}

interface AudioPlayerStyles {
	overlay: ViewStyle;
	card: ViewStyle;
	header: ViewStyle;
	title: TextStyle;
	closeBtn: ViewStyle;
	playerArea: ViewStyle;
	controlsRow: ViewStyle;
	playBtn: ViewStyle;
	sliderArea: ViewStyle;
	progressTrack: ViewStyle;
	progressFill: ViewStyle;
	timeRow: ViewStyle;
	timeText: TextStyle;
	errorText: TextStyle;
	retryBtn: ViewStyle;
	retryText: TextStyle;
}

function formatSecs(s: number): string {
	const m = Math.floor(s / 60);
	const sec = Math.floor(s % 60);
	return m + ":" + (sec < 10 ? "0" : "") + sec;
}

export default class AudioPlayer extends Component<AudioPlayerProps, AudioPlayerState> {
	sound: NativeSoundInstance | null;
	timer: ReturnType<typeof setInterval> | null;
	Sound: NativeSoundConstructor | null;
	_tempFile: string | null;

	constructor(props: AudioPlayerProps) {
		super(props);
		this.state = {
			playing: false,
			duration: 0,
			position: 0,
			error: null
		};
		this.sound = null;
		this.timer = null;
		this.Sound = null;
		this._tempFile = null;
	}

	getNativeSound(): NativeSoundConstructor | null {
		if (!this.Sound) {
			this.Sound = require("./NativeSound").default;
		}
		return this.Sound;
	}

	componentDidUpdate(prevProps: AudioPlayerProps): void {
		if (Platform.OS === "web") return;
		if (this.props.visible && !prevProps.visible && this.props.source) {
			this.loadSound(this.props.source);
		}
		if (!this.props.visible && prevProps.visible) {
			this.stopAndRelease();
		}
	}

	componentWillUnmount(): void {
		this.stopAndRelease();
	}

	loadSound(url: string): void {
		this.stopAndRelease();
		const SoundClass = this.getNativeSound();
		if (!SoundClass) return;
		const token = this.props.token;

		if (Platform.OS !== "web" && token && url) {
			this.downloadAndPlay(url, token, SoundClass);
		} else {
			this.playSoundFromUrl(url, SoundClass);
		}
	}

	downloadAndPlay(url: string, token: string, SoundClass: NativeSoundConstructor): void {
		const self = this;
		audioDownload.downloadAudio(url, token, function (err: any, localPath: string) {
			if (err) {
				self.setState({ error: err });
				return;
			}
			self._tempFile = localPath;
			self.playSoundFromUrl(localPath, SoundClass);
		});
	}

	playSoundFromUrl(url: string, SoundClass: NativeSoundConstructor): void {
		const self = this;
		this.sound = new SoundClass(url, null, function (err: any) {
			if (err) {
				self.setState({ error: "Failed to load audio" });
				return;
			}
			self.setState({
				duration: self.sound!.getDuration(),
				position: 0,
				error: null
			});
			self.play();
		});
	}

	play(): void {
		if (!this.sound) return;
		const self = this;
		this.sound.play(function (success: boolean) {
			if (success) {
				self.setState({ playing: false, position: self.state.duration });
			}
			self.clearTimer();
		});
		this.setState({ playing: true });
		this.startTimer();
	}

	pause(): void {
		if (this.sound) this.sound.pause();
		this.setState({ playing: false });
		this.clearTimer();
	}

	togglePlay(): void {
		if (this.state.playing) {
			this.pause();
		} else {
			if (this.sound && this.state.position >= this.state.duration) {
				this.sound.setCurrentTime(0);
				this.setState({ position: 0 });
			}
			this.play();
		}
	}

	seek(val: number): void {
		if (this.sound) {
			this.sound.setCurrentTime(val);
			this.setState({ position: val });
		}
	}

	startTimer(): void {
		this.clearTimer();
		const self = this;
		this.timer = setInterval(function () {
			if (self.sound && self.state.playing) {
				self.sound.getCurrentTime(function (sec: number) {
					self.setState({ position: sec });
				});
			}
		}, 250);
	}

	clearTimer(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	stopAndRelease(): void {
		this.clearTimer();
		if (this.sound) {
			this.sound.stop();
			this.sound.release();
			this.sound = null;
		}
		if (this._tempFile) {
			audioDownload.cleanupFile(this._tempFile);
			this._tempFile = null;
		}
		this.setState({ playing: false, duration: 0, position: 0, error: null });
	}

	handleClose(): void {
		this.stopAndRelease();
		this.props.onClose && this.props.onClose();
	}

	renderWebPlayer(): React.ReactNode {
		const source = this.props.source;
		return (
			<View style={styles.playerArea}>
				<audio
					controls
					autoPlay
					style={{ width: "100%", height: 48 }}
					onError={function () {
						console.warn("Audio load error for:", source);
					}}>
					<source
						src={source}
						type="audio/mp4"
					/>
					<source
						src={source}
						type="audio/mpeg"
					/>
				</audio>
			</View>
		);
	}

	renderNativePlayer(): React.ReactNode {
		const self = this;
		const s = this.state;
		const c = getColors();

		if (s.error) {
			return (
				<View style={styles.playerArea}>
					<Text style={[styles.errorText, { color: c.textTertiary }]}>{s.error}</Text>
					<TouchableOpacity
						style={[styles.retryBtn, { backgroundColor: c.accent }]}
						onPress={function () {
							self.loadSound(self.props.source);
						}}
						data-type="btn">
						<Text style={styles.retryText}>Retry</Text>
					</TouchableOpacity>
				</View>
			);
		}

		const progress = s.duration > 0 ? s.position / s.duration : 0;

		return (
			<View style={styles.playerArea}>
				<View style={styles.controlsRow}>
					<TouchableOpacity
						style={[styles.playBtn, { backgroundColor: c.green }]}
						onPress={function () {
							self.togglePlay();
						}}
						data-type="icon-btn">
						<Icon
							name={s.playing ? "pause" : "play"}
							size={18}
							color="#FFFFFF"
						/>
					</TouchableOpacity>
					<View style={styles.sliderArea}>
						<View style={[styles.progressTrack, { backgroundColor: c.border }]}>
							<View style={[styles.progressFill, { flex: progress, backgroundColor: c.accent }]} />
							<View style={{ flex: 1 - progress }} />
						</View>
						<View style={styles.timeRow}>
							<Text style={[styles.timeText, { color: c.textTertiary }]}>{formatSecs(s.position)}</Text>
							<Text style={[styles.timeText, { color: c.textTertiary }]}>{formatSecs(s.duration)}</Text>
						</View>
					</View>
				</View>
			</View>
		);
	}

	render(): React.ReactNode {
		const { visible, fileName } = this.props;
		const self = this;
		const c = getColors();

		if (!visible) return null;

		return (
			<Modal
				visible={visible}
				transparent={true}
				animationType="fade"
				onRequestClose={function () {
					self.handleClose();
				}}>
				<TouchableOpacity
					style={[styles.overlay, { backgroundColor: c.overlayMedium }]}
					activeOpacity={1}
					onPress={function () {
						self.handleClose();
					}}
					data-type="overlay">
					<View style={[styles.card, { backgroundColor: c.bgTertiary }]}>
						<TouchableOpacity
							activeOpacity={1}
							onPress={function () {}}
							data-type="overlay">
							<View style={[styles.header, { borderBottomColor: c.border }]}>
								<Text
									style={[styles.title, { color: c.textPrimary }]}
									numberOfLines={1}>
									{fileName || "Audio"}
								</Text>
								<TouchableOpacity
									style={[styles.closeBtn, { backgroundColor: c.fileIconBg }]}
									onPress={function () {
										self.handleClose();
									}}
									data-type="icon-btn">
									<Icon
										name="close"
										size={16}
										color={c.textSecondary}
									/>
								</TouchableOpacity>
							</View>
							{Platform.OS === "web" ? this.renderWebPlayer() : this.renderNativePlayer()}
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>
		);
	}
}

const styles = StyleSheet.create<AudioPlayerStyles>({
	overlay: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24
	},
	card: {
		borderRadius: 12,
		width: "100%",
		maxWidth: 400,
		overflow: "hidden"
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1
	},
	title: {
		flex: 1,
		fontSize: 15,
		fontWeight: "600"
	},
	closeBtn: {
		width: 32,
		height: 32,
		borderRadius: 4,
		justifyContent: "center",
		alignItems: "center",
		marginLeft: 12
	},
	playerArea: {
		padding: 20
	},
	controlsRow: {
		flexDirection: "row",
		alignItems: "center"
	},
	playBtn: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12
	},
	sliderArea: {
		flex: 1
	},
	progressTrack: {
		height: 4,
		borderRadius: 2,
		flexDirection: "row",
		overflow: "hidden"
	},
	progressFill: {},
	timeRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 6
	},
	timeText: {
		fontSize: 11
	},
	errorText: {
		fontSize: 14,
		textAlign: "center",
		marginBottom: 12
	},
	retryBtn: {
		paddingHorizontal: 20,
		paddingVertical: 8,
		borderRadius: 4,
		alignSelf: "center"
	},
	retryText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "600"
	}
});
