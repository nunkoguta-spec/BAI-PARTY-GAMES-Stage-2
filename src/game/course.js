export const COURSE = Object.freeze({
  tileSize: 32,
  sourceColumns: 120,
  columns: 300,
  rows: 12,
  width: 9600,
  height: 384,
  finishX: 9430,
  finishY: 210,
  hazardPenalty: 5,
  finishBonusSeconds: 0.1,
  worldColumns: 300,
  startPlatformRow: 4,
  finishGraceMs: 180000,
  stages: Object.freeze([
    Object.freeze({ id: "munich", name: "MÜNCHEN", startX: 0, endX: 2400, landmark: "Rathaus / Marienplatz", station: "MÜNCHEN HBF", next: "FRANKFURT" }),
    Object.freeze({ id: "frankfurt", name: "FRANKFURT", startX: 2400, endX: 4800, landmark: "Skyline am Main", station: "FRANKFURT HBF", next: "BERLIN" }),
    Object.freeze({ id: "berlin", name: "BERLIN", startX: 4800, endX: 7200, landmark: "Brandenburger Tor", station: "BERLIN HBF", next: "HAMBURG" }),
    Object.freeze({ id: "hamburg", name: "HAMBURG", startX: 7200, endX: 9600, landmark: "Hafen / Elbphilharmonie", station: "HAMBURG HBF", next: null })
  ]),
  startX: 160,
  startY: 208,
  questionBoxes: Object.freeze([
    Object.freeze({ x: 500, y: 176, id: "question-box-01", tier: 1 }),
    Object.freeze({ x: 1050, y: 176, id: "question-box-02", tier: 1 }),
    Object.freeze({ x: 1600, y: 176, id: "question-box-03", tier: 1 }),
    Object.freeze({ x: 2900, y: 176, id: "question-box-05", tier: 1 }),
    Object.freeze({ x: 3550, y: 176, id: "question-box-06", tier: 1 }),
    Object.freeze({ x: 4200, y: 176, id: "question-box-07", tier: 2 }),
    Object.freeze({ x: 5300, y: 176, id: "question-box-08", tier: 2 }),
    Object.freeze({ x: 6000, y: 176, id: "question-box-09", tier: 2 }),
    Object.freeze({ x: 6700, y: 176, id: "question-box-10", tier: 2 }),
    Object.freeze({ x: 7700, y: 176, id: "question-box-12", tier: 3 }),
    Object.freeze({ x: 8350, y: 176, id: "question-box-13", tier: 3 }),
    Object.freeze({ x: 9000, y: 176, id: "question-box-14", tier: 3 })
  ]),
  hazards: Object.freeze([]),
  slugs: Object.freeze([])
});
