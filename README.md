# IG Video Controls

Chrome extension that adds a real video player to Instagram on the web: feed, reels, stories and post pages.

Instagram's web player has no seek bar, no speed control and swallows most clicks with its own overlays. This extension fixes that.

> Not affiliated with, endorsed or sponsored by Instagram or Meta.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Reload instagram.com.

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

The panel is drawn in the browser's *top layer* (Popover API), so none of Instagram's overlays can cover it, and it never modifies Instagram's DOM.

**Chrome controls** turns on Chrome's own video controls and makes Instagram's transparent click-catching layers click-through. Small buttons above the control strip, like carousel arrows, keep working. Instagram buttons that sit on top of the control strip, like its mute button, are disabled; Chrome's own controls replace them.

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

Shortcuts apply to the video that takes up the most space on screen. They're ignored while you're typing in a comment or DM box.

## Settings

The popup lets you set: on/off, control style, always show the panel, panel position (inside the video at the bottom or top, or below the video), right-side gap (keeps Instagram's corner button clickable), seek step and default speed.

## Notes

- Instagram re-renders its DOM constantly; a MutationObserver picks up new videos as they appear.
- Clicks on the panel never reach Instagram's document/window listeners, so things like "click outside to close the post" aren't triggered.
- On long videos, seeking is instant only within already-downloaded segments. A short buffering pause when jumping further ahead is normal.
- Preview frames exist only for parts you've already watched. Instagram provides a single stream per video, so there's no second decoder to pull unseen frames from.

## Publishing

See [PUBLISHING.md](PUBLISHING.md) for the Chrome Web Store checklist (in Turkish).
