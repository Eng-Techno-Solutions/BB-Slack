import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Lock,
  Search,
  SendHorizontal,
  Hash,
  Info,
  LogOut,
  MessageSquare,
  Reply,
  ThumbsUp,
  Heart,
  Eye,
  Check,
  Pencil,
  Trash2,
  Play,
  Pause,
} from 'lucide-react';

var ICON_MAP = {
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'close': X,
  'lock': Lock,
  'search': Search,
  'send': SendHorizontal,
  'hash': Hash,
  'info': Info,
  'log-out': LogOut,
  'message-square': MessageSquare,
  'reply': Reply,
  'thumbs-up': ThumbsUp,
  'heart': Heart,
  'eye': Eye,
  'check': Check,
  'edit': Pencil,
  'trash': Trash2,
  'play': Play,
  'pause': Pause,
};

function Icon({ name, size, color }) {
  var s = size || 20;
  var c = color || '#D1D2D3';
  var IconComponent = ICON_MAP[name];

  if (!IconComponent) return null;

  return <IconComponent size={s} color={c} strokeWidth={2} />;
}

export default Icon;
