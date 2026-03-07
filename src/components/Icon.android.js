import React from 'react';
import { Text } from 'react-native';

var ICON_MAP = {
  'chevron-down': '\u25BE',
  'chevron-left': '\u2039',
  'chevron-right': '\u203A',
  'close': '\u2715',
  'lock': '\uD83D\uDD12',
  'search': '\uD83D\uDD0D',
  'send': '\u27A4',
  'hash': '#',
  'info': '\u2139',
  'log-out': '\u21B6',
  'message-square': '\uD83D\uDCAC',
  'reply': '\u21A9',
  'thumbs-up': '\uD83D\uDC4D',
  'heart': '\u2764',
  'eye': '\uD83D\uDC41',
  'check': '\u2713',
  'edit': '\u270E',
  'trash': '\uD83D\uDDD1',
  'play': '\u25B6',
  'pause': '\u23F8',
  'smile': '\u263A',
  'sun': '\u2600',
  'moon': '\uD83C\uDF19',
  'paperclip': '\uD83D\uDCCE',
  'mic': '\uD83C\uDF99',
  'square': '\u25A0',
};

function Icon({ name, size, color }) {
  var s = size || 20;
  var c = color || '#D1D2D3';
  var icon = ICON_MAP[name];

  if (!icon) return null;

  return (
    <Text style={{ fontSize: s, color: c, lineHeight: s + 2, textAlign: 'center', width: s }}>
      {icon}
    </Text>
  );
}

export default Icon;
