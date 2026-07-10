import { getColors } from "../../theme";
import type { SlackFile } from "../../types";
import {
	formatDuration,
	imageSource,
	isAudioFile,
	isImageFile,
	proxyUrl
} from "../../utils/fileHelpers";
import { openDocument } from "../../utils/openDocument";
import Icon from "../ui/Icon";
import { CONTENT_MAX_W, styles } from "./MessageItem.styles";
import type { FileRendererProps } from "./types";
import React, { Component } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

export default class FileRenderer extends Component<FileRendererProps> {
	shouldComponentUpdate(nextProps: FileRendererProps): boolean {
		const prevF = this.props.files;
		const nextF = nextProps.files;
		if (prevF.length !== nextF.length) return true;
		for (let i = 0; i < prevF.length; i++) {
			if (prevF[i].id !== nextF[i].id) return true;
		}
		return false;
	}

	renderImageFile(f: SlackFile, i: number, token?: string): React.ReactNode {
		const onImagePress = this.props.onImagePress;
		const c = getColors();
		const fullUrl = f.url_private || f.url_private_download || f.thumb_480 || f.thumb_360;
		const thumbUrl = f.thumb_480 || f.thumb_360 || f.thumb_160 || fullUrl;
		const proxiedThumb = proxyUrl(thumbUrl || "", token);
		const proxiedFull = proxyUrl(fullUrl || "", token);

		let w = f.original_w || f.thumb_480_w || f.thumb_360_w || 300;
		let h = f.original_h || f.thumb_480_h || f.thumb_360_h || 200;
		const maxW = CONTENT_MAX_W;
		if (w > maxW) {
			h = Math.round(h * (maxW / w));
			w = maxW;
		}

		return (
			<TouchableOpacity
				key={i}
				style={[styles.imageWrapper, { borderColor: c.border }]}
				activeOpacity={0.8}
				data-type="file-card"
				onPress={function () {
					onImagePress &&
						onImagePress({ uri: proxiedFull, name: f.name || f.title || "Image", token: token });
				}}>
				<Image
					source={imageSource(proxiedThumb, token)}
					style={{ width: w, height: h, backgroundColor: c.bgTertiary }}
					resizeMode="cover"
				/>
			</TouchableOpacity>
		);
	}

	renderAudioFile(f: SlackFile, i: number, token?: string): React.ReactNode {
		const onAudioPress = this.props.onAudioPress;
		const c = getColors();
		const audioUrl = f.aac || f.url_private || f.url_private_download || "";
		const proxiedUrl = proxyUrl(audioUrl, token);
		const duration = f.duration_ms ? formatDuration(f.duration_ms) : "";
		const samples = f.audio_wave_samples || [];

		return (
			<TouchableOpacity
				key={i}
				style={[styles.audioCard, { backgroundColor: c.bgTertiary, borderColor: c.border }]}
				activeOpacity={0.7}
				data-type="file-card"
				onPress={function () {
					onAudioPress &&
						onAudioPress({
							uri: proxiedUrl,
							name: f.name || f.title || "Audio",
							duration: f.duration_ms,
							token: token
						});
				}}>
				<View style={[styles.audioPlayBtn, { backgroundColor: c.green }]}>
					<Icon
						name="play"
						size={16}
						color="#FFFFFF"
					/>
				</View>
				<View style={styles.audioContent}>
					<View style={styles.waveformRow}>
						{samples
							.filter(function (_: number, idx: number) {
								return idx % 2 === 0;
							})
							.slice(0, 40)
							.map(function (val: number, idx: number) {
								const barH = Math.max(2, Math.round((val / 100) * 24));
								return (
									<View
										key={idx}
										style={[styles.waveBar, { height: barH, backgroundColor: c.accent }]}
									/>
								);
							})}
					</View>
					{duration ? (
						<Text style={[styles.audioDuration, { color: c.textTertiary }]}>{duration}</Text>
					) : null}
				</View>
			</TouchableOpacity>
		);
	}

	renderFileCard(f: SlackFile, i: number, token?: string): React.ReactNode {
		const c = getColors();
		const ext = (f.filetype || "").toUpperCase();
		const sizeKB = f.size
			? f.size > 1048576
				? (f.size / 1048576).toFixed(1) + " MB"
				: Math.round(f.size / 1024) + " KB"
			: "";

		return (
			<TouchableOpacity
				key={i}
				style={[styles.fileCard, { backgroundColor: c.bgTertiary, borderColor: c.border }]}
				activeOpacity={0.7}
				data-type="file-card"
				onPress={function () {
					openDocument(f, token);
				}}>
				<View style={[styles.fileIcon, { backgroundColor: c.fileIconBg }]}>
					<Text style={[styles.fileIconText, { color: c.textSecondary }]}>
						{ext ? ext.substring(0, 4) : "FILE"}
					</Text>
				</View>
				<View style={styles.fileInfo}>
					<Text
						style={[styles.fileName, { color: c.accentLight }]}
						numberOfLines={1}>
						{f.name || f.title || "attachment"}
					</Text>
					<Text style={[styles.fileMeta, { color: c.textTertiary }]}>
						{ext}
						{sizeKB ? (ext ? " · " : "") + sizeKB : ""}
					</Text>
				</View>
			</TouchableOpacity>
		);
	}

	render(): React.ReactNode {
		const { files, token } = this.props;
		const self = this;

		if (files.length === 0) return null;

		return (
			<View style={styles.filesContainer}>
				{files.map(function (f: SlackFile, i: number) {
					if (isImageFile(f)) return self.renderImageFile(f, i, token);
					if (isAudioFile(f)) return self.renderAudioFile(f, i, token);
					return self.renderFileCard(f, i, token);
				})}
			</View>
		);
	}
}
