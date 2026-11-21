// Setiap angka adalah indeks baris pada spritesheet 32x32.
// Nilai awal dipilih dari baris pertama; semua variasi tetap berasal dari aset asli.
export const DEFAULT_AVATAR = Object.freeze({
  skin: 0,
  bottoms: 0,
  shoes: 0,
  top: 0,
  eyes: 0,
  hair: 0,
  // Gear layers (public/assets/avatar-gear). Row 0 is always empty = nothing equipped.
  glasses: 0,
  hat: 0,
  weapon: 0
});

export const AVATAR_SHEET_ROWS = Object.freeze({
  body: 5,
  bottoms: 64,
  shoes: 10,
  top: 79,
  eyes: 4,
  hair: 25,
  glasses: 82,
  hat: 81,
  weapon: 91
});
