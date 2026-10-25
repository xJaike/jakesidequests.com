#!/usr/bin/env python3
"""Build the ByteForge and Parley page media from their repositories: app icons and
ByteForge screenshots from its proof folder.

Run from the website repository with ../ByteForge and ../parley checked out beside it:

    python3 scripts/build_app_media.py

Needs Pillow.
"""

import pathlib
import shutil

from PIL import Image

SITE = pathlib.Path(__file__).resolve().parents[1]
BYTEFORGE = SITE.parent / "ByteForge"
PARLEY = SITE.parent / "parley"
OUT = SITE / "assets/media/byteforge"

# Phone screenshots are 1224x2700 from a real phone. Rows 120-2568 drop the status bar
# (carrier, notifications) and the navigation bar and leave the app at exactly 1:2.
PHONE_CROP = (0, 120, 1224, 2568)
PHONE_SIZE = (540, 1080)
PHONES = {
    "editor": "phone-lint-editor-byteforge.png",
    "issues": "phone-lint-issues.png",
    "one-dark": "phone-lint-theme-one-dark.png",
    "dracula": "phone-lint-theme-dracula.png",
    "solarized": "phone-lint-theme-solarized-light.png",
    "swing": "phone-sari-1-shelf.png",
    "receipt": "phone-sari-3-receipt.png",
}
# The 2560x1600 tablet shot without its status bar and taskbar.
TABLET_CROP = (0, 90, 2560, 1488)
TABLET_WIDTH = 1600


def save(image, name):
    path = OUT / f"{name}.webp"
    image.save(path, "WEBP", quality=82, method=6)
    print(f"{path.relative_to(SITE)}: {image.width}x{image.height}, {path.stat().st_size // 1024} KB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    proof = BYTEFORGE / "proof"
    for name, source in PHONES.items():
        image = Image.open(proof / source).convert("RGB").crop(PHONE_CROP)
        save(image.resize(PHONE_SIZE, Image.LANCZOS), name)
    tablet = Image.open(proof / "android16-tablet-workspace.png").convert("RGB").crop(TABLET_CROP)
    save(tablet.resize((TABLET_WIDTH, round(tablet.height * TABLET_WIDTH / tablet.width)), Image.LANCZOS), "tablet")

    # ByteForge's launcher icon is a vector drawable; byteforge/icon.svg redraws it with the
    # launcher background. Parley ships a 512px Play Store icon.
    icon = Image.open(PARLEY / "app/src/main/ic_launcher-playstore.png")
    icon.resize((256, 256), Image.LANCZOS).save(SITE / "parley/icon.png", optimize=True)
    print("parley/icon.png: 256x256")


if __name__ == "__main__":
    main()
