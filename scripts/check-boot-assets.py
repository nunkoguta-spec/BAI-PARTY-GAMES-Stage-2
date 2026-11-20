import re
from pathlib import Path

text = Path("src/scenes/BootScene.js").read_text(encoding="utf-8")
missing = [m for m in re.findall(r"/assets/[^\"']+", text) if not (Path("public") / m.lstrip("/")).exists()]
print("missing", missing or "none")
