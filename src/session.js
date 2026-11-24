// Menyimpan sesi host / pemain di browser supaya refresh halaman (atau koneksi putus)
// tidak membuat room baru dan tidak mengeluarkan pemain dari room.
const HOST_KEY = "bai-host-session";
const PLAYER_KEY = "bai-player-session";
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

function read(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "null");
    if (!data || typeof data !== "object") return null;
    if (Date.now() - Number(data.savedAt || 0) > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify({ ...value, savedAt: Date.now() })); } catch {}
}

function clear(key) {
  try { localStorage.removeItem(key); } catch {}
}

export const loadHostSession = () => {
  const data = read(HOST_KEY);
  return data?.roomCode && data?.hostToken ? data : null;
};
export const saveHostSession = (roomCode, hostToken) => write(HOST_KEY, { roomCode, hostToken });
export const clearHostSession = () => clear(HOST_KEY);

export const loadPlayerSession = () => {
  const data = read(PLAYER_KEY);
  return data?.roomCode && data?.playerToken ? data : null;
};
export const savePlayerSession = (session) => write(PLAYER_KEY, session);
export const clearPlayerSession = () => clear(PLAYER_KEY);
