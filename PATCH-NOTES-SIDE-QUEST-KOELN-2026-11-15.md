# Side quest Köln (final stage), no points

- Stage 5 KÖLN: no question boxes, no points. 1 NPC (Dinda) gives the side quest:
  "SILAHKAN BERKENALAN DENGAN KELAS LAIN DAN BERTUKARAN INSTAGRAM" (min 2 cewe + 2 cowo).
- Dialog now has honor-based counters for CEWE and COWO; the finish button stays disabled until both reach 2.
- Server `quest:complete` additionally requires `targets.female >= 2` and `targets.male >= 2` (`QUEST.minFemale/minMale`). Awards 0 points and does not touch the leaderboard.
- FIX: the uploaded `course.js` had lost the whole `questionBoxes` list, so the server silently fell back to its default positions. Original boxes of stages 1-4 (12 boxes) are restored; Köln has none.
- Tests: `test-quest.js` (extended), `test-stage-progression.js`, `test-full-suite.js` all pass.
- Not verified: `npm run build` (sandbox lacks rollup native) and visual/phone QA. Run `npm ci && npm run build` locally.
