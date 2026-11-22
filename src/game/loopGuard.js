// Phaser's RequestAnimationFrame only schedules the next frame AFTER the step
// callback returns. A single exception inside one frame therefore stops the
// whole game permanently ("freeze") while the DOM HUD keeps running.
// This wrapper swallows + logs the error so the loop always continues.
export function installLoopGuard(game) {
  if (!game || game.__baiLoopGuard) return;
  game.__baiLoopGuard = true;
  window.baiLoopErrors = window.baiLoopErrors || [];
  let lastLog = 0;
  const attach = () => {
    const raf = game.loop?.raf;
    if (!raf || typeof raf.callback !== "function" || raf.__baiGuarded) return;
    const original = raf.callback;
    raf.__baiGuarded = true;
    raf.callback = (time) => {
      try {
        original(time);
      } catch (error) {
        window.baiLoopErrors.push({ at: Date.now(), message: String(error?.message || error), stack: String(error?.stack || "").split("\n").slice(0, 4).join(" | ") });
        if (window.baiLoopErrors.length > 20) window.baiLoopErrors.shift();
        const now = performance.now();
        if (now - lastLog > 1000) { lastLog = now; console.error("[BAI] frame error (loop kept alive):", error); }
        try {
          const ctx = game.renderer?.currentContext;
          if (ctx?.setTransform) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; }
          game.loop.resetDelta?.();
        } catch { /* ignore */ }
      }
    };
  };
  attach();
  if (!game.loop?.raf?.__baiGuarded) game.events.once("prestep", attach);
}
