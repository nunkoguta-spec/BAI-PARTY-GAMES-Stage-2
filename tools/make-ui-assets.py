"""Generates pixel-art UI atlas (9-slice frames, buttons, category icons) for BAI PARTY GAMES.
Run: python3 tools/make-ui-assets.py"""
from PIL import Image, ImageDraw
import os
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "ui")
os.makedirs(OUT, exist_ok=True)
def C(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))+(255,)

def frame(name, size, border, fill, hi, lo, outline="#0b0716", inner="#1a1230", ornament=None):
    im = Image.new("RGBA", (size, size), (0,0,0,0)); d = ImageDraw.Draw(im)
    r = lambda b, c: d.rectangle([b, b, size-1-b, size-1-b], outline=C(c))
    r(0, outline)                       # black outline
    for i in range(1, 4): r(i, border)  # gold band
    r(1, hi); r(3, lo)                  # bevel
    r(4, inner)
    d.rectangle([5, 5, size-6, size-6], fill=C(fill))
    if ornament:                        # corner studs
        for (x, y) in [(2,2),(size-3,2),(2,size-3),(size-3,size-3)]:
            d.rectangle([x-1,y-1,x+1,y+1], fill=C(ornament))
    im.save(os.path.join(OUT, name))

frame("panel-navy.png", 48, "#c8902c", "#17163a", "#ffe08a", "#8a5a14", ornament="#fff2b0")
frame("panel-parchment.png", 48, "#c8902c", "#f3e6c4", "#ffe08a", "#8a5a14", inner="#b98a45", ornament="#fff2b0")
frame("ribbon.png", 32, "#c8902c", "#2a1747", "#ffe08a", "#8a5a14", inner="#120a26")
frame("thumb.png", 32, "#4a4f8c", "#1f2150", "#8d93e0", "#2a2c66", inner="#0f1030")
frame("thumb-selected.png", 32, "#f0b92e", "#3a2a18", "#fff2a0", "#b0741a", inner="#4a2c12")

def button(name, top, mid, bot, hi, lo):
    s = 24; im = Image.new("RGBA", (s, s), (0,0,0,0)); d = ImageDraw.Draw(im)
    d.rectangle([0,0,s-1,s-1], outline=C("#0b0716"))
    d.rectangle([1,1,s-2,s-2], fill=C(mid))
    d.rectangle([1,1,s-2,3], fill=C(hi)); d.rectangle([1,s-5,s-2,s-2], fill=C(lo))
    d.rectangle([2,4,s-3,s//2], fill=C(top))
    im.save(os.path.join(OUT, name))
button("btn-green.png", "#7ed957", "#4caf2a", "#2a7a14", "#c4ff9a", "#2a7a14")
button("btn-cream.png", "#fff6dc", "#f1dfb0", "#d6b873", "#ffffff", "#b8934a")
button("btn-gold.png", "#ffe27a", "#f0b92e", "#b0741a", "#fff6c0", "#8a5a14")
button("btn-red.png", "#ff7a6a", "#d93a3a", "#8f1f24", "#ffc0b8", "#8f1f24")

ICONS = {
 "face": ["................","....########....","...##########...","..##yyyyyyyyyy#.","..#yyyyyyyyyyy#.","..#yyKKyyKKyyy#.","..#yyKKyyKKyyy#.","..#yyyyyyyyyyy#.","..#yyyyrryyyyy#.","..#yyyyyyyyyyy#.","...#yyyyyyyyy#..","....#yyyyyyy#...",".....#######....","................","................","................"],
 "eyes": ["................","................","................","..wwwwww.wwwwww.","..wKKKKw.wKKKKw.","..wKbbKw.wKbbKw.","..wKKKKw.wKKKKw.","..wwwwww.wwwwww.","................","................","................","................","................","................","................","................"],
 "hair": ["................",".....######.....","...##hhhhhh##...","..#hhhhhhhhhh#..","..#hhhhhhhhhh#..","..#hh######hh#..","..#h#yyyyyy#h#..","..#h#yyyyyy#h#..","..#h#yyyyyy#h#..","...##yyyyyy##...","................","................","................","................","................","................"],
 "top": ["................","..###......###..","..#ttt####ttt#..","..#tttttttttt#..","..#ttttttttttt#.","..#tttttwwtttt#.","..###tttwwttt##.","....#tttwwttt#..","....#tttttttt#..","....#tttttttt#..","....#tttttttt#..","....##########..","................","................","................","................"],
 "bottoms": ["................","................","...############.","...#pppppppppp#.","...#pppppppppp#.","...#pppp##pppp#.","...#ppp#..#ppp#.","...#ppp#..#ppp#.","...#ppp#..#ppp#.","...#ppp#..#ppp#.","...####....####.","................","................","................","................","................"],
 "shoes": ["................","................","................","................","................","..####....####..","..#sss#..#sss#..","..#ssss####sss#.","..#ssssssssssss#","..wwwwwwwwwwwww.","..##############","................","................","................","................","................"],
}
PAL = {"#":"#0b0716","y":"#f6c79a","K":"#1b1320","r":"#d86a6a","h":"#7a4a2a","t":"#d93a3a","w":"#ffffff","p":"#3a5fcf","s":"#c8902c","b":"#5a3a1a"}
for n, rows in ICONS.items():
    im = Image.new("RGBA", (16, 16), (0,0,0,0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row[:16]):
            if ch in PAL: im.putpixel((x, y), C(PAL[ch]))
    im.save(os.path.join(OUT, f"icon-{n}.png"))
print("UI assets written to", os.path.abspath(OUT))
