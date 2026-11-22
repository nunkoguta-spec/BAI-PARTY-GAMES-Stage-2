import os
from PIL import Image, ImageDraw

def generate_german_front_train():
    # True Front-Facing German DB Train (Tampak Depan, matching user's Image 1 reference)
    # 64 x 64 px authentic German DB Regional / S-Bahn electric train facing directly at camera
    W, H = 64, 64
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # Palette
    DB_RED = (226, 26, 34, 255)
    DB_RED_BRIGHT = (252, 58, 66, 255)
    DB_RED_DARK = (160, 14, 22, 255)
    DB_RED_DEEP = (108, 8, 14, 255)

    WHITE = (248, 250, 254, 255)
    WHITE_SHADOW = (205, 214, 226, 255)
    ROOF_GREY = (195, 204, 218, 255)
    ROOF_DARK = (125, 135, 150, 255)
    OUTLINE = (18, 14, 24, 255)

    CHASSIS = (28, 32, 42, 255)
    BUFFER_DARK = (18, 20, 26, 255)
    BUFFER_METAL = (65, 72, 85, 255)

    WIN_GLASS = (18, 30, 48, 255)
    WIN_CYAN = (56, 185, 248, 230)
    WIN_REFLECT = (245, 250, 255, 190)

    # 1. Roof Pantograph (x: 20 .. 44, y: 3 .. 12)
    # Collector shoe
    d.line([(22, 4), (42, 4)], fill=CHASSIS, width=2)
    d.line([(20, 3), (22, 5)], fill=CHASSIS, width=1)
    d.line([(44, 3), (42, 5)], fill=CHASSIS, width=1)
    # Diamond diamond pantograph arms
    d.line([(26, 12), (32, 5)], fill=(185, 42, 42, 255), width=1)
    d.line([(38, 12), (32, 5)], fill=(185, 42, 42, 255), width=1)
    d.rectangle([25, 12, 39, 13], fill=ROOF_DARK)

    # 2. Main Curved Roof (y: 11 .. 20)
    roof_poly = [
        (13, 20), (14, 15), (18, 12), (25, 11), (39, 11), (46, 12), (50, 15), (51, 20)
    ]
    d.polygon(roof_poly, fill=ROOF_GREY, outline=OUTLINE)
    d.line([(18, 13), (46, 13)], fill=WHITE)
    d.line([(14, 19), (50, 19)], fill=ROOF_DARK)
    # Upper Center Headlight (Top Spitzensignal)
    d.rectangle([30, 14, 34, 18], fill=WHITE, outline=OUTLINE)
    d.rectangle([31, 15, 33, 17], fill=(255, 255, 220, 255))
    d.point((32, 16), fill=(255, 255, 255, 255))

    # 3. Main Body Box (x: 10 .. 54, y: 20 .. 54)
    body_poly = [
        (11, 20), (53, 20), (54, 24), (54, 52), (52, 55), (12, 55), (10, 52), (10, 24)
    ]
    d.polygon(body_poly, fill=DB_RED, outline=OUTLINE)
    d.line([(11, 21), (53, 21)], fill=DB_RED_BRIGHT)
    d.line([(11, 52), (53, 52)], fill=DB_RED_DARK)

    # 4. Wide Front Cab Windshield (x: 15 .. 49, y: 22 .. 35)
    d.rectangle([15, 22, 49, 35], fill=WIN_GLASS, outline=OUTLINE)
    # Center divider pillar
    d.rectangle([31, 22, 33, 35], fill=OUTLINE)
    # Left pane glass reflection
    d.line([(17, 24), (27, 34)], fill=WIN_CYAN, width=1)
    d.line([(19, 24), (26, 31)], fill=WIN_REFLECT, width=1)
    # Right pane glass reflection
    d.line([(37, 24), (47, 34)], fill=WIN_CYAN, width=1)
    d.line([(39, 24), (46, 31)], fill=WIN_REFLECT, width=1)
    # Windshield wipers
    d.line([(20, 34), (25, 30)], fill=CHASSIS)
    d.line([(40, 34), (45, 30)], fill=CHASSIS)
    # Inside cab: driver dashboard & head silhouette
    d.rectangle([16, 34, 30, 35], fill=(30, 26, 40, 255))
    d.rectangle([34, 34, 48, 35], fill=(30, 26, 40, 255))
    d.ellipse([21, 28, 25, 32], fill=(22, 20, 32, 255)) # driver head

    # 5. White Contrast Front Bib with DB Logo (Signature German "Lätzchen")
    d.rectangle([22, 38, 42, 47], fill=WHITE, outline=OUTLINE)
    d.line([(23, 39), (41, 39)], fill=WHITE)
    d.line([(23, 46), (41, 46)], fill=WHITE_SHADOW)
    # Red [DB] Logo in center
    d.rectangle([27, 40, 37, 45], fill=DB_RED, outline=DB_RED_DEEP)
    # 'D' and 'B' letters in white
    d.line([(29, 41), (29, 44)], fill=WHITE)
    d.line([(29, 41), (31, 41)], fill=WHITE)
    d.line([(31, 42), (31, 43)], fill=WHITE)
    d.line([(29, 44), (31, 44)], fill=WHITE)
    d.line([(33, 41), (33, 44)], fill=WHITE)
    d.line([(33, 41), (35, 41)], fill=WHITE)
    d.line([(33, 43), (35, 43)], fill=WHITE)
    d.line([(33, 44), (35, 44)], fill=WHITE)
    d.point((35, 42), fill=WHITE)

    # 6. Twin Large High-Power LED Lower Headlights (x: 13..18 and 46..51)
    # Left Headlight
    d.rectangle([13, 42, 19, 48], fill=WHITE, outline=OUTLINE)
    d.ellipse([14, 43, 18, 47], fill=(255, 255, 230, 255))
    d.ellipse([15, 44, 17, 46], fill=(255, 255, 255, 255))
    # Right Headlight
    d.rectangle([45, 42, 51, 48], fill=WHITE, outline=OUTLINE)
    d.ellipse([46, 43, 50, 47], fill=(255, 255, 230, 255))
    d.ellipse([47, 44, 49, 46], fill=(255, 255, 255, 255))

    # 7. Heavy Buffer Beam & Round Protruding Buffers (Puffer)
    d.rectangle([8, 52, 56, 56], fill=BUFFER_DARK, outline=OUTLINE)
    # Left Round Buffer (Puffer)
    d.ellipse([9, 50, 17, 58], fill=BUFFER_DARK, outline=OUTLINE)
    d.ellipse([10, 51, 16, 57], fill=BUFFER_METAL)
    d.point((13, 54), fill=CHASSIS)
    # Right Round Buffer (Puffer)
    d.ellipse([47, 50, 55, 58], fill=BUFFER_DARK, outline=OUTLINE)
    d.ellipse([48, 51, 54, 57], fill=BUFFER_METAL)
    d.point((51, 54), fill=CHASSIS)
    # Center Coupler (Kupplung)
    d.rectangle([30, 52, 34, 57], fill=CHASSIS, outline=OUTLINE)
    d.line([(31, 57), (33, 57)], fill=BUFFER_METAL)

    # 8. Lower Snowplow / Air Dam (Bahnräumer)
    d.polygon([(14, 57), (50, 57), (47, 61), (17, 61)], fill=CHASSIS, outline=OUTLINE)
    # Steel Rail Wheels visible underneath
    d.rectangle([18, 58, 22, 62], fill=BUFFER_METAL, outline=OUTLINE)
    d.rectangle([42, 58, 46, 62], fill=BUFFER_METAL, outline=OUTLINE)

    out_path = os.path.join("public", "assets", "traps", "train-front.png")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    im.save(out_path)
    print(f"Successfully generated German Front-Facing Train: {W}x{H} px at {out_path}!")

if __name__ == "__main__":
    generate_german_front_train()
