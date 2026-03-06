import { NativeModules } from 'react-native';

var HttpModule = NativeModules.HttpModule;

export function request(method, url, headers, body) {
  if (HttpModule && HttpModule.request) {
    return HttpModule.request(
      method,
      url,
      JSON.stringify(headers || {}),
      body || ''
    ).then(function (res) {
      return JSON.parse(res);
    });
  }

  // Fallback to fetch for dev testing on regular Android
  var opts = {
    method: method,
    headers: headers || {},
  };
  if (body && method !== 'GET') {
    opts.body = body;
  }
  return fetch(url, opts).then(function (res) {
    return res.text().then(function (text) {
      return { status: res.status, body: text };
    });
  });
}
