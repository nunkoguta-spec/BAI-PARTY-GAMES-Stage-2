# Stage 5 KÖLN + NPC quest (2026-11-14)

## Stage 5
- `course.js`: stage `koeln` (spring, x 9600-12000), width 12000, finishX 11830, question boxes 15-17. Hamburg `next` = KÖLN.
- Finish / Endstation is now the LAST stage (no more hardcoded Hamburg). Hamburg is a normal station with a train to Köln.
- Backdrop `seasons/koeln-spring.png` is procedurally drawn by `tools/make-koeln-backdrop.py` (replace with hand-made art any time, 2400x224).

## NPC quest (`src/game/quests.js`)
- 4 NPCs: Sari, Dinda (cewe), Raka, Bima (cowo). Walk near -> BICARA button (phone) / E key (desktop).
- Quest: meet someone of the opposite gender and ask for their Instagram. Gender is asked once in the dialog.
- Honor-based confirmation; server (`quest:complete`) checks stage, NPC, distance, one reward per NPC per player: +15 points each.
- Optional: does NOT block finishing. HUD shows "MISI IG n/4"; TV shows a floating "+15" toast.

## Tests
- `node scripts/test-quest.js` passes. `test-stage-progression.js` now covers 5 stages.

## Not verified
- `vite build` could not run in the packaging sandbox (Windows node_modules, missing rollup native). Run `npm run build` locally.
- No browser / phone visual test was done.
