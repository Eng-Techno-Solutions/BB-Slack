import React from 'react';
import { Text } from 'react-native';

var ICON_MAP = {
  'chevron-down': '\u25BE',
  'chevron-left': '\u2039',
  'chevron-right': '\u203A',
  'close': '\u2715',
  'lock': '\u2302',
  'search': '\u2315',
  'send': '\u27A4',
  'hash': '#',
  'info': '\u24D8',
  'log-out': '\u21B6',
  'message-square': '\u2709',
  'reply': '\u21A9',
  'thumbs-up': '+1',
  'heart': '\u2665',
  'eye': '\u25C9',
  'check': '\u2713',
  'edit': '\u270E',
  'trash': '\u2717',
  'play': '\u25B6',
  'pause': '\u2016',
  'smile': '\u263A',
  'sun': '\u263C',
  'moon': '\u263E',
  'paperclip': '\u273D',
  'mic': '\u25CF',
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
