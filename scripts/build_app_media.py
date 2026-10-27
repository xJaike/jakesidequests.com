#!/usr/bin/env python3
"""Build the app showcase media from their repositories: ByteForge screenshots from its proof
folder, LanguageBridge screenshots from docs/screenshots, and two SINHS SIS dashboards from its
design folder.

Run from the website repository with ../ByteForge, ../parley (LanguageBridge), and ../sinhs-sis
checked out beside it:

    python3 scripts/build_app_media.py

Needs Pillow.
"""

import pathlib

from PIL import Image, ImageDraw, ImageFont

SITE = pathlib.Path(__file__).resolve().parents[1]
BYTEFORGE = SITE.parent / "ByteForge"
LANGUAGEBRIDGE = SITE.parent / "parley"
SINHS = SITE.parent / "sinhs-sis"
OUT = SITE / "assets/media/byteforge"
LANGUAGEBRIDGE_OUT = SITE / "assets/media/languagebridge"
SINHS_OUT = SITE / "assets/media/sinhs"

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
# Debugger and tools screenshots are 1080x2340 from an emulator. Rows 48-2208 drop the navigation
# bar and leave exactly 1:2; the status bar text above row 110 is painted over with the app bar.
EMULATOR_CROP = (0, 48, 1080, 2208)
STATUS_BAR_END = 110 - 48
EMULATOR_PHONES = {
    "debugger": "debug-step-locals.png",
    "inspector": "debug-inspector.png",
    "history": "tools-history-dark.png",
    "find": "tools-project-search.png",
}
# LanguageBridge screenshots, captured with adb screencap on the same 1224x2700 phone.
LANGUAGEBRIDGE_SCREENS = ["face-to-face", "transcript", "live-translate", "phrasebook", "models", "settings"]
# Face-to-Face and Transcript were captured before Parley became LanguageBridge. Until they are
# retaken, redraw the header title in the app's font and move the OFFLINE chip along with it.
RETITLE = ["face-to-face", "transcript"]
HEADER_BG = (25, 40, 44)
OLD_TITLE = (50, 200, 236, 270)
OFFLINE_CHIP = (246, 200, 497, 269)
# SINHS SIS dashboards, cropped to the top 16:10 of the page. Only dashboards: the class record,
# attendance, and report card screens show learners' names.
SINHS_SCREENS = {
    "admin": ("design/review/v1.3.0/black-gold-ivory-bright-dark.png", (0, 0, 1400, 875)),
    "teacher": ("design/screens/png/10-TeacherDashboard.png", (0, 0, 1440, 900)),
}
SINHS_WIDTH = 1200
# The 2560x1600 tablet shot without its status bar and taskbar.
TABLET_CROP = (0, 90, 2560, 1488)
TABLET_WIDTH = 1600


def save(image, name, out=OUT):
    path = out / f"{name}.webp"
    image.save(path, "WEBP", quality=82, method=6)
    print(f"{path.relative_to(SITE)}: {image.width}x{image.height}, {path.stat().st_size // 1024} KB")


def retitle(image):
    font = ImageFont.truetype(str(LANGUAGEBRIDGE / "app/src/main/res/font/space_grotesk.ttf"), 55)
    ink = [p for p in image.crop(OLD_TITLE).get_flattened_data() if sum(abs(a - b) for a, b in zip(p, HEADER_BG)) > 60]
    color = max(ink, key=lambda p: sum(abs(a - b) for a, b in zip(p, HEADER_BG)))
    chip = image.crop(OFFLINE_CHIP)
    shift = round(font.getlength("LanguageBridge") - font.getlength("Parley"))
    draw = ImageDraw.Draw(image)
    draw.rectangle((OLD_TITLE[0] - 4, OLD_TITLE[1], OFFLINE_CHIP[2] + 2, OFFLINE_CHIP[3]), fill=HEADER_BG)
    # Keep the title's ink at the old title's top left corner (50, 214).
    draw.text((50 - font.getbbox("LanguageBridge")[0], 214 - font.getbbox("Parley")[1]), "LanguageBridge", font=font, fill=color)
    image.paste(chip, (OFFLINE_CHIP[0] + shift, OFFLINE_CHIP[1]))
    return image


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    proof = BYTEFORGE / "proof"
    for name, source in PHONES.items():
        image = Image.open(proof / source).convert("RGB").crop(PHONE_CROP)
        save(image.resize(PHONE_SIZE, Image.LANCZOS), name)
    for name, source in EMULATOR_PHONES.items():
        image = Image.open(proof / source).convert("RGB").crop(EMULATOR_CROP)
        pixels = image.load()
        for y in range(STATUS_BAR_END):
            image.paste(pixels[2, y], (0, y, image.width, y + 1))
        save(image.resize(PHONE_SIZE, Image.LANCZOS), name)
    tablet = Image.open(proof / "android16-tablet-workspace.png").convert("RGB").crop(TABLET_CROP)
    save(tablet.resize((TABLET_WIDTH, round(tablet.height * TABLET_WIDTH / tablet.width)), Image.LANCZOS), "tablet")

    LANGUAGEBRIDGE_OUT.mkdir(parents=True, exist_ok=True)
    for name in LANGUAGEBRIDGE_SCREENS:
        image = Image.open(LANGUAGEBRIDGE / "docs/screenshots" / f"{name}.png").convert("RGB")
        if name in RETITLE:
            image = retitle(image)
        image = image.crop(PHONE_CROP)
        save(image.resize(PHONE_SIZE, Image.LANCZOS), name, LANGUAGEBRIDGE_OUT)

    SINHS_OUT.mkdir(parents=True, exist_ok=True)
    for name, (source, box) in SINHS_SCREENS.items():
        image = Image.open(SINHS / source).convert("RGB").crop(box)
        save(image.resize((SINHS_WIDTH, round(image.height * SINHS_WIDTH / image.width)), Image.LANCZOS), name, SINHS_OUT)

    # Both launcher icons are vector drawables; byteforge/icon.svg and languagebridge/icon.svg
    # redraw them with their launcher backgrounds.


if __name__ == "__main__":
    main()
