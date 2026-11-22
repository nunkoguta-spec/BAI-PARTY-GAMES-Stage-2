// Stage 5 (KÖLN) optional social side quest.
// One NPC gives one quest to meet people from other classes and exchange Instagram.
// This quest is separate from the main route and does not award points.

export const QUEST = Object.freeze({
  stageId: "koeln",
  points: 0,
  minFemale: 2,
  minMale: 2,
  interactRange: 70,
  npcs: Object.freeze([
    Object.freeze({
      id: "npc-deandra",
      altId: "npc-dinda",
      name: "FRAU DEANDRA",
      gender: "f",
      x: 11100,
      texture: "npc-deandra-idle",
      portrait: "/assets/deandra/portrait.png",
      avatar: Object.freeze({ skin: 4, hair: 5, eyes: 2, top: 27, bottoms: 2, shoes: 1 }),
      greeting: "Hallo! Guten Tag! Saya Frau Deandra. Herzlichen Glückwunsch telah mencapai Köln! Sebelum petualangan kalian berakhir, ada satu side quest penutup!",
      tip: "Mulai dengan menyapa ramah: 'Hallo! Wie heißt du?'. Ajak ngobrol sebentar lalu tukaran Instagram ya!"
    })
  ])
});

export function questNpcById(id) {
  return QUEST.npcs.find((npc) => npc.id === id || npc.altId === id) || null;
}
