// Enemy battles: one enemy per stage (München, Frankfurt, Berlin, Hamburg boss).
// To defeat an enemy the player must answer `total` quiz questions correctly.
// The questions AND answers live only on the server (server/battleQuestions.js)
// so they never ship to the client. Köln (stage 5) has no enemy: it is the
// peaceful NPC / side-quest stage.
//
// Battles never award points and never touch the leaderboard.
import { COURSE } from "./course.js";

export const BATTLE = Object.freeze({
  reach: 76, // px: how close the player must be to start a fight
  playerMaxHp: 100, // every player starts with, and respawns with, this much HP
  koPenalty: 25, // points lost ONCE per K.O. (HP reached 0)
  koRespawnMs: 1800, // time on the floor before the server respawns the player
  contactCooldownMs: 1200, // min. time between two contact hits from the same enemy
  // Each stage is a difficulty level: harder questions and a higher point reward per correct answer.
  stages: Object.freeze({
    munich:    Object.freeze({ enemyId: "muenchen",    name: "LV.1 · A1",      level: 1, cefr: "A1",    levelLabel: "LEVEL 1 · A1 DASAR",     pointsMultiplier: 1,   total: 3,  offset: 850,  maxHp: 80,  wrongDamage: 10, boss: false }),
    frankfurt: Object.freeze({ enemyId: "frankfurt",   name: "LV.2 · A1+",     level: 2, cefr: "A1+",   levelLabel: "LEVEL 2 · A1 LANJUT",    pointsMultiplier: 1.5, total: 5,  offset: 850,  maxHp: 80,  wrongDamage: 10, boss: false }),
    berlin:    Object.freeze({ enemyId: "berlin",      name: "LV.3 · A2",      level: 3, cefr: "A2",    levelLabel: "LEVEL 3 · A2",           pointsMultiplier: 2,   total: 8,  offset: 850,  maxHp: 80,  wrongDamage: 12, boss: false }),
    hamburg:   Object.freeze({ enemyId: "boss_tycoon", name: "BOSS LV.4 · B1", level: 4, cefr: "A2/B1", levelLabel: "LEVEL 4 · A2/B1 BOSS",   pointsMultiplier: 3,   total: 10, offset: 1500, maxHp: 300, wrongDamage: 15, boss: true })
  })
});

export const TIER_LABELS = Object.freeze({ 1: "MUDAH", 2: "SEDANG", 3: "SULIT" });

// Difficulty curve of one fight: the first third of the questions are tier 1, the middle
// third tier 2, the last third tier 3 (e.g. 3 -> 1,2,3 | 5 -> 1,1,2,3,3 | 10 -> 1,1,1,2,2,2,2,3,3,3).
export function battlePlan(total) {
  return Array.from({ length: total }, (_, i) => {
    const ratio = (i + 0.5) / total;
    return ratio < 0.34 ? 1 : ratio < 0.67 ? 2 : 3;
  });
}

export function battleConfig(stageId) {
  return BATTLE.stages[stageId] || null;
}

export function battleEnemyX(stageId) {
  const stage = COURSE.stages.find((item) => item.id === stageId);
  const cfg = battleConfig(stageId);
  if (!stage || !cfg) return null;
  return Math.min(stage.endX - 300, stage.startX + cfg.offset);
}
