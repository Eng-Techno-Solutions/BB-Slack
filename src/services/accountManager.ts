import type { ISlackAPI } from "../api/types";
import type { AccountEntry } from "../types";
import {
	getAccounts,
	getActiveAccountId,
	getToken,
	logger,
	saveAccounts,
	saveActiveAccountId,
	saveToken
} from "../utils";

export interface AuthResult {
	user_id: string;
	user: string;
	team: string;
	team_id: string;
}

export interface AutoLoginResult {
	accounts: AccountEntry[];
	token: string | null;
}

export async function tryAutoLogin(): Promise<AutoLoginResult> {
	const accounts = await getAccounts();
	if (accounts.length > 0) {
		const activeId = await getActiveAccountId();
		const active = activeId
			? accounts.find(function (a: AccountEntry) {
					return a.userId === activeId;
				})
			: accounts[0];
		return { accounts: accounts, token: (active || accounts[0]).token };
	}
	const token = await getToken();
	return { accounts: [], token: token };
}

export async function performAuth(slack: ISlackAPI, token: string): Promise<AuthResult> {
	const auth = await slack.authTest();
	if (!auth || !auth.user_id) {
		throw new Error("Invalid authentication response");
	}
	try {
		await saveToken(token);
	} catch (err: unknown) {
		logger.warn("accountManager.performAuth", "token persistence failed; login continues", err);
	}
	return auth as unknown as AuthResult;
}

export function upsertAccount(
	accounts: AccountEntry[],
	auth: AuthResult,
	token: string
): AccountEntry[] {
	const result = accounts.slice();
	const existingIdx = result.findIndex(function (a: AccountEntry) {
		return a.userId === auth.user_id;
	});
	const entry: AccountEntry = {
		token: token,
		teamName: auth.team || "",
		teamId: auth.team_id || "",
		userId: auth.user_id,
		userName: auth.user || "",
		teamIcon: ""
	};
	if (existingIdx >= 0) {
		result[existingIdx] = Object.assign({}, result[existingIdx], entry);
	} else {
		result.push(entry);
	}
	return result;
}

export async function persistAccountLogin(accounts: AccountEntry[], userId: string): Promise<void> {
	try {
		await saveAccounts(accounts);
		await saveActiveAccountId(userId);
	} catch (err: unknown) {
		logger.warn("accountManager.persistAccountLogin", "failed to persist account login", err);
	}
}

export async function removeAccount(
	accounts: AccountEntry[],
	userId: string
): Promise<AccountEntry[]> {
	const filtered = accounts.filter(function (a: AccountEntry) {
		return a.userId !== userId;
	});
	try {
		await saveAccounts(filtered);
	} catch (err: unknown) {
		logger.warn("accountManager.removeAccount", "failed to persist accounts after remove", err);
	}
	return filtered;
}

export function getResetState(): object {
	return {
		slack: null,
		currentUser: null,
		teamName: "",
		teamIcon: "",
		usersMap: {},
		channels: [],
		channelsLoading: false,
		channelsError: null,
		stack: [{ screen: "login", params: {} }]
	};
}
