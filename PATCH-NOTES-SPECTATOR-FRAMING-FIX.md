# Spectator framing fix — 2026-11-11

- Prevented the host overview camera from zooming out to fit players spread across the entire 9,600px course.
- The spectator overview now frames the median active-player cluster (within 720 world pixels) and clamps zoom to 0.52–0.90.
- Keeps the playable street in the lower half of the 16:9 viewport, avoiding the thin city strip and large empty-blue region shown in the previous TV screenshot.
- Single-player follow and multiplayer networking events remain unchanged.
