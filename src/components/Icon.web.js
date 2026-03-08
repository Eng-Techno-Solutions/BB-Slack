import React from 'react';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import X from 'lucide-react/dist/esm/icons/x';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Search from 'lucide-react/dist/esm/icons/search';
import SendHorizontal from 'lucide-react/dist/esm/icons/send-horizontal';
import Hash from 'lucide-react/dist/esm/icons/hash';
import Info from 'lucide-react/dist/esm/icons/info';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Reply from 'lucide-react/dist/esm/icons/reply';
import ThumbsUp from 'lucide-react/dist/esm/icons/thumbs-up';
import Heart from 'lucide-react/dist/esm/icons/heart';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Check from 'lucide-react/dist/esm/icons/check';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Play from 'lucide-react/dist/esm/icons/play';
import Pause from 'lucide-react/dist/esm/icons/pause';
import Smile from 'lucide-react/dist/esm/icons/smile';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import Mic from 'lucide-react/dist/esm/icons/mic';
import Square from 'lucide-react/dist/esm/icons/square';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Bell from 'lucide-react/dist/esm/icons/bell';

var ICON_MAP = {
  'chevron-down': ChevronDown,
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
  'smile': Smile,
  'sun': Sun,
  'moon': Moon,
  'paperclip': Paperclip,
  'mic': Mic,
  'square': Square,
  'settings': Settings,
  'bell': Bell,
};

function Icon({ name, size, color }) {
  var s = size || 20;
  var c = color || '#D1D2D3';
  var IconComponent = ICON_MAP[name];

  if (!IconComponent) return null;

  return <IconComponent size={s} color={c} strokeWidth={2} />;
}

export default Icon;
