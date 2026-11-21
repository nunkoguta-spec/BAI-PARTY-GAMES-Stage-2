import os
from PIL import Image, ImageDraw

def generate_ice_train():
    W, H = 384, 44
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    # Palette
    C_OUTLINE = (15, 23, 42, 255)
    C_BODY_LIGHT = (250, 250, 250, 255)
    C_BODY_MAIN = (241, 245, 249, 255)
    C_BODY_SHADOW = (203, 213, 225, 255)
    C_BODY_DARK = (148, 163, 184, 255)

    C_ROOF = (226, 232, 240, 255)
    C_ROOF_SHADOW = (180, 192, 205, 255)

    C_RED_STRIPE = (225, 29, 72, 255)
    C_RED_DARK = (159, 18, 57, 255)

    C_WINDOW_BG = (15, 23, 42, 255)
    C_WINDOW_GLASS = (30, 41, 59, 255)
    C_WINDOW_CYAN = (56, 189, 248, 230)
    C_WINDOW_WHITE = (255, 255, 255, 200)

    C_SKIRT = (51, 65, 85, 255)
    C_SKIRT_DARK = (30, 41, 59, 255)

    C_WHEEL_OUTLINE = (15, 23, 42, 255)
    C_WHEEL_METAL = (100, 116, 139, 255)
    C_WHEEL_HUB = (148, 163, 184, 255)
    C_WHEEL_INNER = (30, 41, 59, 255)

    # 1. Connectors / Accordion Gangways between cars (x: 122..127 and 246..251)
    for gx in [122, 246]:
        draw.rectangle([gx, 12, gx + 5, 34], fill=C_OUTLINE)
        for gy in range(13, 34, 2):
            draw.line([gx + 1, gy, gx + 4, gy], fill=(71, 85, 105, 255))

    # Helper for a coach body (car 1 and car 2)
    def draw_coach(x1, x2, is_tail=False):
        # Roof curve
        draw.rectangle([x1 + 1, 8, x2 - 1, 12], fill=C_ROOF)
        draw.line([x1 + 2, 7, x2 - 2, 7], fill=C_ROOF)
        draw.line([x1 + 3, 6, x2 - 3, 6], fill=C_ROOF_SHADOW)
        # AC units on roof
        for acx in [x1 + 18, x1 + 65]:
            draw.rectangle([acx, 4, acx + 28, 6], fill=(148, 163, 184, 255), outline=C_OUTLINE)
            draw.line([acx + 4, 5, acx + 24, 5], fill=(203, 213, 225, 255))

        # Main body
        draw.rectangle([x1, 12, x2, 28], fill=C_BODY_MAIN)
        draw.rectangle([x1, 12, x2, 14], fill=C_BODY_LIGHT)
        draw.rectangle([x1, 27, x2, 29], fill=C_BODY_SHADOW)

        # Red DB Express stripe
        draw.rectangle([x1, 30, x2, 33], fill=C_RED_STRIPE)
        draw.line([x1, 34, x2, 34], fill=C_RED_DARK)

        # Lower skirt
        draw.rectangle([x1, 35, x2, 37], fill=C_SKIRT)
        # Equipment pods
        draw.rectangle([x1 + 38, 38, x1 + 82, 40], fill=C_SKIRT_DARK, outline=C_OUTLINE)

        # Windows
        win_count = 5
        win_w = 12
        win_gap = 6
        start_wx = x1 + 12
        for w_idx in range(win_count):
            wx = start_wx + w_idx * (win_w + win_gap)
            draw.rectangle([wx, 16, wx + win_w, 24], fill=C_WINDOW_BG, outline=C_OUTLINE)
            draw.rectangle([wx + 1, 17, wx + win_w - 1, 23], fill=C_WINDOW_GLASS)
            draw.line([wx + 2, 18, wx + win_w - 2, 18], fill=C_WINDOW_CYAN)
            draw.point((wx + 3, 19), fill=C_WINDOW_WHITE)
            draw.point((wx + 4, 19), fill=C_WINDOW_WHITE)

        # Doors
        for dx in [x1 + 2, x2 - 8]:
            draw.rectangle([dx, 15, dx + 6, 34], fill=(226, 232, 240, 255), outline=C_OUTLINE)
            draw.rectangle([dx + 1, 17, dx + 5, 23], fill=C_WINDOW_BG)
            draw.line([dx + 2, 18, dx + 4, 18], fill=C_WINDOW_CYAN)
            # handle
            draw.point((dx + 1, 26), fill=C_OUTLINE)

        # Tail end taper if tail
        if is_tail:
            draw.line([x1, 8, x1, 36], fill=C_OUTLINE)
            draw.line([x1 + 1, 6, x1 + 1, 37], fill=C_BODY_SHADOW)

    # 2. Draw Car 1 (Rear Coach): x: 6..121
    draw_coach(6, 121, is_tail=True)

    # 3. Draw Car 2 (Center Coach): x: 128..245
    draw_coach(128, 245, is_tail=False)

    # 4. Draw Car 3 (Front Locomotive with aerodynamic bullet nose): x: 252..380
    lx1 = 252
    lx2 = 380

    # Locomotive roof
    draw.rectangle([lx1 + 1, 8, 345, 12], fill=C_ROOF)
    draw.line([lx1 + 2, 7, 340, 7], fill=C_ROOF)
    draw.line([lx1 + 3, 6, 335, 6], fill=C_ROOF_SHADOW)

    # Pantograph (modern single-arm diamond pantograph on locomotive roof)
    px = lx1 + 24
    draw.line([px, 6, px + 8, 2], fill=(148, 163, 184, 255), width=1)
    draw.line([px + 8, 2, px + 18, 0], fill=(226, 232, 240, 255), width=1)
    draw.line([px + 12, 0, px + 24, 0], fill=(248, 250, 252, 255), width=2) # carbon contact shoe

    # Aerodynamic nose profile (sloped nose from x=340 to x=378)
    # Roof curve sloping down to nose
    nose_points_top = [
        (335, 6), (345, 8), (356, 11), (366, 15), (374, 21), (378, 27), (379, 32), (376, 36), (368, 37)
    ]
    # Fill locomotive body
    draw.rectangle([lx1, 12, 345, 28], fill=C_BODY_MAIN)
    draw.rectangle([lx1, 12, 345, 14], fill=C_BODY_LIGHT)
    draw.rectangle([lx1, 27, 345, 29], fill=C_BODY_SHADOW)

    # Polygonal nose body
    nose_poly = [
        (345, 8), (356, 11), (366, 15), (374, 21), (378, 27), (379, 32), (376, 36), (345, 36), (345, 8)
    ]
    draw.polygon(nose_poly, fill=C_BODY_MAIN)
    # Nose highlight & shadow
    draw.polygon([(345, 8), (356, 11), (366, 15), (374, 21), (368, 21), (345, 14)], fill=C_BODY_LIGHT)
    draw.polygon([(345, 27), (376, 27), (379, 32), (376, 36), (345, 36)], fill=C_BODY_SHADOW)

    # Slanted Aerodynamic Cockpit Windshield (Kaca kabin masinis miring)
    cockpit_poly = [
        (350, 13), (363, 17), (370, 23), (362, 23), (348, 17)
    ]
    draw.polygon(cockpit_poly, fill=C_WINDOW_BG, outline=C_OUTLINE)
    draw.polygon([(351, 14), (362, 18), (368, 22), (362, 22), (349, 17)], fill=C_WINDOW_GLASS)
    draw.line([(352, 15), (364, 19)], fill=C_WINDOW_CYAN, width=1)
    draw.line([(354, 16), (360, 18)], fill=C_WINDOW_WHITE, width=1)

    # Red stripe extending along locomotive and wrapping sleekly around the nose
    draw.rectangle([lx1, 30, 350, 33], fill=C_RED_STRIPE)
    draw.line([lx1, 34, 350, 34], fill=C_RED_DARK)
    stripe_nose = [(350, 30), (368, 30), (376, 32), (374, 34), (350, 34)]
    draw.polygon(stripe_nose, fill=C_RED_STRIPE)

    # Lower front air dam / plow (Coupler nose cone)
    draw.polygon([(368, 36), (376, 36), (378, 37), (362, 37)], fill=C_SKIRT_DARK)

    # Windows on locomotive passenger section
    for w_idx in range(3):
        wx = lx1 + 16 + w_idx * 18
        draw.rectangle([wx, 16, wx + 12, 24], fill=C_WINDOW_BG, outline=C_OUTLINE)
        draw.rectangle([wx + 1, 17, wx + 11, 23], fill=C_WINDOW_GLASS)
        draw.line([wx + 2, 18, wx + 10, 18], fill=C_WINDOW_CYAN)
        draw.point((wx + 3, 19), fill=C_WINDOW_WHITE)

    # Locomotive side door
    draw.rectangle([lx1 + 2, 15, lx1 + 8, 34], fill=(226, 232, 240, 255), outline=C_OUTLINE)
    draw.rectangle([lx1 + 3, 17, lx1 + 7, 23], fill=C_WINDOW_BG)
    draw.line([lx1 + 4, 18, lx1 + 6, 18], fill=C_WINDOW_CYAN)

    # High-intensity LED locomotive headlights at the front of the nose
    draw.rectangle([374, 31, 377, 33], fill=(255, 255, 255, 255), outline=(247, 200, 59, 255))
    draw.point((375, 32), fill=(255, 255, 220, 255))

    # Locomotive skirt
    draw.rectangle([lx1, 35, 365, 37], fill=C_SKIRT)
    draw.rectangle([lx1 + 36, 38, lx1 + 76, 40], fill=C_SKIRT_DARK, outline=C_OUTLINE)

    # 5. Clean individual wheel bogies (2 pairs per car)
    # Notice: RODA SEJATI (Bogie) dengan celah kosong transparan di antara bogie!
    # TIDAK ADA GAMBAR BATANG REL DI BAWAHNYA!
    def draw_bogie(cx):
        # Bogie frame mount
        draw.rectangle([cx - 10, 38, cx + 10, 39], fill=C_OUTLINE)
        draw.rectangle([cx - 8, 39, cx + 8, 41], fill=(51, 65, 85, 255))
        # Two steel wheels: left wheel and right wheel
        for wx in [cx - 6, cx + 6]:
            # Wheel radius 3 (diameter 7 px, y: 37..43)
            # Outermost wheel edge touches y = 43!
            draw.ellipse([wx - 3, 37, wx + 3, 43], fill=C_WHEEL_METAL, outline=C_WHEEL_OUTLINE)
            # Wheel dark inner rim
            draw.ellipse([wx - 2, 38, wx + 2, 42], fill=C_WHEEL_INNER)
            # Center shiny steel axle hub
            draw.point((wx, 40), fill=C_WHEEL_HUB)

    # Bogie positions for each car
    bogie_centers = [
        22, 105,   # Car 1 bogies
        144, 229,  # Car 2 bogies
        268, 346   # Locomotive bogies
    ]
    for bc in bogie_centers:
        draw_bogie(bc)

    # Outer outline crisping
    # Black outline on top of the whole train
    draw.line([6, 7, 340, 7], fill=C_OUTLINE)
    draw.line([340, 7, 355, 10], fill=C_OUTLINE)
    draw.line([355, 10, 365, 14], fill=C_OUTLINE)
    draw.line([365, 14, 374, 21], fill=C_OUTLINE)
    draw.line([374, 21, 378, 27], fill=C_OUTLINE)
    draw.line([378, 27, 380, 32], fill=C_OUTLINE)
    draw.line([380, 32, 377, 36], fill=C_OUTLINE)
    draw.line([377, 36, 366, 37], fill=C_OUTLINE)

    # Save to public destinations
    os.makedirs("public/assets/pack", exist_ok=True)
    os.makedirs("public/assets/bahnhof/sprites", exist_ok=True)

    im.save("public/assets/pack/train.png")
    im.save("public/assets/bahnhof/sprites/train.png")
    im.save("public/assets/bahnhof/sprites/train-long.png")
    im.save("public/assets/bahnhof/sprites/train-clean.png")

    print(f"Generated clean train sprite: {W}x{H} with no attached rail lines!")

if __name__ == "__main__":
    generate_ice_train()
