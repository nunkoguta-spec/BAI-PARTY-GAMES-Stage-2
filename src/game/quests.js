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
      id: "npc-deandra", name: "FRAU DEANDRA", gender: "f", x: 11100,
      // Custom single-layer sprite (public/assets/npc). Replaces the old modular avatar.
      sprite: "npc-deandra",
      portrait: "/assets/npc/deandra_portrait_neutral.png",
      // Ekspresi dialog: neutral = sapaan, wink = quest berjalan, happy = quest selesai.
      portraits: Object.freeze({
        neutral: "/assets/npc/deandra_portrait_neutral.png",
        wink: "/assets/npc/deandra_portrait_wink.png",
        happy: "/assets/npc/deandra_portrait_happy.png",
        think: "/assets/npc/deandra_portrait_think.png"
      }),
      avatar: Object.freeze({ skin: 4, hair: 5, eyes: 2, top: 27, bottoms: 2, shoes: 1 }),
      greeting: "Hai! Aku Frau Deandra. Sebelum petualangan kalian berakhir, ada satu side quest tambahan!",
      tip: "Mulai dengan menyapa, sebutkan nama, ngobrol sebentar, lalu minta Instagram dengan sopan."
    })
  ])
});

export function questNpcById(id) {
  return QUEST.npcs.find((npc) => npc.id === id || npc.altId === id) || null;
}
