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
  startX: 240,
  startY: 208,
  questionBoxes: Object.freeze([]),
  hazards: Object.freeze([]),
  slugs: Object.freeze([])
});
