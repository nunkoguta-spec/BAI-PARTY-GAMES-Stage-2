"""Membuat varian warna cerah (gaya platformer klasik) dari aset CC0 asli.
Hanya pemetaan palet piksel-ke-piksel: bentuk, ukuran, dan alpha tidak berubah.
Jalankan dari akar proyek:  python3 tools/make-bright-assets.py
File asli tidak diubah; hasil ditulis sebagai file baru berakhiran -bright / -blue / -green.
"""
from PIL import Image

A = "public/assets/"

def hx(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))

def remap(src, dst, table, fallback=None):
    im = Image.open(A + src).convert("RGBA")
    px = im.load()
    t = {hx(k): hx(v) for k, v in table.items()}
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if (r, g, b) in t:
                px[x, y] = (*t[(r, g, b)], a)
            elif fallback:
                px[x, y] = (*fallback, a)
    im.save(A + dst)
    print("ok", dst)

# Langit biru cerah (6 pita warna -> gradasi biru)
remap("backgrounds/mountains/sky.png", "backgrounds/mountains/sky-bright.png", {
    "#5bb8c0": "#2f86f0", "#6bc2c7": "#3f95f5", "#7ecdcf": "#52a6f9",
    "#8dd6d6": "#6bb8fb", "#a6e1dd": "#8ccbfd", "#bceae3": "#b4e0ff",
})

# Gunung biru dengan puncak salju putih (sisi terang -> salju)
remap("backgrounds/mountains/mountains-4.png", "backgrounds/mountains/mountains-snow-blue.png", {
    "#5e3643": "#5d8fd2", "#7a444a": "#4a78bd",
    "#a05b53": "#d3e4f8", "#bf7958": "#ffffff",
}, fallback=(0x5d, 0x8f, 0xd2))

# Bukit hijau muda (jauh) dan hutan hijau tua (dekat)
remap("backgrounds/mountains/mountains-3.png", "backgrounds/mountains/hills-green.png",
      {"#4e2f3e": "#66c05f"})
remap("backgrounds/mountains/mountains-1.png", "backgrounds/mountains/forest-green.png",
      {"#35232f": "#2f9a3d"})

# Tileset: rumput hijau terang + tanah cokelat hangat
remap("tiles/mountains-tiles.png", "tiles/mountains-tiles-bright.png", {
    # rumput
    "#acbd62": "#b8f257", "#98a852": "#82d82c", "#7f8d3f": "#5db821",
    "#68762d": "#469a1b", "#545e29": "#3a8016", "#3c4417": "#2a6612",
    # tanah
    "#1e130e": "#a9632c", "#211511": "#b06b31", "#190f0d": "#9a5726",
    # kerikil / garis tepi
    "#5a3831": "#7c4420", "#643e37": "#6b3a1a", "#8a503e": "#7c4420",
    "#331d1a": "#5a3014", "#3e241f": "#5a3014", "#3d261f": "#5a3014",
    "#5c3a41": "#6b3a1a", "#3c2940": "#5a3014",
})
