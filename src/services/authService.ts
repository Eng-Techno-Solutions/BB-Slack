import { request } from "../api/http";
import { API } from "../utils/constants";
import { Platform } from "react-native";

const SLACK_API: string = Platform.OS === "web" ? API.SLACK_PROXY : API.SLACK_WEB;
const FORM_HEADERS: Record<string, string> = {
	"Content-Type": "application/x-www-form-urlencoded"
};

export interface SigninResult {
	ok: boolean;
	token?: string;
	error?: string;
}

export interface SigninCall {
	teamId: string;
	email: string;
	password: string;
	pin: string;
}

export const MFA_ERROR_CODES = [
	"missing_pin_app_sms",
	"missing_pin",
	"two_factor_setup_required",
	"two_factor_required"
];

export function isMfaRequired(errCode: string): boolean {
	return MFA_ERROR_CODES.indexOf(errCode) !== -1;
}

export async function findTeam(workspace: string): Promise<string> {
	const normalized = workspace
		.trim()
		.toLowerCase()
		.replace(/\.slack\.com$/, "");
	if (!normalized) throw new Error("Workspace name required");
	const body = "domain=" + encodeURIComponent(normalized);
	const res = await request("POST", SLACK_API + "auth.findTeam", FORM_HEADERS, body);
	const data = JSON.parse(res.body);
	if (!data.ok) {
		throw new Error('Workspace "' + normalized + '" not found. Check the workspace name.');
	}
	return data.team_id as string;
}

export async function signin(params: SigninCall): Promise<SigninResult> {
	const { teamId, email, password, pin } = params;
	let body =
		"team=" +
		encodeURIComponent(teamId) +
		"&email=" +
		encodeURIComponent(email) +
		"&password=" +
		encodeURIComponent(password);
	if (pin) body += "&pin=" + encodeURIComponent(pin);
	const res = await request("POST", SLACK_API + "auth.signin", FORM_HEADERS, body);
	return JSON.parse(res.body);
}

export function mapSigninError(errCode: string): string {
	if (errCode === "invalid_auth" || errCode === "invalid_password") {
		return "Invalid email or password.";
	}
	if (errCode === "ratelimited") {
		return "Too many attempts. Please wait and try again.";
	}
	if (errCode === "team_login_method_not_supported" || errCode === "sso_required") {
		return "This workspace requires SSO login. Please use the Token method instead.";
	}
	return errCode;
}

export function mapPinError(errCode: string): string {
	if (errCode === "invalid_pin" || errCode === "missing_pin_app_sms" || errCode === "missing_pin") {
		return "Invalid code. Please try again.";
	}
	if (errCode === "ratelimited") {
		return "Too many attempts. Please wait and try again.";
	}
	return errCode;
}
