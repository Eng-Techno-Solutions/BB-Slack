# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

BB Slack — a Slack client built with React Native (0.53.3) targeting **Android** and **Web** (via react-native-web). The Android app runs on a BlackBerry Q20 device with hardware keyboard and D-pad navigation.

## Commands

```bash
npm run web          # Start web dev server (react-scripts)
npm start            # Start Metro bundler for Android
npm run android      # Build and install on Android device
npm run build:android  # Build release APK (requires Java 8 / temurin-8)
```

No test or lint commands are configured.

## Dual Entry Points — Critical

There are **two separate App.js files** that must stay in sync:

- `App.js` (root) — Android entry. Has `BackHandler`, `AppState`, `DeviceEventEmitter`, native notification service management.
- `src/App.js` — Web entry. Has DOM theme application, simplified notification polling.

**Any navigation, state, or screen change must be applied to BOTH files** unless it's platform-specific logic.

## Architecture

- **All class components** — no hooks, no functional components. React 16.14.0.
- **Manual stack navigation** — `state.stack` array in App.js, with `navigate()`, `goBack()`, `replaceTop()`. No react-navigation.
- **Props drilling** — App component owns all global state, passes props to screens. No Redux/Context.
- **Slack API client** (`src/api/slack.js`) — wraps Slack Web API with Bearer token auth. Android hits `https://slack.com/api/` directly; web uses `/slack-api/` proxy (configured in `src/setupProxy.js`).
- **Code style** — uses `function` keyword throughout (no arrow functions in most files). Async/await is used. `var` has been replaced with `const`/`let`.

## Platform Patterns

**Platform-specific files** use suffix convention — Metro/react-scripts resolve automatically:
- `.web.js` for web, `.android.js` for Android (e.g., `Icon.web.js` / `Icon.android.js`)
- Examples: `notification.js`/`.web.js`, `filePicker.js`/`.web.js`, `NativeSound.js`/`.web.js`, `audioRecorder.js`/`.web.js`

**Icons**: Android uses `react-native-vector-icons/Feather`, web uses `lucide-react`. Both exposed through `Icon` component.

**HTTP**: Android uses `NativeModules.HttpModule` (Java bridge), web falls back to `fetch()`. Abstracted in `src/api/http.js`.

**Web proxy** (`src/setupProxy.js`): Two endpoints — `/slack-api` proxies to `slack.com/api`, `/slack-file` proxies authenticated file downloads (images, audio).

**Storage** (`src/utils/storage.js`): Web uses `localStorage`, Android uses `AsyncStorage`. All functions are async.

**Web-specific styling**: CSS in `public/index.html` targets `data-type` attributes for focus/hover styles. These attributes are silently ignored on Android.

**Focus/interaction**: Every interactive element needs:
- Web: CSS `:focus` style via `data-type` attribute in `public/index.html`
- Android: `TouchableHighlight` with `underlayColor`

## Theme System

`src/theme.js` — dark/light mode with `getColors()`, `setMode()`. Font sizes: small (13px), medium (15px), large (17px). On web, theme is applied via `data-theme` attribute on `<html>`.

## Screens

8 screens rendered by switch in `App.js#renderScreen()`: Login, ChannelList, Chat, Thread, Search, ChannelInfo, Settings, Profile.

## Key Components

- `MessageItem` — core message rendering (text, images, files, audio, reactions, threads)
- `SlackText` — token-based Slack markup parser (@mentions, #channels, links, bold, italic, code)
- `EmojiPicker` — grid emoji selector with search and Twemoji
- `ImageViewer` — modal image preview with zoom

## Hardware Keyboard (Q20)

`src/utils/keyEvents.js` bridges Android hardware key events. Screens implement `focusIndex`-based D-pad navigation for the Q20's trackpad and arrow keys.
