import React from 'react';
import FeatherIcon from 'react-native-vector-icons/Feather';

var ICON_MAP = {
  'chevron-down': 'chevron-down',
  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  'close': 'x',
  'lock': 'lock',
  'search': 'search',
  'send': 'send',
  'hash': 'hash',
  'info': 'info',
  'log-out': 'log-out',
  'message-square': 'message-square',
  'reply': 'corner-up-left',
  'thumbs-up': 'thumbs-up',
  'heart': 'heart',
  'eye': 'eye',
  'check': 'check',
  'edit': 'edit-2',
  'trash': 'trash-2',
  'play': 'play',
  'pause': 'pause',
  'smile': 'smile',
  'sun': 'sun',
  'moon': 'moon',
  'paperclip': 'paperclip',
  'mic': 'mic',
  'square': 'square',
  'settings': 'settings',
  'bell': 'bell',
  'globe': 'globe',
  'user': 'user',
  'coffee': 'coffee',
  'external-link': 'external-link',
};

function Icon({ name, size, color }) {
  var s = size || 20;
  var c = color || '#D1D2D3';
  var iconName = ICON_MAP[name];

  if (!iconName) return null;

  return <FeatherIcon name={iconName} size={s} color={c} />;
}

export default Icon;
