// Measures this browser's offset to the SERVER clock (best of a few pings, lowest round-trip wins)
// and stores it in window.baiServerClockOffset. Timed traps use it so every screen shows the
// same phase the server uses to judge hits. Safe to call repeatedly.
export function syncServerClock(socket, samples = 4) {
  if (!socket?.connected) return Promise.resolve(null);
  let best = null;
  const once = () => new Promise((resolve) => {
    const t0 = Date.now();
    const timer = setTimeout(() => resolve(null), 2500);
    socket.emit("clock:sync", {}, (res) => {
      clearTimeout(timer);
      const t1 = Date.now();
      if (!res?.ok || !Number.isFinite(Number(res.serverNow))) return resolve(null);
      resolve({ rtt: t1 - t0, offset: Number(res.serverNow) + (t1 - t0) / 2 - t1 });
    });
  });
  return (async () => {
    for (let i = 0; i < samples; i++) {
      const r = await once();
      if (r && (!best || r.rtt < best.rtt)) best = r;
    }
    if (best) window.baiServerClockOffset = best.offset;
    return best;
  })();
}
