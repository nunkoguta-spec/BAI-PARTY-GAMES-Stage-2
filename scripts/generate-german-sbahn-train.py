import os
from PIL import Image, ImageDraw

def generate_german_sbahn_train():
    W, H = 104, 46
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # Palette - Official Deutsche Bahn Verkehrsrot
    DB_RED = (226, 26, 34, 255)
    DB_RED_BRIGHT = (248, 52, 60, 255)
    DB_RED_DARK = (165, 14, 22, 255)
    DB_RED_DEEP = (110, 8, 14, 255)

    WHITE = (248, 250, 254, 255)
    WHITE_SHADOW = (205, 214, 226, 255)
    ROOF_GREY = (200, 208, 220, 255)
    ROOF_DARK = (130, 140, 155, 255)
    ROOF_VENT = (75, 84, 98, 255)

    OUTLINE = (18, 14, 26, 255)
    CHASSIS = (32, 36, 46, 255)
    WHEEL_METAL = (115, 126, 142, 255)
    WHEEL_INNER = (24, 28, 38, 255)

    WIN_GLASS = (24, 38, 58, 255)
    WIN_CYAN = (64, 185, 245, 230)
    WIN_REFLECT = (245, 250, 255, 180)

    # 1. Pantograph on Roof (x: 28..46, y: 1..7)
    d.line([(34, 6), (37, 2)], fill=(180, 40, 40, 255), width=1)
    d.line([(37, 2), (43, 6)], fill=(180, 40, 40, 255), width=1)
    d.line([(32, 2), (45, 2)], fill=CHASSIS, width=1) # contact collector shoe
    d.rectangle([34, 6, 42, 7], fill=ROOF_DARK)

    # 2. Main Train Body Envelope (x: 3 .. 100, y: 7 .. 41)
    # Slanted front nose at right (x: 94 .. 102)
    body_poly = [
        (4, 10), (7, 7), (92, 7), (96, 9), (101, 16), (102, 28), (101, 38),
        (97, 41), (4, 41)
    ]
    d.polygon(body_poly, fill=DB_RED, outline=OUTLINE)

    # 3. Metallic Roof (y: 7 .. 14)
    roof_poly = [
        (4, 10), (7, 7), (92, 7), (96, 9), (99, 14), (4, 14)
    ]
    d.polygon(roof_poly, fill=ROOF_GREY, outline=OUTLINE)
    d.line([(7, 8), (92, 8)], fill=WHITE)
    d.line([(5, 13), (98, 13)], fill=ROOF_DARK)
    # Roof AC / Ventilation grilles
    for vx in (14, 24, 52, 62, 72):
        d.rectangle([vx, 9, vx + 7, 11], fill=ROOF_VENT)
        d.line([vx + 1, 10, vx + 6, 10], fill=WHITE_SHADOW)

    # 4. White Contrast Nose Panel with DB Logo (The signature German "Lätzchen" on nose)
    d.polygon([(92, 27), (100, 27), (100, 36), (92, 36)], fill=WHITE, outline=OUTLINE)
    # Red [DB] logo in center of white panel
    d.rectangle([94, 29, 98, 33], fill=DB_RED)
    d.line([95, 30, 95, 32], fill=WHITE)
    d.line([97, 30, 97, 32], fill=WHITE)

    # 5. Panoramic Driver's Cab Windshield (x: 92 .. 99, y: 15 .. 25)
    cockpit = [(92, 15), (96, 15), (99, 20), (99, 25), (92, 25)]
    d.polygon(cockpit, fill=WIN_GLASS, outline=OUTLINE)
    d.line([(93, 16), (97, 21)], fill=WIN_CYAN, width=1)
    d.line([(94, 17), (96, 19)], fill=WIN_REFLECT, width=1)
    # Windshield wiper
    d.line([(93, 24), (96, 21)], fill=CHASSIS)

    # 6. Passenger Windows (x: 10 .. 86, y: 17 .. 28)
    # Passenger Doors (white/grey with glass, typical DB commuter cars)
    door_positions = [6, 44]
    for dx in door_positions:
        d.rectangle([dx, 15, dx + 11, 40], fill=(235, 238, 244, 255), outline=OUTLINE)
        d.rectangle([dx + 2, 17, dx + 9, 27], fill=WIN_GLASS, outline=OUTLINE)
        d.line([dx + 3, 18, dx + 6, 21], fill=WIN_CYAN)
        d.line([dx + 5, 16, dx + 5, 39], fill=CHASSIS) # split double sliding door
        d.point((dx + 8, 31), fill=(245, 180, 20, 255)) # yellow door button

    # Passenger Window bays
    for wx in (19, 31, 57, 69, 81):
        d.rectangle([wx, 17, wx + 10, 27], fill=WIN_GLASS, outline=OUTLINE)
        # Tint reflection
        d.line([(wx + 2, 18), (wx + 7, 23)], fill=WIN_CYAN)
        d.line([(wx + 3, 19), (wx + 6, 22)], fill=WIN_REFLECT)
        # Warm interior ambient passenger lighting bottom edge
        d.line([(wx + 1, 26), (wx + 9, 26)], fill=(245, 210, 130, 150))

    # 7. Lower Chassis Skirt & Shading (y: 39 .. 42)
    d.rectangle([4, 38, 96, 40], fill=DB_RED_DARK)
    d.line([(4, 40), (96, 40)], fill=DB_RED_DEEP)
    d.rectangle([5, 41, 95, 42], fill=CHASSIS)

    # 8. Triple Spitzensignal LED Headlights
    # Lower headlights on front
    d.rectangle([98, 37, 101, 39], fill=(255, 255, 255, 255), outline=OUTLINE)
    d.point((99, 38), fill=(255, 240, 150, 255))
    # Upper headlight above cab
    d.rectangle([94, 13, 96, 15], fill=(255, 255, 255, 255), outline=OUTLINE)
    d.point((95, 14), fill=(255, 240, 150, 255))

    # 9. Wheel Bogies (4 pairs of steel wheels at bottom)
    for bx in (16, 26, 68, 78):
        # Wheel rim
        d.ellipse([bx - 4, 40, bx + 4, 45], fill=CHASSIS, outline=OUTLINE)
        d.ellipse([bx - 3, 41, bx + 3, 44], fill=WHEEL_METAL)
        d.point((bx, 42), fill=WHEEL_INNER)

    # Save to public/assets/traps/tram.png
    out_path = os.path.join("public", "assets", "traps", "tram.png")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    im.save(out_path)
    print(f"Successfully created authentic German DB train sprite ({W}x{H}) at {out_path}!")

if __name__ == "__main__":
    generate_german_sbahn_train()
