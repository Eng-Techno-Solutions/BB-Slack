import React from 'react';
import { View, Text, Image, Linking, Platform, StyleSheet } from 'react-native';
import { replaceEmojisInText, EMOJI_MAP, getTwemojiUrl } from '../utils/emoji';
import { getUserName } from '../utils/format';
import { getColors } from '../theme';

const IS_ANDROID = Platform.OS === 'android';
const TOKEN_CHAR = '\x01';

function replaceEmojisWithImages(text) {
  if (!text) return text;
  if (!IS_ANDROID) return replaceEmojisInText(text);
  const parts = [];
  const regex = /:([a-zA-Z0-9_+-]+):/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const emoji = EMOJI_MAP[match[1]];
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
  const pipeIndex = inner.indexOf('|');
  const target = pipeIndex !== -1 ? inner.substring(0, pipeIndex) : inner;
  const label = pipeIndex !== -1 ? inner.substring(pipeIndex + 1) : null;

  if (target.indexOf('http://') === 0 || target.indexOf('https://') === 0 || target.indexOf('mailto:') === 0) {
    return { type: 'link', url: target, label: label || target.replace(/^https?:\/\//, '').replace(/\/$/, '') };
  }
  if (target.charAt(0) === '@') {
    const userId = target.substring(1);
    const name = usersMap ? getUserName(userId, usersMap) : userId;
    return { type: 'mention', value: '@' + (label || name) };
  }
  if (target.charAt(0) === '#') {
    return { type: 'channel', value: '#' + (label || target.substring(1)) };
  }
  if (target.charAt(0) === '!') {
    const cmd = target.substring(1);
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
  const tokens = [];
  const result = text.replace(/<([^>]+)>/g, function (match) {
    const idx = tokens.length;
    tokens.push(match);
    return TOKEN_CHAR + idx + TOKEN_CHAR;
  });
  return { text: result, tokens: tokens };
}

const TOKEN_REGEX = new RegExp(TOKEN_CHAR + '(\\d+)' + TOKEN_CHAR, 'g');

function expandTokens(text, tokens, usersMap) {
  const parts = [];
  const regex = new RegExp(TOKEN_CHAR + '(\\d+)' + TOKEN_CHAR, 'g');
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }
    const tokenIdx = parseInt(match[1]);
    const raw = tokens[tokenIdx];
    const inner = raw.substring(1, raw.length - 1);
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
  const result = [];
  let remaining = text;

  while (remaining.length > 0) {
    const codeBlockIdx = remaining.indexOf('```');
    const inlineCodeIdx = remaining.indexOf('`');

    if (inlineCodeIdx === codeBlockIdx && codeBlockIdx !== -1) {
      const endBlock = remaining.indexOf('```', codeBlockIdx + 3);
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
      const endInline = remaining.indexOf('`', inlineCodeIdx + 1);
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
  const parts = [];
  const regex = /(\*([^*]+)\*)|(_([^_]+)_)|(~([^~]+)~)/g;
  let lastIndex = 0;
  let match;

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
  const inlineParts = applyInlineFormatting(text);
  let result = [];
  for (let i = 0; i < inlineParts.length; i++) {
    const ip = inlineParts[i];
    const expanded = expandTokens(ip.value, tokens, usersMap);
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
    const s = part.type === 'bold' ? styles.bold : part.type === 'italic' ? styles.italic : styles.strike;
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

  const c = getColors();

  const tokenized = tokenizeLinks(text);
  const codeParts = parseFormatting(tokenized.text);

  let allParts = [];
  for (let i = 0; i < codeParts.length; i++) {
    const cp = codeParts[i];
    if (cp.type === 'codeblock' || cp.type === 'code') {
      cp.value = restoreTokensAsText(cp.value, tokenized.tokens);
      allParts.push(cp);
    } else {
      const processed = processTextSegment(cp.value, tokenized.tokens, usersMap);
      allParts = allParts.concat(processed);
    }
  }

  let hasBlock = false;
  for (let i = 0; i < allParts.length; i++) {
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

const styles = StyleSheet.create({
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
