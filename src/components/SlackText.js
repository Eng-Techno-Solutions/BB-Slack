import React from 'react';
import { View, Text, Image, Linking, Platform, StyleSheet } from 'react-native';
import { replaceEmojisInText, EMOJI_MAP, getTwemojiUrl } from '../utils/emoji';
import { getUserName } from '../utils/format';
import { getColors } from '../theme';

var IS_ANDROID = Platform.OS === 'android';
var TOKEN_CHAR = '\x01';

function replaceEmojisWithImages(text) {
  if (!text) return text;
  if (!IS_ANDROID) return replaceEmojisInText(text);
  var parts = [];
  var regex = /:([a-zA-Z0-9_+-]+):/g;
  var lastIndex = 0;
  var match;
  var key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    var emoji = EMOJI_MAP[match[1]];
    if (emoji) {
      parts.push(
        React.createElement(Image, {
          key: 'e' + key++,
          source: { uri: getTwemojiUrl(emoji) },
          style: styles.inlineEmoji,
        })
      );
    } else {
      parts.push(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

function openUrl(url) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
  } else {
    Linking.openURL(url).catch(function () {});
  }
}

function resolveToken(inner, usersMap) {
  var pipeIndex = inner.indexOf('|');
  var target = pipeIndex !== -1 ? inner.substring(0, pipeIndex) : inner;
  var label = pipeIndex !== -1 ? inner.substring(pipeIndex + 1) : null;

  if (target.indexOf('http://') === 0 || target.indexOf('https://') === 0 || target.indexOf('mailto:') === 0) {
    return { type: 'link', url: target, label: label || target.replace(/^https?:\/\//, '').replace(/\/$/, '') };
  }
  if (target.charAt(0) === '@') {
    var userId = target.substring(1);
    var name = usersMap ? getUserName(userId, usersMap) : userId;
    return { type: 'mention', value: '@' + (label || name) };
  }
  if (target.charAt(0) === '#') {
    return { type: 'channel', value: '#' + (label || target.substring(1)) };
  }
  if (target.charAt(0) === '!') {
    var cmd = target.substring(1);
    if (cmd === 'here' || cmd === 'channel' || cmd === 'everyone') {
      return { type: 'mention', value: '@' + cmd };
    }
    if (label) {
      return { type: 'mention', value: '@' + label };
    }
    return { type: 'text', value: '@' + cmd };
  }
  if (pipeIndex !== -1) {
    return { type: 'link', url: target, label: label };
  }
  return { type: 'text', value: '<' + inner + '>' };
}

function tokenizeLinks(text) {
  var tokens = [];
  var result = text.replace(/<([^>]+)>/g, function (match) {
    var idx = tokens.length;
    tokens.push(match);
    return TOKEN_CHAR + idx + TOKEN_CHAR;
  });
  return { text: result, tokens: tokens };
}

var TOKEN_REGEX = new RegExp(TOKEN_CHAR + '(\\d+)' + TOKEN_CHAR, 'g');

function expandTokens(text, tokens, usersMap) {
  var parts = [];
  var regex = new RegExp(TOKEN_CHAR + '(\\d+)' + TOKEN_CHAR, 'g');
  var lastIndex = 0;
  var match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }
    var tokenIdx = parseInt(match[1]);
    var raw = tokens[tokenIdx];
    var inner = raw.substring(1, raw.length - 1);
    parts.push(resolveToken(inner, usersMap));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.substring(lastIndex) });
  }
  return parts;
}

function restoreTokensAsText(text, tokens) {
  return text.replace(new RegExp(TOKEN_CHAR + '(\\d+)' + TOKEN_CHAR, 'g'), function (m, idx) {
    return tokens[parseInt(idx)];
  });
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

function processTextSegment(text, tokens, usersMap) {
  var inlineParts = applyInlineFormatting(text);
  var result = [];
  for (var i = 0; i < inlineParts.length; i++) {
    var ip = inlineParts[i];
    var expanded = expandTokens(ip.value, tokens, usersMap);
    if (ip.type === 'text') {
      result = result.concat(expanded);
    } else {
      result.push({ type: ip.type, children: expanded });
    }
  }
  return result;
}

function renderPart(part, key, c) {
  if (part.type === 'link') {
    return (
      <Text key={key} style={[styles.link, { color: c.accentLight }]} onPress={function () { openUrl(part.url); }}>
        {replaceEmojisWithImages(part.label)}
      </Text>
    );
  }
  if (part.type === 'mention') {
    return <Text key={key} style={[styles.mention, { color: c.accentLight, backgroundColor: c.mentionBg }]}>{part.value}</Text>;
  }
  if (part.type === 'channel') {
    return <Text key={key} style={[styles.channel, { color: c.accentLight }]}>{part.value}</Text>;
  }
  if (part.type === 'code') {
    return <Text key={key} style={[styles.inlineCode, { color: c.codeInlineColor, backgroundColor: c.codeInlineBg, borderColor: c.codeBorder }]}>{part.value}</Text>;
  }
  if (part.type === 'bold' || part.type === 'italic' || part.type === 'strike') {
    var s = part.type === 'bold' ? styles.bold : part.type === 'italic' ? styles.italic : styles.strike;
    if (part.children) {
      return (
        <Text key={key} style={s}>
          {part.children.map(function (child, j) {
            return renderPart(child, key + '_' + j, c);
          })}
        </Text>
      );
    }
    return <Text key={key} style={s}>{replaceEmojisWithImages(part.value)}</Text>;
  }
  return replaceEmojisWithImages(part.value);
}

function SlackText({ text, usersMap, style, numberOfLines }) {
  if (!text) return null;

  var c = getColors();

  var tokenized = tokenizeLinks(text);
  var codeParts = parseFormatting(tokenized.text);

  var allParts = [];
  for (var i = 0; i < codeParts.length; i++) {
    var cp = codeParts[i];
    if (cp.type === 'codeblock' || cp.type === 'code') {
      cp.value = restoreTokensAsText(cp.value, tokenized.tokens);
      allParts.push(cp);
    } else {
      var processed = processTextSegment(cp.value, tokenized.tokens, usersMap);
      allParts = allParts.concat(processed);
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
          return renderPart(part, i, c);
        })}
      </Text>
    );
  }

  return (
    <View>
      {allParts.map(function (part, i) {
        if (part.type === 'codeblock') {
          return (
            <View key={i} style={[styles.codeBlock, { backgroundColor: c.codeBlockBg, borderColor: c.codeBorder }]}>
              <Text style={[styles.codeBlockText, { color: c.textSecondary }]}>{part.value}</Text>
            </View>
          );
        }
        return <Text key={i} style={style}>{renderPart(part, i, c)}</Text>;
      })}
    </View>
  );
}

var styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
  },
  mention: {
    fontWeight: '600',
  },
  channel: {
    fontWeight: '600',
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
  },
  codeBlock: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 4,
  },
  codeBlockText: {
    fontFamily: 'monospace',
    fontSize: 13,
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
  inlineEmoji: {
    width: 18,
    height: 18,
  },
});

export default SlackText;
