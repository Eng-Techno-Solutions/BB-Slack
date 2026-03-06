import { Platform } from 'react-native';

var TOKEN_KEY = '@BBSlack:token';

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
