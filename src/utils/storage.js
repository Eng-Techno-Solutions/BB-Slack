import { Platform } from 'react-native';

var TOKEN_KEY = '@BBSlack:token';
var THEME_KEY = '@BBSlack:theme';

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
