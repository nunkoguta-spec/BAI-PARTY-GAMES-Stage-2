# BAI PARTY GAMES — Android & iOS compatibility patch

## Scope
- Keep Phaser logical game resolution fixed at 480x270 (16:9).
- Stop resizing the Phaser game/camera to raw browser pixel dimensions.
- Size the phone game host to a centered 16:9 viewport based on the live visual viewport.
- Preserve aspect ratio on portrait and landscape phones rather than stretching the canvas.
- Account for iOS safe areas and dynamic Safari viewport changes.
- Refresh layout on resize, orientation change, fullscreen changes, pageshow, and visualViewport changes.
- Add `viewport-fit=cover` to the TV host page.

## Compatibility target
- Android Chrome (portrait and landscape)
- iOS Safari (portrait and landscape)
- iOS Home Screen/PWA display mode

## Validation performed
- `node --check client-play/controller.js` — passed
- `node --check src/main.js` — passed
- `node --check src/scenes/WorldScene.js` — passed

## Still required before release
Test on physical Android and iPhone/iPad devices. Browser emulation cannot fully reproduce iOS Safari browser chrome, notch/home-indicator safe areas, and device-specific touch behavior. No claim of physical-device certification is made.
