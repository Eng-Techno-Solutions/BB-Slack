import { NativeModules } from "react-native";

interface AudioRecorderModuleInterface {
	startRecording(): Promise<string>;
	stopRecording(): Promise<string>;
	cancelRecording(): Promise<void>;
}

export interface RecordingResult {
	base64: string;
	duration: number;
	name: string;
	type: string;
}

const AudioRecorderModule = NativeModules.AudioRecorderModule as
	| AudioRecorderModuleInterface
	| undefined;

export function startRecording(): Promise<string> {
	if (!AudioRecorderModule) {
		return Promise.reject(new Error("AudioRecorderModule not available"));
	}
	return AudioRecorderModule.startRecording();
}

export function stopRecording(): Promise<RecordingResult> {
	if (!AudioRecorderModule) {
		return Promise.reject(new Error("AudioRecorderModule not available"));
	}
	return AudioRecorderModule.stopRecording().then(function (result: string): RecordingResult {
		const data = JSON.parse(result);
		return {
			base64: data.base64,
			duration: data.duration,
			name: data.name,
			type: data.type
		};
	});
}

export function cancelRecording(): Promise<void> {
	if (!AudioRecorderModule) return Promise.resolve();
	return AudioRecorderModule.cancelRecording();
}
