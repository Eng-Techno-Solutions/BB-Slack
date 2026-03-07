var darkColors = {
  bg: '#1A1D21',
  bgSecondary: '#19171D',
  bgTertiary: '#222529',
  bgHeader: '#1A1128',
  bgSplash: '#1a1a2e',
  statusBar: '#1A1128',
  statusBarStyle: 'light-content',
  headerText: '#FFFFFF',
  headerIcon: '#D1D2D3',
  headerBorder: 'rgba(255,255,255,0.1)',
  tabText: 'rgba(255,255,255,0.6)',
  tabTextActive: '#FFFFFF',
  border: '#383838',
  borderInput: '#565856',
  textPrimary: '#FFFFFF',
  textSecondary: '#D1D2D3',
  textTertiary: '#ABABAD',
  textPlaceholder: '#696969',
  accent: '#1264A3',
  accentLight: '#1D9BD1',
  error: '#E01E5A',
  purple: '#4A154B',
  green: '#007A5A',
  splash: '#4A90D9',
  codeBlockBg: '#1E1E1E',
  codeInlineBg: '#2D2D2D',
  codeInlineColor: '#E8912D',
  codeBorder: '#383838',
  channelAvatarBg: '#383838',
  avatarPlaceholderBg: '#1264A3',
  messageUnderlay: 'rgba(255, 255, 255, 0.05)',
  listUnderlay: 'rgba(18, 100, 163, 0.25)',
  actionUnderlay: 'rgba(255, 255, 255, 0.1)',
  reactionActiveBg: 'rgba(18, 100, 163, 0.2)',
  mentionBg: 'rgba(29, 155, 209, 0.1)',
  overlayLight: 'rgba(0,0,0,0.6)',
  overlayMedium: 'rgba(0,0,0,0.7)',
  overlayHeavy: 'rgba(0,0,0,0.92)',
  scrollBtnBg: '#1264A3',
  badgeBg: '#E01E5A',
  systemLine: '#383838',
  tooltipBg: '#1A1D21',
  fileIconBg: '#383838',
};

var lightColors = {
  bg: '#FFFFFF',
  bgSecondary: '#FFFFFF',
  bgTertiary: '#F8F8F8',
  bgHeader: '#4A154B',
  bgSplash: '#FFFFFF',
  statusBar: '#3F0E40',
  statusBarStyle: 'light-content',
  headerText: '#FFFFFF',
  headerIcon: '#FFFFFF',
  headerBorder: 'rgba(255,255,255,0.15)',
  tabText: 'rgba(255,255,255,0.7)',
  tabTextActive: '#FFFFFF',
  border: '#DDDDDD',
  borderInput: '#BBBBBB',
  textPrimary: '#1D1C1D',
  textSecondary: '#1D1C1D',
  textTertiary: '#616061',
  textPlaceholder: '#868686',
  accent: '#1264A3',
  accentLight: '#1264A3',
  error: '#E01E5A',
  purple: '#4A154B',
  green: '#007A5A',
  splash: '#1264A3',
  codeBlockBg: '#F4F4F4',
  codeInlineBg: '#E8E8E8',
  codeInlineColor: '#C73100',
  codeBorder: '#DDDDDD',
  channelAvatarBg: '#E8E8E8',
  avatarPlaceholderBg: '#1264A3',
  messageUnderlay: 'rgba(0, 0, 0, 0.04)',
  listUnderlay: 'rgba(0, 0, 0, 0.06)',
  actionUnderlay: 'rgba(0, 0, 0, 0.06)',
  reactionActiveBg: 'rgba(18, 100, 163, 0.1)',
  mentionBg: 'rgba(18, 100, 163, 0.08)',
  overlayLight: 'rgba(0,0,0,0.4)',
  overlayMedium: 'rgba(0,0,0,0.5)',
  overlayHeavy: 'rgba(0,0,0,0.8)',
  scrollBtnBg: '#1264A3',
  badgeBg: '#E01E5A',
  systemLine: '#DDDDDD',
  tooltipBg: '#FFFFFF',
  fileIconBg: '#E8E8E8',
};

var currentMode = 'dark';

function getColors() {
  return currentMode === 'dark' ? darkColors : lightColors;
}

function getMode() {
  return currentMode;
}

function setMode(mode) {
  currentMode = mode;
}

module.exports = {
  getColors: getColors,
  getMode: getMode,
  setMode: setMode,
};
