import React from 'react';
import { View, Text, Linking, Platform, StyleSheet } from 'react-native';
import { replaceEmojisInText } from '../utils/emoji';
import { getUserName } from '../utils/format';

function openUrl(url) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
  } else {
    Linking.openURL(url).catch(function () {});
  }
}

function parseSlackLinks(text, usersMap) {
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

function parseFormatting(text) {
  var result = [];
  var remaining = text;

  while (remaining.length > 0) {
    var codeBlockIdx = remaining.indexOf('```');
    var inlineCodeIdx = remaining.indexOf('`');

    if (inlineCodeIdx === codeBlockIdx && codeBlockIdx !== -1) {
      var endBlock = remaining.indexOf('```', codeBlockIdx + 3);
      if (endBlock !== -1) {
        if (codeBlockIdx > 0) {
          result.push({ type: 'text', value: remaining.substring(0, codeBlockIdx) });
        }
        result.push({ type: 'codeblock', value: remaining.substring(codeBlockIdx + 3, endBlock) });
        remaining = remaining.substring(endBlock + 3);
        continue;
      }
    }

    if (inlineCodeIdx !== -1 && inlineCodeIdx !== codeBlockIdx) {
      var endInline = remaining.indexOf('`', inlineCodeIdx + 1);
      if (endInline !== -1) {
        if (inlineCodeIdx > 0) {
          result.push({ type: 'text', value: remaining.substring(0, inlineCodeIdx) });
        }
        result.push({ type: 'code', value: remaining.substring(inlineCodeIdx + 1, endInline) });
        remaining = remaining.substring(endInline + 1);
        continue;
      }
    }

    result.push({ type: 'text', value: remaining });
    break;
  }

  return result;
}

function applyInlineFormatting(text) {
  var parts = [];
  var regex = /(\*([^*]+)\*)|(_([^_]+)_)|(~([^~]+)~)/g;
  var lastIndex = 0;
  var match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }
    if (match[2]) {
      parts.push({ type: 'bold', value: match[2] });
    } else if (match[4]) {
      parts.push({ type: 'italic', value: match[4] });
    } else if (match[6]) {
      parts.push({ type: 'strike', value: match[6] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.substring(lastIndex) });
  }

  return parts;
}

function renderInlineText(text, key) {
  var inlineParts = applyInlineFormatting(text);
  if (inlineParts.length === 1 && inlineParts[0].type === 'text') {
    return replaceEmojisInText(inlineParts[0].value);
  }
  return inlineParts.map(function (p, j) {
    var k = key + '_' + j;
    if (p.type === 'bold') {
      return <Text key={k} style={styles.bold}>{replaceEmojisInText(p.value)}</Text>;
    }
    if (p.type === 'italic') {
      return <Text key={k} style={styles.italic}>{replaceEmojisInText(p.value)}</Text>;
    }
    if (p.type === 'strike') {
      return <Text key={k} style={styles.strike}>{replaceEmojisInText(p.value)}</Text>;
    }
    return replaceEmojisInText(p.value);
  });
}

function SlackText({ text, usersMap, style, numberOfLines }) {
  if (!text) return null;

  var linkParts = parseSlackLinks(text, usersMap);
  if (linkParts.length === 0) return null;

  var allParts = [];
  for (var i = 0; i < linkParts.length; i++) {
    var lp = linkParts[i];
    if (lp.type === 'text') {
      var formatted = parseFormatting(lp.value);
      for (var j = 0; j < formatted.length; j++) {
        allParts.push(formatted[j]);
      }
    } else {
      allParts.push(lp);
    }
  }

  var hasBlock = false;
  for (var i = 0; i < allParts.length; i++) {
    if (allParts[i].type === 'codeblock') { hasBlock = true; break; }
  }

  if (!hasBlock) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {allParts.map(function (part, i) {
          if (part.type === 'link') {
            return (
              <Text key={i} style={styles.link} onPress={function () { openUrl(part.url); }}>
                {replaceEmojisInText(part.label)}
              </Text>
            );
          }
          if (part.type === 'mention') {
            return <Text key={i} style={styles.mention}>{part.value}</Text>;
          }
          if (part.type === 'channel') {
            return <Text key={i} style={styles.channel}>{part.value}</Text>;
          }
          if (part.type === 'code') {
            return <Text key={i} style={styles.inlineCode}>{part.value}</Text>;
          }
          return <Text key={i}>{renderInlineText(part.value, i)}</Text>;
        })}
      </Text>
    );
  }

  return (
    <View>
      {allParts.map(function (part, i) {
        if (part.type === 'codeblock') {
          return (
            <View key={i} style={styles.codeBlock}>
              <Text style={styles.codeBlockText}>{part.value}</Text>
            </View>
          );
        }
        if (part.type === 'link') {
          return (
            <Text key={i} style={[style, styles.link]} onPress={function () { openUrl(part.url); }}>
              {replaceEmojisInText(part.label)}
            </Text>
          );
        }
        if (part.type === 'mention') {
          return <Text key={i} style={[style, styles.mention]}>{part.value}</Text>;
        }
        if (part.type === 'channel') {
          return <Text key={i} style={[style, styles.channel]}>{part.value}</Text>;
        }
        if (part.type === 'code') {
          return <Text key={i} style={[style, styles.inlineCode]}>{part.value}</Text>;
        }
        var trimmed = part.value;
        if (!trimmed || !trimmed.trim()) return null;
        return <Text key={i} style={style}>{renderInlineText(trimmed, i)}</Text>;
      })}
    </View>
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
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#E8912D',
    backgroundColor: '#2D2D2D',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#383838',
  },
  codeBlock: {
    backgroundColor: '#1E1E1E',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#383838',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 4,
  },
  codeBlockText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#D1D2D3',
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  strike: {
    textDecorationLine: 'line-through',
  },
});

export default SlackText;
