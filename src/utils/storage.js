import { Platform } from 'react-native';

var TOKEN_KEY = '@BBSlack:token';
var THEME_KEY = '@BBSlack:theme';
var NOTIF_INTERVAL_KEY = '@BBSlack:notifInterval';
var NOTIF_ENABLED_KEY = '@BBSlack:notifEnabled';

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
  var val = await getAsyncStorage().getItem(THEME_KEY);
  return val || 'dark';
}

export async function saveNotifInterval(ms) {
  var val = String(ms);
  if (Platform.OS === 'web') {
    localStorage.setItem(NOTIF_INTERVAL_KEY, val);
  } else {
    await getAsyncStorage().setItem(NOTIF_INTERVAL_KEY, val);
  }
}

export async function getNotifInterval() {
  var val;
  if (Platform.OS === 'web') {
    val = localStorage.getItem(NOTIF_INTERVAL_KEY);
  } else {
    val = await getAsyncStorage().getItem(NOTIF_INTERVAL_KEY);
  }
  return val ? parseInt(val, 10) : 120000;
}

export async function saveNotifEnabled(enabled) {
  var val = enabled ? '1' : '0';
  if (Platform.OS === 'web') {
    localStorage.setItem(NOTIF_ENABLED_KEY, val);
  } else {
    await getAsyncStorage().setItem(NOTIF_ENABLED_KEY, val);
  }
}

export async function getNotifEnabled() {
  var val;
  if (Platform.OS === 'web') {
    val = localStorage.getItem(NOTIF_ENABLED_KEY);
  } else {
    val = await getAsyncStorage().getItem(NOTIF_ENABLED_KEY);
  }
  return val !== '0';
}
