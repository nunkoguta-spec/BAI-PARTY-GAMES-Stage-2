export const COURSE = Object.freeze({
  tileSize: 32,
  sourceColumns: 120,
  columns: 375,
  rows: 12,
  width: 12000,
  height: 384,
  finishX: 11830,
  finishY: 210,
  hazardPenalty: 5,
  finishBonusSeconds: 0.1,
  worldColumns: 375,
  startPlatformRow: 4,
  finishGraceMs: 180000,
  questionBoxes: Object.freeze([]),   // Question Box dihapus; kuis sekarang hanya lewat battle musuh
  stages: Object.freeze([
    Object.freeze({ id: "munich", season: "autumn", name: "MÜNCHEN", startX: 0, endX: 2400, landmark: "Rathaus / Marienplatz", station: "MÜNCHEN HBF", next: "FRANKFURT" }),
    Object.freeze({ id: "frankfurt", season: "summer", name: "FRANKFURT", startX: 2400, endX: 4800, landmark: "Skyline am Main", station: "FRANKFURT HBF", next: "BERLIN" }),
    Object.freeze({ id: "berlin", season: "winter", name: "BERLIN", startX: 4800, endX: 7200, landmark: "Brandenburger Tor", station: "BERLIN HBF", next: "HAMBURG" }),
    Object.freeze({ id: "hamburg", season: "spring", name: "HAMBURG", startX: 7200, endX: 9600, landmark: "Hafen / Elbphilharmonie", station: "HAMBURG HBF", next: "KÖLN" }),
    Object.freeze({ id: "koeln", season: "spring", name: "KÖLN", startX: 9600, endX: 12000, landmark: "Kölner Dom / Rhein", station: "KÖLN HBF", next: null })
  ]),
  startX: 160,
  startY: 208,
  hazards: Object.freeze([]),
  slugs: Object.freeze([])
});
