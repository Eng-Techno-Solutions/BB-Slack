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

export function uploadFile(url, token, fields, fileData) {
  // fileData: { name, type, base64 } (Android) or { name, type, file/blob } (Web)
  if (HttpModule && HttpModule.uploadMultipart) {
    return HttpModule.uploadMultipart(
      url,
      token,
      JSON.stringify(fields),
      fileData.name,
      fileData.type,
      fileData.base64
    ).then(function (res) {
      return JSON.parse(res);
    });
  }

  // Web fallback using FormData
  var formData = new FormData();
  var keys = Object.keys(fields);
  for (var i = 0; i < keys.length; i++) {
    formData.append(keys[i], fields[keys[i]]);
  }
  if (fileData.file || fileData.blob) {
    formData.append('file', fileData.file || fileData.blob, fileData.name);
  }
  return fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: formData,
  }).then(function (res) {
    return res.text().then(function (text) {
      return { status: res.status, body: text };
    });
  });
}
