import { Platform } from 'react-native';

const TOKEN_KEY = '@BBSlack:token';
const THEME_KEY = '@BBSlack:theme';
const NOTIF_INTERVAL_KEY = '@BBSlack:notifInterval';
const NOTIF_ENABLED_KEY = '@BBSlack:notifEnabled';
const SOUND_ENABLED_KEY = '@BBSlack:soundEnabled';
const FONT_SIZE_KEY = '@BBSlack:fontSize';
const ACCOUNTS_KEY = '@BBSlack:accounts';
const ACTIVE_ACCOUNT_KEY = '@BBSlack:activeAccount';

function getAsyncStorage() {
  return require('react-native').AsyncStorage;
}

export async function saveToken(token) {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    await getAsyncStorage().setItem(TOKEN_KEY, token);
  }
}

export async function getToken() {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return await getAsyncStorage().getItem(TOKEN_KEY);
}

export async function clearToken() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await getAsyncStorage().removeItem(TOKEN_KEY);
  }
}

export async function saveTheme(mode) {
  if (Platform.OS === 'web') {
    localStorage.setItem(THEME_KEY, mode);
  } else {
    await getAsyncStorage().setItem(THEME_KEY, mode);
  }
}

export async function getTheme() {
  if (Platform.OS === 'web') {
    return localStorage.getItem(THEME_KEY) || 'dark';
  }
  const val = await getAsyncStorage().getItem(THEME_KEY);
  return val || 'dark';
}

export async function saveNotifInterval(ms) {
  const val = String(ms);
  if (Platform.OS === 'web') {
    localStorage.setItem(NOTIF_INTERVAL_KEY, val);
  } else {
    await getAsyncStorage().setItem(NOTIF_INTERVAL_KEY, val);
  }
}

export async function getNotifInterval() {
  let val;
  if (Platform.OS === 'web') {
    val = localStorage.getItem(NOTIF_INTERVAL_KEY);
  } else {
    val = await getAsyncStorage().getItem(NOTIF_INTERVAL_KEY);
  }
  return val ? parseInt(val, 10) : 120000;
}

export async function saveNotifEnabled(enabled) {
  const val = enabled ? '1' : '0';
  if (Platform.OS === 'web') {
    localStorage.setItem(NOTIF_ENABLED_KEY, val);
  } else {
    await getAsyncStorage().setItem(NOTIF_ENABLED_KEY, val);
  }
}

export async function getNotifEnabled() {
  let val;
  if (Platform.OS === 'web') {
    val = localStorage.getItem(NOTIF_ENABLED_KEY);
  } else {
    val = await getAsyncStorage().getItem(NOTIF_ENABLED_KEY);
  }
  return val !== '0';
}

export async function saveSoundEnabled(enabled) {
  const val = enabled ? '1' : '0';
  if (Platform.OS === 'web') {
    localStorage.setItem(SOUND_ENABLED_KEY, val);
  } else {
    await getAsyncStorage().setItem(SOUND_ENABLED_KEY, val);
  }
}

export async function getSoundEnabled() {
  let val;
  if (Platform.OS === 'web') {
    val = localStorage.getItem(SOUND_ENABLED_KEY);
  } else {
    val = await getAsyncStorage().getItem(SOUND_ENABLED_KEY);
  }
  return val !== '0';
}

export async function saveFontSize(size) {
  if (Platform.OS === 'web') {
    localStorage.setItem(FONT_SIZE_KEY, size);
  } else {
    await getAsyncStorage().setItem(FONT_SIZE_KEY, size);
  }
}

export async function getFontSize() {
  let val;
  if (Platform.OS === 'web') {
    val = localStorage.getItem(FONT_SIZE_KEY);
  } else {
    val = await getAsyncStorage().getItem(FONT_SIZE_KEY);
  }
  return val || 'medium';
}

// Multi-account storage
// Account shape: { token, teamName, teamIcon, userId, userName, teamId }

export async function getAccounts() {
  let val;
  if (Platform.OS === 'web') {
    val = localStorage.getItem(ACCOUNTS_KEY);
  } else {
    val = await getAsyncStorage().getItem(ACCOUNTS_KEY);
  }
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch (e) {
    return [];
  }
}

export async function saveAccounts(accounts) {
  const val = JSON.stringify(accounts);
  if (Platform.OS === 'web') {
    localStorage.setItem(ACCOUNTS_KEY, val);
  } else {
    await getAsyncStorage().setItem(ACCOUNTS_KEY, val);
  }
}

export async function getActiveAccountId() {
  if (Platform.OS === 'web') {
    return localStorage.getItem(ACTIVE_ACCOUNT_KEY) || null;
  }
  return await getAsyncStorage().getItem(ACTIVE_ACCOUNT_KEY) || null;
}

export async function saveActiveAccountId(id) {
  if (Platform.OS === 'web') {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
  } else {
    await getAsyncStorage().setItem(ACTIVE_ACCOUNT_KEY, id);
  }
}
