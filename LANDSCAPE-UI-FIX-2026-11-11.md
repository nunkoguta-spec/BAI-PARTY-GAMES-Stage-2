# BAI PARTY GAMES — Landscape UI correction

## Scope
- Removed the narrow 480px controller width cap for landscape viewports.
- Widened the player join/customization panel on landscape desktop/tablet.
- Increased the live character preview and item thumbnail sizes.
- Rebalanced the customization layout into category rail, large preview, and wider item grid.
- Added a compact layout for short landscape phone screens.

## Important asset note
The current avatar source contains layered sprite sheets for the existing avatar system. It does not yet provide independently verified male and female base-body sets, nor finished hat/accessory/effect sprite sheets. This patch does not pretend those missing assets exist.

## Validation
CSS override is appended to `client-play/reference-ui.css`, which is loaded after `client-play/style.css` by `client-play/index.html`.
