# Kiosk Video Screensaver — Design Spec

> **Date:** 2026-07-27
> **Status:** Approved by Steven

## Purpose

The touchscreen kiosk should play a video of Cosmo and Echo
(`media/cosmo-echo-vid.mp4`) as a screensaver after 5 minutes of
inactivity, and the display must never sleep or blank.

## Design

1. **Video asset** — copy `media/cosmo-echo-vid.mp4` to
   `ui/public/media/cosmo-echo-vid.mp4` (served statically; not bundled).
2. **`ui/src/components/Screensaver.tsx`** — resets an idle timer on
   `pointerdown`/`mousemove`/`keydown`/`touchstart`. After
   `IDLE_TIMEOUT_MS` (5 min), renders a full-screen fixed overlay with a
   looping, muted, autoplaying video (fade-in). Any interaction dismisses
   it and restarts the timer. Mounted once in `App.tsx` above the routes.
3. **Display sleep prevention** —
   `powerSaveBlocker.start('prevent-display-sleep')` in
   `ui/public/electron.js`; `xset s off -dpms` (guarded, X11 only) in
   `ui/start-kiosk.sh`.
4. **Deployment** — copy changed files + video to the touchscreen Pi and
   restart the kiosk service.

Out of scope: photo-slideshow fallback (video only, per approval),
configurable timeout UI.
