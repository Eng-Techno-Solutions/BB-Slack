import React from 'react';
import { Text, Linking, Platform, StyleSheet } from 'react-native';
import { replaceEmojisInText } from '../utils/emoji';
import { getUserName } from '../utils/format';

function openUrl(url) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
  } else {
    Linking.openURL(url).catch(function () {});
  }
}

function parseSlackText(text, usersMap) {
  if (!text) return [];

  var parts = [];
  var regex = /<([^>]+)>/g;
  var lastIndex = 0;
  var match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }

    var inner = match[1];
    var pipeIndex = inner.indexOf('|');
    var target = pipeIndex !== -1 ? inner.substring(0, pipeIndex) : inner;
    var label = pipeIndex !== -1 ? inner.substring(pipeIndex + 1) : null;

    if (target.indexOf('http://') === 0 || target.indexOf('https://') === 0 || target.indexOf('mailto:') === 0) {
      var displayLabel = label || target.replace(/^https?:\/\//, '').replace(/\/$/, '');
      parts.push({ type: 'link', url: target, label: displayLabel });
    } else if (target.charAt(0) === '@') {
      var userId = target.substring(1);
      var name = usersMap ? getUserName(userId, usersMap) : userId;
      parts.push({ type: 'mention', value: '@' + (label || name) });
    } else if (target.charAt(0) === '#') {
      var channelId = target.substring(1);
      parts.push({ type: 'channel', value: '#' + (label || channelId) });
    } else if (target.indexOf('http') === -1 && pipeIndex === -1) {
      parts.push({ type: 'text', value: '<' + inner + '>' });
    } else {
      parts.push({ type: 'link', url: target, label: label || target });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.substring(lastIndex) });
  }

  return parts;
}

function SlackText({ text, usersMap, style, numberOfLines }) {
  if (!text) return null;

  var parts = parseSlackText(text, usersMap);

  if (parts.length === 0) return null;

  if (parts.length === 1 && parts[0].type === 'text') {
    return <Text style={style} numberOfLines={numberOfLines}>{replaceEmojisInText(parts[0].value)}</Text>;
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map(function (part, i) {
        if (part.type === 'link') {
          return (
            <Text
              key={i}
              style={styles.link}
              onPress={function () { openUrl(part.url); }}
            >
              {replaceEmojisInText(part.label)}
            </Text>
          );
        }
        if (part.type === 'mention') {
          return (
            <Text key={i} style={styles.mention}>
              {part.value}
            </Text>
          );
        }
        if (part.type === 'channel') {
          return (
            <Text key={i} style={styles.channel}>
              {part.value}
            </Text>
          );
        }
        return <Text key={i}>{replaceEmojisInText(part.value)}</Text>;
      })}
    </Text>
  );
}

var styles = StyleSheet.create({
  link: {
    color: '#1D9BD1',
    textDecorationLine: 'underline',
  },
  mention: {
    color: '#1D9BD1',
    backgroundColor: 'rgba(29,155,209,0.1)',
    fontWeight: '600',
  },
  channel: {
    color: '#1D9BD1',
    fontWeight: '600',
  },
});

export default SlackText;
