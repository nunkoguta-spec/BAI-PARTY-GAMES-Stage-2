import os
from PIL import Image, ImageDraw

def generate_db_ice_train():
    # Width: 520px (spanning across viewport), Height: 58px (proud, realistic DB ICE proportions)
    W, H = 520, 58
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # === Authentic DB (Deutsche Bahn) ICE Palette ===
    WHITE_TOP = (252, 253, 255, 255)
    BODY_WHITE = (244, 246, 250, 255)
    BODY_LIGHT = (235, 239, 245, 255)
    BODY_SHADOW = (200, 208, 222, 255)
    ROOF_GREY = (215, 222, 232, 255)
    ROOF_DARK = (150, 162, 178, 255)

    # Official DB Traffic Red (Verkehrsrot RAL 3020)
    DB_RED = (235, 18, 40, 255)
    DB_RED_DARK = (168, 12, 28, 255)
    DB_RED_LIGHT = (255, 60, 80, 255)

    # Dark chassis / outline
    OUTLINE = (14, 20, 32, 255)
    SKIRT_DARK = (28, 36, 50, 255)
    SKIRT_MID = (46, 56, 74, 255)

    # Windows (Privacy tinted double-glazed glass with interior warmth & sky reflection)
    WIN_FRAME = (12, 18, 30, 255)
    WIN_GLASS = (20, 32, 52, 255)
    WIN_REFLECT = (50, 185, 255, 220)
    WIN_HIGHLIGHT = (255, 255, 255, 180)
    WIN_INTERIOR = (245, 200, 120, 70)  # subtle warm carriage lighting

    # Wheels & Bogies (Separate from rails!)
    WHEEL_METAL = (118, 132, 150, 255)
    WHEEL_RIM = (185, 198, 215, 255)
    WHEEL_INNER = (24, 32, 46, 255)
    GANGWAY_RUBBER = (50, 60, 75, 255)

    # 1. Gangways (Between Car 1-2 and Car 2-3)
    for gx in [165, 340]:
        d.rectangle([gx, 14, gx + 9, 44], fill=OUTLINE)
        for gy in range(15, 44, 3):
            d.line([gx + 1, gy, gx + 8, gy], fill=GANGWAY_RUBBER)
        for gx_line in [gx + 3, gx + 6]:
            d.line([gx_line, 15, gx_line, 43], fill=(30, 38, 48, 255))

    # Helper: draw passenger windows
    def draw_window_bay(x1, x2, wy):
        cur_x = x1 + 12
        while cur_x + 16 <= x2 - 12:
            # Frame
            d.rectangle([cur_x, wy, cur_x + 16, wy + 12], fill=WIN_FRAME, outline=OUTLINE)
            # Glass
            d.rectangle([cur_x + 1, wy + 1, cur_x + 15, wy + 11], fill=WIN_GLASS)
            # Warm interior lamp glow
            d.rectangle([cur_x + 3, wy + 7, cur_x + 13, wy + 10], fill=WIN_INTERIOR)
            # Diagonal/top glossy reflection
            d.line([cur_x + 2, wy + 2, cur_x + 14, wy + 2], fill=WIN_REFLECT)
            d.line([cur_x + 3, wy + 3, cur_x + 7, wy + 3], fill=WIN_HIGHLIGHT)
            cur_x += 22

    # Helper: draw passenger doors
    def draw_door(dx, wy):
        d.rectangle([dx, wy, dx + 10, wy + 26], fill=BODY_LIGHT, outline=OUTLINE)
        # Door oval window
        d.rectangle([dx + 2, wy + 3, dx + 8, wy + 13], fill=WIN_FRAME)
        d.rectangle([dx + 3, wy + 4, dx + 7, wy + 12], fill=WIN_GLASS)
        d.line([dx + 3, wy + 4, dx + 6, wy + 4], fill=WIN_REFLECT)
        # Chrome door handle
        d.rectangle([dx + 2, wy + 16, dx + 8, wy + 17], fill=OUTLINE)
        d.line([dx + 3, wy + 16, dx + 7, wy + 16], fill=(220, 225, 235, 255))
        # Retractable yellow floor step indicator
        d.rectangle([dx + 1, wy + 25, dx + 9, wy + 26], fill=(245, 180, 40, 255))

    # Helper: draw coach body (Car 1 & Car 2)
    def draw_coach(x1, x2, is_rear=False):
        # Aerodynamic curved roof
        d.rectangle([x1 + 2, 7, x2 - 2, 13], fill=ROOF_GREY)
        d.line([x1 + 4, 6, x2 - 4, 6], fill=WHITE_TOP)
        d.line([x1 + 6, 5, x2 - 6, 5], fill=ROOF_GREY)

        # Rooftop climate control modules (Klimaanlage)
        for ax in [x1 + 18, x1 + 80]:
            d.rectangle([ax, 3, ax + 34, 5], fill=ROOF_DARK, outline=OUTLINE)
            d.line([ax + 3, 4, ax + 31, 4], fill=(220, 228, 238, 255))

        # Main Coach Body
        d.rectangle([x1, 14, x2, 34], fill=BODY_WHITE)
        d.rectangle([x1, 14, x2, 17], fill=BODY_LIGHT)
        d.rectangle([x1, 32, x2, 34], fill=BODY_SHADOW)

        # The iconic Deutsche Bahn Red Stripe (RAL 3020)
        d.rectangle([x1, 35, x2, 40], fill=DB_RED)
        d.line([x1, 35, x2, 35], fill=DB_RED_LIGHT)
        d.line([x1, 40, x2, 40], fill=DB_RED_DARK)

        # Dark lower undercarriage skirt
        d.rectangle([x1, 41, x2, 46], fill=SKIRT_MID)
        # Equipment pods under skirt
        d.rectangle([x1 + 35, 47, x1 + 95, 48], fill=SKIRT_DARK, outline=OUTLINE)

        # Windows
        draw_window_bay(x1, x2, 18)

        # Doors on both ends of coach
        draw_door(x1 + 4, 15)
        draw_door(x2 - 14, 15)

        # Rear nose rounding if rear car
        if is_rear:
            d.line([x1, 7, x1, 46], fill=OUTLINE)
            d.line([x1 + 1, 6, x1 + 1, 45], fill=BODY_SHADOW)
            # Red tail markers (Rückleuchten)
            d.rectangle([x1 + 2, 36, x1 + 4, 38], fill=(255, 30, 30, 255), outline=OUTLINE)

    # 2. Draw Car 1 (Rear Coach): x: 8..164
    draw_coach(8, 164, is_rear=True)

    # 3. Draw Car 2 (Center Coach / Bordbistro): x: 175..339
    draw_coach(175, 339, is_rear=False)
    # Put Bordbistro branding in the middle of Car 2
    d.rectangle([240, 15, 274, 17], fill=DB_RED)
    # Tiny "Bordbistro" marker text dots
    for dot_x in range(243, 272, 3):
        d.point((dot_x, 16), fill=(255, 255, 255, 255))

    # 4. Draw Car 3 (Front Locomotive / ICE Triebkopf): x: 350..512
    lx1 = 350
    lx2 = 512

    # Roof with equipment dome
    d.rectangle([lx1 + 2, 7, 440, 13], fill=ROOF_GREY)
    d.line([lx1 + 4, 6, 436, 6], fill=WHITE_TOP)
    d.line([lx1 + 6, 5, 432, 5], fill=ROOF_GREY)

    # Modern DB High-Speed Pantograph (Stromabnehmer)
    px = lx1 + 28
    d.line([px, 5, px + 12, 1], fill=ROOF_DARK, width=2)
    d.line([px + 12, 1, px + 24, 0], fill=(225, 230, 240, 255), width=2)
    # Carbon contact slipper
    d.line([px + 16, 0, px + 36, 0], fill=(250, 252, 255, 255), width=2)

    # Klimaanlage module on loco
    d.rectangle([lx1 + 54, 3, lx1 + 92, 5], fill=ROOF_DARK, outline=OUTLINE)

    # Locomotive Passenger section
    d.rectangle([lx1, 14, 440, 34], fill=BODY_WHITE)
    d.rectangle([lx1, 14, 440, 17], fill=BODY_LIGHT)
    d.rectangle([lx1, 32, 440, 34], fill=BODY_SHADOW)

    # Sleek German DB Aerodynamic Nose Cone (x: 440 -> 512)
    # The nose smoothly sweeps down from roof height to the front coupler tip
    nose_top = [
        (432, 5), (440, 7), (452, 10), (466, 14), (480, 20),
        (494, 27), (506, 35), (510, 40), (507, 44), (440, 44), (440, 5)
    ]
    d.polygon(nose_top, fill=BODY_WHITE)

    # Highlight curve along the upper nose ridge
    d.polygon([
        (432, 5), (440, 7), (452, 10), (466, 14), (480, 20),
        (468, 20), (454, 14), (440, 9), (432, 5)
    ], fill=WHITE_TOP)

    # Shadow along lower nose
    d.polygon([
        (440, 34), (496, 34), (506, 35), (510, 40), (507, 44), (440, 44)
    ], fill=BODY_SHADOW)

    # Aerodynamic Driver's Cab Panoramic Windshield (Führerstand Kanzel)
    cockpit = [
        (448, 14), (468, 18), (488, 25), (476, 26), (444, 20)
    ]
    d.polygon(cockpit, fill=WIN_FRAME, outline=OUTLINE)
    d.polygon([
        (449, 15), (467, 19), (484, 25), (475, 25), (446, 20)
    ], fill=WIN_GLASS)
    # Bright aerodynamic reflection streak
    d.line([(450, 16), (472, 21)], fill=WIN_REFLECT, width=1)
    d.line([(453, 17), (464, 20)], fill=WIN_HIGHLIGHT, width=1)

    # The Red DB Stripe wrapping around the locomotive nose
    d.rectangle([lx1, 35, 452, 40], fill=DB_RED)
    d.line([lx1, 35, 452, 35], fill=DB_RED_LIGHT)
    d.line([lx1, 40, 452, 40], fill=DB_RED_DARK)
    # Follow nose contour
    d.polygon([
        (452, 35), (494, 35), (505, 38), (502, 41), (452, 41)
    ], fill=DB_RED)
    d.line([(452, 35), (494, 35), (505, 38)], fill=DB_RED_LIGHT)

    # OFFICIAL DB LOGO on Locomotive Side (Red rectangle with white "DB")
    db_logo_x = lx1 + 18
    db_logo_y = 23
    d.rectangle([db_logo_x, db_logo_y, db_logo_x + 12, db_logo_y + 8], fill=DB_RED, outline=OUTLINE)
    # White "D"
    d.line([db_logo_x + 2, db_logo_y + 2, db_logo_x + 2, db_logo_y + 6], fill=(255, 255, 255, 255))
    d.line([db_logo_x + 2, db_logo_y + 2, db_logo_x + 4, db_logo_y + 2], fill=(255, 255, 255, 255))
    d.line([db_logo_x + 2, db_logo_y + 6, db_logo_x + 4, db_logo_y + 6], fill=(255, 255, 255, 255))
    d.line([db_logo_x + 5, db_logo_y + 3, db_logo_x + 5, db_logo_y + 5], fill=(255, 255, 255, 255))
    # White "B"
    d.line([db_logo_x + 7, db_logo_y + 2, db_logo_x + 7, db_logo_y + 6], fill=(255, 255, 255, 255))
    d.line([db_logo_x + 7, db_logo_y + 2, db_logo_x + 10, db_logo_y + 2], fill=(255, 255, 255, 255))
    d.line([db_logo_x + 7, db_logo_y + 4, db_logo_x + 9, db_logo_y + 4], fill=(255, 255, 255, 255))
    d.line([db_logo_x + 7, db_logo_y + 6, db_logo_x + 10, db_logo_y + 6], fill=(255, 255, 255, 255))
    d.point((db_logo_x + 10, db_logo_y + 3), fill=(255, 255, 255, 255))
    d.point((db_logo_x + 10, db_logo_y + 5), fill=(255, 255, 255, 255))

    # Lower Front Snowplow / Air Dam
    d.polygon([
        (488, 44), (507, 44), (505, 47), (476, 47)
    ], fill=SKIRT_DARK)

    # High-Power Triple LED Headlights (Spitzensignal)
    # Two lower headlights
    d.rectangle([501, 39, 505, 42], fill=(255, 255, 255, 255), outline=(250, 204, 21, 255))
    d.point((502, 40), fill=(255, 255, 200, 255))
    d.point((503, 40), fill=(255, 255, 200, 255))
    # One upper center headlight
    d.rectangle([474, 24, 477, 26], fill=(255, 255, 255, 255), outline=OUTLINE)
    d.point((475, 25), fill=(255, 255, 200, 255))

    # Locomotive Skirt
    d.rectangle([lx1, 41, 475, 46], fill=SKIRT_MID)
    d.rectangle([lx1 + 40, 47, lx1 + 86, 48], fill=SKIRT_DARK, outline=OUTLINE)

    # Windows & Door on Locomotive
    draw_window_bay(lx1 + 32, 436, 18)
    draw_door(lx1 + 4, 15)

    # 5. HIGH-FIDELITY BOGIES (2 pairs per coach, 6 total)
    # The bottom of each wheel lands cleanly at y = 56!
    # No horizontal rail bar drawn! The space between wheels is 100% transparent.
    def draw_detailed_bogie(cx):
        b_top = 44
        # Heavy steel suspension bolster & axle frame
        d.rectangle([cx - 15, b_top, cx + 15, b_top + 3], fill=OUTLINE)
        d.rectangle([cx - 13, b_top + 2, cx + 13, b_top + 4], fill=SKIRT_DARK)
        # Primary shock absorber springs
        d.rectangle([cx - 9, b_top + 3, cx - 6, b_top + 6], fill=(70, 80, 95, 255))
        d.rectangle([cx + 6, b_top + 3, cx + 9, b_top + 6], fill=(70, 80, 95, 255))

        # Two steel wheels per bogie (left wheel & right wheel)
        for wx in [cx - 8, cx + 8]:
            # Outer steel tire (Diameter 11px: y=46..56)
            d.ellipse([wx - 5, 46, wx + 5, 56], fill=WHEEL_METAL, outline=OUTLINE)
            # Polished shiny metal tread rim
            d.arc([wx - 5, 46, wx + 5, 56], start=0, end=360, fill=WHEEL_RIM)
            # Dark recessed wheel disc
            d.ellipse([wx - 3, 48, wx + 3, 54], fill=WHEEL_INNER)
            # Roller-bearing axle hub cap
            d.ellipse([wx - 1, 50, wx + 1, 52], fill=(225, 235, 245, 255))

    # Bogie center positions across the 3 carriages
    bogie_centers = [
        30, 142,   # Car 1 bogies
        198, 316,  # Car 2 bogies
        374, 468   # Car 3 bogies
    ]
    for bc in bogie_centers:
        draw_detailed_bogie(bc)

    # 6. Crisp upper outlines for maximum clarity against bright skies
    d.line([8, 6, 164, 6], fill=OUTLINE)
    d.line([175, 6, 339, 6], fill=OUTLINE)
    d.line([350, 6, 432, 6], fill=OUTLINE)
    d.line([432, 6, 452, 10], fill=OUTLINE)
    d.line([452, 10, 466, 14], fill=OUTLINE)
    d.line([466, 14, 480, 20], fill=OUTLINE)
    d.line([480, 20, 494, 27], fill=OUTLINE)
    d.line([494, 27, 506, 35], fill=OUTLINE)
    d.line([506, 35, 510, 40], fill=OUTLINE)
    d.line([510, 40, 507, 44], fill=OUTLINE)

    # Save to all relevant public sprite paths
    paths = [
        "public/assets/pack/train.png",
        "public/assets/bahnhof/sprites/train.png",
        "public/assets/bahnhof/sprites/train-long.png",
        "public/assets/bahnhof/sprites/train-clean.png"
    ]
    for p in paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        im.save(p)

    print(f"Successfully generated German DB ICE train: {W}x{H} px!")

if __name__ == "__main__":
    generate_db_ice_train()
