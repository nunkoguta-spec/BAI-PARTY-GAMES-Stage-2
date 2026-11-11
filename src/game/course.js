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
    Object.freeze({ id: "munich", name: "MÜNCHEN", startX: 0, endX: 2400, landmark: "Rathaus / Marienplatz" }),
    Object.freeze({ id: "frankfurt", name: "FRANKFURT", startX: 2400, endX: 4800, landmark: "Skyline am Main" }),
    Object.freeze({ id: "berlin", name: "BERLIN", startX: 4800, endX: 7200, landmark: "Brandenburger Tor" }),
    Object.freeze({ id: "hamburg", name: "HAMBURG", startX: 7200, endX: 9600, landmark: "Hafen / Elbphilharmonie" })
  ]),
  startX: 240,
  startY: 208,
  questionBoxes: Object.freeze([
    { x: 360, y: 176, id: "question-box-01", tier: 1 },
    { x: 800, y: 176, id: "question-box-02", tier: 1 },
    { x: 1300, y: 176, id: "question-box-03", tier: 1 },
    { x: 2000, y: 176, id: "question-box-04", tier: 1 },
    { x: 2700, y: 176, id: "question-box-05", tier: 1 },
    { x: 3700, y: 176, id: "question-box-06", tier: 1 },
    { x: 4400, y: 176, id: "question-box-07", tier: 2 },
    { x: 5100, y: 176, id: "question-box-08", tier: 2 },
    { x: 5800, y: 176, id: "question-box-09", tier: 2 },
    { x: 6500, y: 176, id: "question-box-10", tier: 2 },
    { x: 7100, y: 176, id: "question-box-11", tier: 3 },
    { x: 7800, y: 176, id: "question-box-12", tier: 3 },
    { x: 8500, y: 176, id: "question-box-13", tier: 3 },
    { x: 9200, y: 176, id: "question-box-14", tier: 3 }
  ]),
  hazards: Object.freeze([
    { id: "hazard-01", x: 1120, y: 208 },
    { id: "hazard-02", x: 2350, y: 208 },
    { id: "hazard-03", x: 3900, y: 208 },
    { id: "hazard-04", x: 5250, y: 208 },
    { id: "hazard-05", x: 6650, y: 208 },
    { id: "hazard-06", x: 8000, y: 208 },
    { id: "hazard-07", x: 8750, y: 208 }
  ]),
  slugs: Object.freeze([
    { id: "slug-01", x: 1750, y: 208, width: 84 },
    { id: "slug-02", x: 3200, y: 208, width: 96 },
    { id: "slug-03", x: 4650, y: 208, width: 108 },
    { id: "slug-04", x: 6100, y: 208, width: 118 },
    { id: "slug-05", x: 7550, y: 208, width: 128 },
    { id: "slug-06", x: 8580, y: 208, width: 142 }
  ])
});
