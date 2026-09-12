# Video Controls

Chrome extension that gives every `<video>` on the web a real player: seek bar, speed, volume and keyboard shortcuts.

Plenty of sites embed video with no controls at all, or bury the player under their own click-catching overlays. Instagram is the worst offender and the reason this exists, but it works the same way everywhere.

> Not affiliated with, endorsed or sponsored by Instagram, Meta, or any other site.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Reload any page with video on it.

## Where it runs

It runs on every site, and stays out of the way where it isn't wanted:

- Videos that already have controls (`<video controls>`) are left alone.
- Videos inside a third-party player shell (video.js, JW Player, Plyr, Shaka, MediaElement) are left alone.
- Sites that ship a full player of their own (YouTube, Netflix, Twitch, Vimeo, Prime Video, Disney+, Max, Hulu, Crunchyroll, Apple TV, Dailymotion, Bilibili, Spotify) are off by default.
- Videos smaller than 200×140 px are ignored, so autoplaying banners stay untouched.
- Any site can be switched on or off from the popup, including the ones off by default.

Videos inside iframes and shadow DOM are found too. On a page with no video the extension does nothing at all: the draw loop never starts.

## Features

Two modes, switchable from the extension's popup:

**Custom panel (default)**, a player panel that fits Instagram:
- The seek bar fills with Instagram's story-ring gradient, so its colour also tells you how far into the video you are.
- Hover the seek bar to see the time and a preview frame (frames are collected from the parts you've already watched).
- Play/pause, ±5 s skip, volume (slider unfolds on hover, adjustable with the scroll wheel), speed menu (also changes with the scroll wheel), picture-in-picture, fullscreen.
- Tooltips show each control's keyboard shortcut.
- The panel hides when the mouse is idle and leaves a thin progress line along the bottom edge.
- Keyboard actions get on-screen feedback: a play/pause disc, a stacking "+10 s" seek indicator, a speed readout.
- On narrow players, secondary buttons hide automatically. The keyboard shortcuts still work.

The panel is drawn in the browser's *top layer* (Popover API), so no overlay on the page can cover it, and it never modifies the page's DOM.

Live streams are detected: the timeline is disabled and the duration reads CANLI.

**Chrome controls** turns on Chrome's own video controls and makes the site's transparent click-catching layers click-through. Small buttons above the control strip, like carousel arrows, keep working. Site buttons that sit on top of the control strip, like Instagram's mute button, are disabled; Chrome's own controls replace them.

**Clean fullscreen (`F` / ⛶)**: in both modes, the video element itself goes fullscreen with Chrome's native controls, so nothing from Instagram stays on screen.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` / `K` | Play / pause |
| `←` `→` | Seek back / forward 5 s (configurable in the popup) |
| `J` `L` | Seek back / forward 10 s |
| `M` | Mute / unmute |
| `F` | Clean fullscreen (Chrome controls) |
| `P` | Picture-in-picture |
| `<` `>` | Slower / faster |
| `,` `.` | Previous / next frame |
| `0`–`9` | Jump to 0–90% of the video |
| `Home` / `End` | Jump to start / end |

Shortcuts apply to the video that takes up the most space on screen, from anywhere on the page. They're ignored while you're typing in an input, textarea or rich-text box. Note that single-letter shortcuts can collide with a site's own shortcuts; switch the extension off for that site from the popup if it gets in the way.

## Settings

The popup lets you set: this site on/off, global on/off, control style, always show the panel, panel position (inside the video at the bottom or top, or below the video), right-side gap (keeps site buttons in the corner clickable), seek step and default speed.

## Notes

- Single-page apps re-render constantly; a MutationObserver picks up new videos as they appear.
- Clicks on the panel never reach the page's document/window listeners, so behaviours like "click outside to close" aren't triggered.
- On long videos, seeking is instant only within already-downloaded segments. A short buffering pause when jumping further ahead is normal.
- Preview frames exist only for parts you've already watched: there is one stream per video element, so there's no second decoder to pull unseen frames from. DRM-protected video (Netflix and friends) yields no preview frames at all.

## Publishing

See [PUBLISHING.md](PUBLISHING.md) for the Chrome Web Store checklist (in Turkish).
