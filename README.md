# ytTheme — calm YouTube

A Chrome extension (Manifest V3) that removes noise from YouTube and lets you
restyle it: a glass layout over your own wallpaper, a greeting, themes, and
tools to find what's worth watching. It runs only on `youtube.com`. Nothing is
paywalled.

![ytTheme on the YouTube home page: a floating top bar and icon rail over a black-and-white photo, a "Still up, Achu" greeting, and the topic and sort bar](docs/screenshot.png)

## Features

**Cleanup.** Every item has its own switch:

- Hide Shorts, or open Shorts as normal videos.
- Hide feed ads, banners and merch, and skip video ads.
- Hide games (Playables and the Gaming chip), topic chips, and Mixes.
- Hide the home recommendations, the suggestions beside the player, end screens, and comments.
- Stop autoplay of the next video.
- Skip sponsor reads, self-promotion and “like and subscribe” reminders (and optionally intros, end cards and non-music parts), using [SponsorBlock](https://sponsor.ajay.app). Each skip shows Undo, and segments are marked on the progress bar.
- Tone down clickbait: ALL-CAPS titles become sentence case, and thumbnails can be swapped for a frame from the video.
- Tidy the sidebar: hide Explore, More from YouTube and the footer.
- Show the dislike count (from [Return YouTube Dislike](https://returnyoutubedislike.com)) and a classic like/dislike ratio bar.

**Find what's worth watching.** A bar on Home, Subscriptions and channel Videos tabs:

- Topic: All, AI, Tech, or your own named topics (for example “F1” or “Markets”), each with its own words.
- Sort: Newest, Most viewed, or Taking off (views per hour since upload).
- Time window: any time, the last 24 hours, or this week.

**Design:**

- **Glass layout.** A floating smoked-glass top bar and a small icon rail replace the full sidebar. Cards keep YouTube's own layout on a soft backing. An overlay-card style is optional.
- **Wallpapers.** Four illustrated scenes drawn as SVG, two gradients, or your own picture. Drag and zoom your picture to choose which part shows. Optionally switch to a second wallpaper in the evening.
- **Readable text on any picture.** ytTheme measures how light your wallpaper is, separately behind the greeting. Text straight on the wallpaper switches to dark or light to match, and see-through chips get solid fills when needed.
- **Greeting.** Shows your name, with its colour taken from your wallpaper or one you choose.
- **Themes.** Six palettes or your own colours, plus a choice of fonts.
- **Mood.** A watch room that dims the page and lets the video's colours glow around the player, gentle motion, and soft synthesised click sounds.
- **In-page settings.** Press the ✦ button, then click any part of the page to open that part's settings.

**Playback:** a default speed, a preferred quality, and theater mode by default. They're applied once per video, so manual changes still stick.

**YouTube tools:**

- One-click Not interested (Shift-click: Don't recommend channel) and Watch later buttons on each video. While pointing at a video, N and W do the same.
- Watch time: today's and this week's totals in the toolbar popup, and an optional gentle note after a daily limit.
- Hide a channel or a word from any video's ⋮ menu, and hide videos you've watched.
- Sidebar shortcuts to History, Playlists, Watch later and Liked.
- A search box on the History page, backed by a private list of the videos you open. The list stays in this browser.
- A cleaner player, and a suggestions column you can drag to resize.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this folder (the one with `manifest.json`).
4. Pin ytTheme from the puzzle-piece menu. The settings page opens on first install.

After pulling changes, click the reload icon on ytTheme's card in
`chrome://extensions`, then refresh any open YouTube tabs. Tabs that were open
during the reload keep the old version until refreshed.

## Privacy

Your pictures, the History search list and your watch time are kept in
`chrome.storage.local`, on this computer only.

Settings sync through your Chrome account's `chrome.storage.sync` while the Sync
switch is on.

ytTheme makes two kinds of network request, each only while its switch is on:

- Dislike counts from `returnyoutubedislikeapi.com`, which receives the video ID.
- Skip segments from `sponsor.ajay.app` (SponsorBlock), which receives only the first 4 characters of a SHA-256 hash of the video ID. It returns segments for every video that shares that prefix, so it can't tell which video you're watching.

## Layout

```
manifest.json
src/background.js            service worker: migrations, dislike counts, SponsorBlock, settings sync
src/shared/wallpapers.js     the illustrated wallpapers (SVG)
src/shared/settings.js       defaults, themes, backgrounds, storage helpers
src/shared/ui.js             settings controls shared by popup, options, in-page panels
src/content/shared/          runtime (core.js), sounds + watch room, in-page panels, design layer
src/content/youtube/         cleanup, filters, sort bar, ⋮ menu, dislikes, SponsorBlock, playback, watch time, sidebar, history, greeting, tokens
src/content/youtube/page.js  runs inside YouTube's page to set speed and quality through the player's own API
src/popup/  src/options/     toolbar popup and full settings page
```

How it works:

- `core.js` mirrors settings onto `<html>` as `data-lull-*` attributes and CSS variables, so the static stylesheets react instantly.
- Scripts handle what CSS can't, such as matching text, the ⋮ menu, ad skipping and sorting.
- `core.js` measures the wallpaper's brightness to set the text tone. For your own picture, it measures the part actually on screen.
- Themes remap YouTube's `--yt-spec-*` and `--yt-sys-color-baseline--*` tokens. YouTube also has hashed aliases (`--t…`) that hold fixed colours; `youtube/tokens.js` pairs each one with its readable token at load time.
