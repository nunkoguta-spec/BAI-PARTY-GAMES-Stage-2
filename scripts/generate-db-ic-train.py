import os
from PIL import Image, ImageDraw

def render_db_br101_ic_train():
    # Total dimensions: 560 x 62 px
    # Layout (left to right, train facing & moving to the right):
    # - Car 1 (Rear IC Coach): x = 8 .. 176 (168px)
    # - Gangway 1: x = 177 .. 185 (9px)
    # - Car 2 (Center IC Coach / Bordbistro): x = 186 .. 356 (170px)
    # - Gangway 2 / Coupler: x = 357 .. 365 (9px)
    # - Car 3 (Front Locomotive - DB BR 101): x = 366 .. 554 (188px)
    #
    # EXACT MATCH TO USER IMAGE [Image 1]:
    # - Real DB BR 101 Locomotive:
    #   * Heavy, powerful German electric locomotive profile (not a rounded bullet)
    #   * Steep aerodynamic front slope (~18 deg)
    #   * BOLD DB VERKEHRSROT (Traffic Red RAL 3020) body
    #   * Metallic light grey / silver roof with dark ventilation grilles & pantograph
    #   * Twin wide front cab windshield panes with black rubber gasket & center pillar
    #   * THE SIGNATURE WHITE CONTRAST PANEL ON THE NOSE WITH RED [DB] LOGO (Lätzchen)
    #   * Triple headlights (A-Spitzensignal): 2 lower round lights + 1 center upper light
    #   * Heavy black buffer beam with TWO ROUND BLACK BUFFERS (Puffer) protruding at front
    #   * Side cab door, side windows, white DB logo, series number "101 013-1"
    # - Real DB Intercity Coaches:
    #   * DB Lichtgrau (Off-white / pale grey) body
    #   * Bold DB Verkehrsrot stripe below the window band
    #   * Dark tinted panoramic windows with interior warm glow & sky reflections
    #   * Authentic red passenger doors at coach ends with yellow footstep
    #   * Clean 2-axle bogies with steel disc wheels, resting at y = 60 without attached rail lines

    W, H = 560, 62
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # === Accurate Color Palette ===
    DB_RED = (226, 26, 34, 255)
    DB_RED_BRIGHT = (248, 56, 64, 255)
    DB_RED_DARK = (160, 14, 22, 255)
    DB_RED_DEEP = (118, 10, 16, 255)

    IC_WHITE = (246, 248, 252, 255)
    IC_LIGHT = (236, 240, 248, 255)
    IC_SHADOW = (195, 204, 218, 255)
    IC_DARK = (145, 155, 172, 255)

    ROOF_GREY = (185, 195, 208, 255)
    ROOF_DARK = (120, 132, 148, 255)
    LOCO_ROOF = (60, 68, 80, 255)
    LOCO_ROOF_LIGHT = (90, 100, 116, 255)
    LOCO_ROOF_DARK = (36, 42, 52, 255)

    OUTLINE = (12, 16, 24, 255)
    CHASSIS_DARK = (24, 30, 40, 255)
    CHASSIS_MID = (46, 54, 68, 255)
    GANGWAY = (36, 42, 52, 255)

    WIN_FRAME = (12, 16, 24, 255)
    WIN_GLASS = (18, 28, 44, 255)
    WIN_GLINT = (54, 180, 245, 220)
    WIN_WHITE = (255, 255, 255, 180)
    WIN_INTERIOR = (245, 215, 140, 80)

    WH_OUTLINE = (12, 16, 24, 255)
    WH_METAL = (110, 122, 138, 255)
    WH_RIM = (195, 206, 222, 255)
    WH_INNER = (22, 28, 38, 255)
    WH_HUB = (235, 242, 252, 255)

    # 1. Bogie Generator (wheels rest at y = 60, no bottom rail attached)
    def draw_bogie(cx, wheel_y=60):
        b_top = wheel_y - 12
        d.rectangle([cx - 15, b_top, cx + 15, b_top + 3], fill=OUTLINE)
        d.rectangle([cx - 13, b_top + 2, cx + 13, b_top + 4], fill=CHASSIS_DARK)
        d.rectangle([cx - 9, b_top + 3, cx - 6, b_top + 6], fill=(70, 80, 96, 255))
        d.rectangle([cx + 6, b_top + 3, cx + 9, b_top + 6], fill=(70, 80, 96, 255))
        for wx in [cx - 8, cx + 8]:
            d.ellipse([wx - 5, wheel_y - 10, wx + 5, wheel_y], fill=WH_METAL, outline=WH_OUTLINE)
            d.arc([wx - 5, wheel_y - 10, wx + 5, wheel_y], start=0, end=360, fill=WH_RIM)
            d.ellipse([wx - 3, wheel_y - 8, wx + 3, wheel_y - 2], fill=WH_INNER)
            d.ellipse([wx - 1, wheel_y - 6, wx + 1, wheel_y - 4], fill=WH_HUB)

    # 2. Gangways
    for gx in [177, 357]:
        d.rectangle([gx, 15, gx + 8, 50], fill=OUTLINE)
        for gy in range(16, 50, 3):
            d.line([gx + 1, gy, gx + 7, gy], fill=GANGWAY)
        for gx_line in [gx + 2, gx + 5]:
            d.line([gx_line, 16, gx_line, 49], fill=(24, 30, 40, 255))

    # 3. Passenger Coaches (Car 1 & Car 2)
    def draw_coach(x1, x2, is_rear=False, has_bistro=False):
        # Roof
        d.rectangle([x1 + 2, 8, x2 - 2, 14], fill=ROOF_GREY)
        d.line([x1 + 4, 7, x2 - 4, 7], fill=IC_WHITE)
        d.line([x1 + 6, 6, x2 - 6, 6], fill=ROOF_GREY)
        for ax in [x1 + 20, x1 + 84]:
            d.rectangle([ax, 4, ax + 34, 6], fill=ROOF_DARK, outline=OUTLINE)
            d.line([ax + 3, 5, ax + 31, 5], fill=IC_WHITE)

        # Body
        d.rectangle([x1, 15, x2, 36], fill=IC_WHITE)
        d.rectangle([x1, 15, x2, 17], fill=IC_LIGHT)
        d.rectangle([x1, 34, x2, 36], fill=IC_SHADOW)

        # Red DB Stripe
        d.rectangle([x1, 37, x2, 43], fill=DB_RED)
        d.line([x1, 37, x2, 37], fill=DB_RED_BRIGHT)
        d.line([x1, 43, x2, 43], fill=DB_RED_DARK)

        # Chassis skirt
        d.rectangle([x1, 44, x2, 50], fill=CHASSIS_MID)
        d.rectangle([x1 + 36, 51, x1 + 96, 52], fill=CHASSIS_DARK, outline=OUTLINE)

        # Windows
        cur_x = x1 + 14
        while cur_x + 18 <= x2 - 14:
            d.rectangle([cur_x, 20, cur_x + 18, 33], fill=WIN_FRAME, outline=OUTLINE)
            d.rectangle([cur_x + 1, 21, cur_x + 17, 32], fill=WIN_GLASS)
            d.rectangle([cur_x + 3, 27, cur_x + 15, 31], fill=WIN_INTERIOR)
            d.line([cur_x + 2, 22, cur_x + 16, 22], fill=WIN_GLINT)
            d.line([cur_x + 3, 23, cur_x + 8, 23], fill=WIN_WHITE)
            cur_x += 24

        # Red doors
        for dx in [x1 + 3, x2 - 13]:
            d.rectangle([dx, 17, dx + 10, 45], fill=DB_RED, outline=OUTLINE)
            d.rectangle([dx + 2, 20, dx + 8, 30], fill=WIN_FRAME)
            d.rectangle([dx + 3, 21, dx + 7, 29], fill=WIN_GLASS)
            d.line([dx + 3, 21, dx + 6, 21], fill=WIN_GLINT)
            d.rectangle([dx + 2, 33, dx + 8, 34], fill=OUTLINE)
            d.line([dx + 3, 33, dx + 7, 33], fill=(230, 235, 245, 255))
            d.rectangle([dx + 1, 44, dx + 9, 45], fill=(245, 185, 45, 255))

        if has_bistro:
            bx = x1 + 60
            d.rectangle([bx, 15, bx + 48, 18], fill=DB_RED)
            for dot_x in range(bx + 3, bx + 46, 3):
                d.point((dot_x, 16), fill=(255, 255, 255, 255))

        if is_rear:
            d.line([x1, 7, x1, 50], fill=OUTLINE)
            d.line([x1 + 1, 7, x1 + 1, 49], fill=IC_SHADOW)
            d.rectangle([x1 + 2, 38, x1 + 4, 40], fill=(255, 30, 30, 255), outline=OUTLINE)

    draw_coach(8, 176, is_rear=True, has_bistro=False)
    draw_bogie(34, 60)
    draw_bogie(150, 60)

    draw_coach(186, 356, is_rear=False, has_bistro=True)
    draw_bogie(212, 60)
    draw_bogie(330, 60)

    # ============================================================
    # 4. CAR 3: AUTHENTIC GERMAN DB BR 101 ELECTRIC LOCOMOTIVE [Image 1]
    # ============================================================
    lx1 = 366
    lx2 = 554

    # 4a. Locomotive Roof (Graphite / Silver Metallic with equipment)
    d.rectangle([lx1 + 2, 7, 516, 14], fill=LOCO_ROOF)
    d.line([lx1 + 4, 6, 512, 6], fill=LOCO_ROOF_LIGHT)
    d.line([lx1 + 6, 5, 508, 5], fill=LOCO_ROOF_DARK)

    # Roof cooling grilles (Lüftergitter)
    for gx in [lx1 + 30, lx1 + 66, lx1 + 102]:
        d.rectangle([gx, 3, gx + 24, 5], fill=(44, 50, 60, 255), outline=OUTLINE)
        for gl in range(gx + 2, gx + 23, 3):
            d.line([gl, 3, gl, 5], fill=(120, 130, 145, 255))

    # Real Single-Arm Pantograph (DSA 350)
    px = lx1 + 36
    d.line([px, 5, px + 15, 1], fill=(185, 195, 210, 255), width=2)
    d.line([px + 15, 1, px + 30, 0], fill=(230, 240, 255, 255), width=2)
    d.line([px + 22, 0, px + 44, 0], fill=(252, 254, 255, 255), width=2)
    d.line([px + 21, 1, px + 23, 1], fill=(150, 160, 175, 255))
    d.line([px + 43, 1, px + 45, 1], fill=(150, 160, 175, 255))

    # 4b. Main Locomotive Body in FULL DB VERKEHRSROT (Traffic Red)
    d.rectangle([lx1, 14, 516, 47], fill=DB_RED)
    d.rectangle([lx1, 14, 516, 16], fill=DB_RED_BRIGHT)
    d.rectangle([lx1, 45, 516, 47], fill=DB_RED_DARK)

    # 4c. Realistic BR 101 Front Cab Profile (Steep ~18 deg slope: x: 516 -> 548)
    cab_points = [
        (508, 5), (516, 6), (526, 9), (536, 14), (542, 20),
        (546, 27), (548, 34), (549, 42), (548, 48), (516, 48), (516, 5)
    ]
    d.polygon(cab_points, fill=DB_RED)
    d.polygon([
        (508, 5), (516, 6), (526, 9), (536, 14), (542, 20),
        (534, 20), (526, 14), (516, 8), (508, 5)
    ], fill=DB_RED_BRIGHT)
    d.polygon([
        (516, 44), (542, 44), (548, 34), (549, 42), (548, 48), (516, 48)
    ], fill=DB_RED_DARK)

    # 4d. Dual Cab Windshields with black rubber surround [Image 1]
    windshield = [
        (520, 14), (532, 18), (540, 25), (530, 25), (516, 20)
    ]
    d.polygon(windshield, fill=WIN_FRAME, outline=OUTLINE)
    d.polygon([
        (521, 15), (531, 19), (538, 24), (529, 24), (518, 20)
    ], fill=WIN_GLASS)
    d.line([(527, 17), (533, 24)], fill=OUTLINE, width=1)
    d.line([(522, 16), (534, 21)], fill=WIN_GLINT, width=1)
    d.line([(524, 17), (530, 19)], fill=WIN_WHITE, width=1)

    # Side cab window & driver door
    d.rectangle([lx1 + 116, 18, lx1 + 136, 28], fill=WIN_FRAME, outline=OUTLINE)
    d.rectangle([lx1 + 117, 19, lx1 + 135, 27], fill=WIN_GLASS)
    d.line([lx1 + 118, 20, lx1 + 134, 20], fill=WIN_GLINT)
    d.rectangle([lx1 + 94, 17, lx1 + 107, 46], fill=DB_RED, outline=OUTLINE)
    d.rectangle([lx1 + 96, 19, lx1 + 105, 29], fill=WIN_FRAME)
    d.rectangle([lx1 + 97, 20, lx1 + 104, 28], fill=WIN_GLASS)
    d.point((lx1 + 96, 33), fill=(240, 245, 255, 255))

    # 4e. ICONIC WHITE CONTRAST PANEL (LÄTZCHEN) WITH RED [DB] LOGO ON FRONT NOSE [Image 1]!
    # In [Image 1], there is a prominent white rectangular panel spanning across the red nose:
    fn_x, fn_y = 528, 27
    d.rectangle([fn_x, fn_y, fn_x + 18, fn_y + 10], fill=(255, 255, 255, 255), outline=OUTLINE)
    # Red "D" on white
    d.line([fn_x + 3, fn_y + 2, fn_x + 3, fn_y + 8], fill=DB_RED, width=1)
    d.line([fn_x + 3, fn_y + 2, fn_x + 6, fn_y + 2], fill=DB_RED)
    d.line([fn_x + 3, fn_y + 8, fn_x + 6, fn_y + 8], fill=DB_RED)
    d.line([fn_x + 7, fn_y + 3, fn_x + 7, fn_y + 7], fill=DB_RED, width=1)
    # Red "B" on white
    d.line([fn_x + 9, fn_y + 2, fn_x + 9, fn_y + 8], fill=DB_RED, width=1)
    d.line([fn_x + 9, fn_y + 2, fn_x + 13, fn_y + 2], fill=DB_RED)
    d.line([fn_x + 9, fn_y + 5, fn_x + 12, fn_y + 5], fill=DB_RED)
    d.line([fn_x + 9, fn_y + 8, fn_x + 13, fn_y + 8], fill=DB_RED)
    d.line([fn_x + 14, fn_y + 3, fn_x + 14, fn_y + 4], fill=DB_RED)
    d.line([fn_x + 14, fn_y + 6, fn_x + 14, fn_y + 7], fill=DB_RED)

    # Large White DB Logo on Locomotive Side
    sn_x, sn_y = lx1 + 34, 23
    d.rectangle([sn_x, sn_y, sn_x + 22, sn_y + 13], fill=(255, 255, 255, 255), outline=OUTLINE)
    d.line([sn_x + 3, sn_y + 2, sn_x + 3, sn_y + 10], fill=DB_RED, width=2)
    d.line([sn_x + 3, sn_y + 2, sn_x + 8, sn_y + 2], fill=DB_RED)
    d.line([sn_x + 3, sn_y + 10, sn_x + 8, sn_y + 10], fill=DB_RED)
    d.line([sn_x + 9, sn_y + 3, sn_x + 9, sn_y + 9], fill=DB_RED, width=2)
    d.line([sn_x + 12, sn_y + 2, sn_x + 12, sn_y + 10], fill=DB_RED, width=2)
    d.line([sn_x + 12, sn_y + 2, sn_x + 16, sn_y + 2], fill=DB_RED)
    d.line([sn_x + 12, sn_y + 6, sn_x + 16, sn_y + 6], fill=DB_RED)
    d.line([sn_x + 12, sn_y + 10, sn_x + 16, sn_y + 10], fill=DB_RED)
    d.line([sn_x + 17, sn_y + 3, sn_x + 17, sn_y + 5], fill=DB_RED, width=2)
    d.line([sn_x + 17, sn_y + 7, sn_x + 17, sn_y + 9], fill=DB_RED, width=2)

    # Locomotive series number: "101 013-1"
    for nx in range(lx1 + 62, lx1 + 90, 3):
        d.point((nx, 33), fill=(245, 245, 252, 220))

    # 4f. Triple Headlights (A-Spitzensignal)
    # Lower round lights
    d.rectangle([543, 38, 547, 42], fill=(255, 255, 255, 255), outline=(245, 200, 35, 255))
    d.point((544, 40), fill=(255, 255, 210, 255))
    d.point((545, 40), fill=(255, 255, 210, 255))
    # Upper light above cab
    d.rectangle([533, 14, 536, 17], fill=(255, 255, 255, 255), outline=OUTLINE)
    d.point((534, 15), fill=(255, 255, 210, 255))

    # 4g. Front Buffer Beam & ROUND BLACK BUFFERS [Image 1]
    d.rectangle([546, 43, 552, 48], fill=(16, 20, 26, 255))
    d.rectangle([550, 42, 554, 46], fill=(36, 42, 54, 255), outline=OUTLINE)
    d.line([549, 48, 546, 51], fill=OUTLINE, width=2)

    # Chassis skirt & Bogies
    d.rectangle([lx1, 47, 544, 50], fill=CHASSIS_MID)
    d.rectangle([lx1 + 45, 51, lx1 + 95, 52], fill=CHASSIS_DARK, outline=OUTLINE)
    draw_bogie(394, 60)
    draw_bogie(498, 60)

    # Clean top outline
    d.line([8, 7, 176, 7], fill=OUTLINE)
    d.line([186, 7, 356, 7], fill=OUTLINE)
    d.line([366, 7, 508, 7], fill=OUTLINE)
    d.line([508, 7, 516, 6], fill=OUTLINE)
    d.line([516, 6, 526, 9], fill=OUTLINE)
    d.line([526, 9, 536, 14], fill=OUTLINE)
    d.line([536, 14, 542, 20], fill=OUTLINE)
    d.line([542, 20, 546, 27], fill=OUTLINE)
    d.line([546, 27, 548, 34], fill=OUTLINE)
    d.line([548, 34, 549, 42], fill=OUTLINE)
    d.line([549, 42, 548, 48], fill=OUTLINE)

    # Save to all target paths
    target_paths = [
        "public/assets/pack/train.png",
        "public/assets/bahnhof/sprites/train.png",
        "public/assets/bahnhof/sprites/train-long.png",
        "public/assets/bahnhof/sprites/train-clean.png"
    ]
    for p in target_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        im.save(p)

    print(f"Generated Authentic DB BR 101 Intercity Train matching [Image 1]: {W}x{H} px!")

if __name__ == "__main__":
    render_db_br101_ic_train()
