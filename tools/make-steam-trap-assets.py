import os
from PIL import Image, ImageDraw

def make_steam_trap_assets():
    out_dir = os.path.join("public", "assets", "traps")
    os.makedirs(out_dir, exist_ok=True)

    # 1. Manhole Grate (Kanaldeckel) - 32x14 px
    # Heavy ornate German cast iron street manhole cover with steam vents & hazard rim
    W, H = 32, 14
    im_grate = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im_grate)

    # Dark street asphalt cutout
    d.ellipse([1, 1, 30, 12], fill=(22, 26, 36, 255))
    # Cast iron rim
    d.ellipse([2, 2, 29, 11], fill=(55, 65, 81, 255), outline=(15, 23, 42, 255))
    d.ellipse([4, 3, 27, 10], fill=(75, 85, 102, 255))
    # Inner iron plate
    d.ellipse([5, 4, 26, 9], fill=(38, 45, 58, 255), outline=(20, 25, 35, 255))

    # Rivets / bolts along outer rim
    for bx in [5, 11, 16, 21, 26]:
        d.point((bx, 3), fill=(148, 163, 184, 255))
        d.point((bx, 10), fill=(15, 23, 42, 255))

    # Steam vent perforation slots (where steam escapes)
    for sx in [9, 13, 18, 22]:
        d.rectangle([sx, 5, sx + 1, 8], fill=(10, 14, 22, 255))
        d.point((sx, 5), fill=(245, 158, 11, 180)) # glowing heat reflection from sewer pipes below

    grate_path = os.path.join(out_dir, "steam-manhole.png")
    im_grate.save(grate_path)
    print("Saved:", grate_path, im_grate.size)

    # 2. Animated Steam Eruption Sprite Sheet - 32x56 px, 4 frames (Total: 128x56 px)
    # Frame 0: Idle / Warning whisps escaping
    # Frame 1: Burst eruption initiating
    # Frame 2: Full high-pressure billowing steam cloud column
    # Frame 3: Dissipating turbulent vapor swirl
    FW, FH = 32, 56
    sheet = Image.new("RGBA", (FW * 4, FH), (0, 0, 0, 0))

    # Colors for volumetric pixel steam
    C_WHITE = (255, 255, 255, 255)
    C_STEAM_LIGHT = (241, 245, 249, 240)
    C_STEAM_MID = (203, 213, 225, 210)
    C_STEAM_DARK = (148, 163, 184, 160)
    C_CYAN_CORE = (186, 230, 253, 220)
    C_HOT_GLOW = (254, 215, 170, 200)

    # Frame 0: Minor warning wisps escaping from the grate
    f0 = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    d0 = ImageDraw.Draw(f0)
    d0.ellipse([11, 46, 17, 52], fill=C_STEAM_MID)
    d0.ellipse([13, 42, 18, 48], fill=C_STEAM_LIGHT)
    d0.ellipse([10, 38, 15, 44], fill=C_STEAM_DARK)
    d0.ellipse([17, 44, 22, 50], fill=C_STEAM_LIGHT)
    d0.ellipse([18, 39, 23, 45], fill=C_STEAM_DARK)
    sheet.paste(f0, (0 * FW, 0))

    # Frame 1: High-pressure jet launch shooting upward
    f1 = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    d1 = ImageDraw.Draw(f1)
    # Base hot flare
    d1.ellipse([10, 48, 21, 54], fill=C_HOT_GLOW)
    # Fast narrow jet stream
    d1.rounded_rectangle([11, 20, 20, 50], radius=4, fill=C_CYAN_CORE)
    d1.rounded_rectangle([12, 16, 19, 45], radius=3, fill=C_WHITE)
    # Expanding cloud tip
    d1.ellipse([8, 12, 23, 26], fill=C_STEAM_LIGHT)
    d1.ellipse([11, 8, 20, 18], fill=C_WHITE)
    sheet.paste(f1, (1 * FW, 0))

    # Frame 2: Full powerful billowing steam column (danger max!)
    f2 = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(f2)
    # Ground expansion cloud
    d2.ellipse([4, 44, 27, 54], fill=C_STEAM_MID)
    d2.ellipse([7, 46, 24, 52], fill=C_HOT_GLOW)
    # Mid-body billowing steam lobes
    d2.ellipse([5, 30, 19, 44], fill=C_STEAM_LIGHT)
    d2.ellipse([12, 28, 26, 42], fill=C_CYAN_CORE)
    d2.ellipse([7, 18, 24, 34], fill=C_WHITE)
    d2.ellipse([3, 10, 20, 26], fill=C_STEAM_LIGHT)
    d2.ellipse([12, 8, 28, 24], fill=C_CYAN_CORE)
    # Top massive expanding mushroom cloud head
    d2.ellipse([5, 2, 26, 18], fill=C_WHITE)
    d2.ellipse([8, 4, 23, 15], fill=(255, 255, 255, 255))
    # Highlights & shading rims
    d2.arc([6, 3, 25, 17], 180, 360, fill=C_STEAM_DARK, width=1)
    sheet.paste(f2, (2 * FW, 0))

    # Frame 3: Dissipating turbulent swirl
    f3 = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    d3 = ImageDraw.Draw(f3)
    # Receding base
    d3.ellipse([8, 46, 23, 52], fill=C_STEAM_DARK)
    # Detached rising cloud clumps fading away
    d3.ellipse([3, 22, 17, 36], fill=C_STEAM_DARK)
    d3.ellipse([14, 20, 28, 34], fill=C_STEAM_MID)
    d3.ellipse([6, 8, 25, 22], fill=C_STEAM_LIGHT)
    d3.ellipse([9, 2, 22, 14], fill=C_STEAM_MID)
    sheet.paste(f3, (3 * FW, 0))

    plume_path = os.path.join(out_dir, "steam-plume.png")
    sheet.save(plume_path)
    print("Saved:", plume_path, sheet.size)

if __name__ == "__main__":
    make_steam_trap_assets()
