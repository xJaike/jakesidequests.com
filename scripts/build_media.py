#!/usr/bin/env python3
"""Build the site's media from the SENRITSU repository: the hero montage video, scene images,
app screenshots, the music loop, and the rhythm demo's audio and chart.

Run from the website repository with ../SENRITSU checked out beside it:

    python3 scripts/build_media.py

Needs ffmpeg (libvpx-vp9, libopenh264, libmp3lame) and Pillow.
"""

import array
import json
import math
import pathlib
import subprocess
import sys

from PIL import Image

SITE = pathlib.Path(__file__).resolve().parents[1]
APP = SITE.parent / "SENRITSU"
OUT = SITE / "assets/media"
WALLPAPERS = APP / "app/src/main/res/drawable-nodpi"
TRACK = APP / "custom_tracks/champions_rise.mp3"

# The cultural worlds, in montage order: (file stem, title, culture)
WORLDS = [
    ("sakura_afterglow", "Sakura Afterglow", "Japanese"),
    ("parol_fiesta", "Parol Fiesta", "Filipino"),
    ("hanabi_night", "Hanabi Night", "Japanese"),
    ("crimson_lanterns", "Crimson Lanterns", "Chinese"),
    ("palayan_dawn", "Palayan Dawn", "Filipino"),
    ("hanok_moonrise", "Hanok Moonrise", "Korean"),
    ("jade_waterway", "Jade Waterway", "Chinese"),
    ("seoul_dream", "Seoul Dream", "Korean"),
]
# Play Store screenshots shown on the site: (site name: screenshot file stem)
SCREENS = {
    "six-lanes": "01-six-lanes",
    "home": "03-home",
    "track-select": "04-track-select",
    "results": "05-results",
    "theme-studio": "06-theme-studio",
    "icon-notes": "07-light-icon-notes",
}
CLIP = 3.4       # seconds each world is on screen, including its transition
FADE = 0.7       # transition length
TRANSITIONS = ["fadewhite", "slideleft", "circleopen", "smoothup", "radial", "wipetl", "hblur"]

# Champion's Rise is 150 BPM; beats fall at BEAT_PHASE + n * 0.4 s (measured with onset analysis).
BPM = 150
BEAT_PHASE = 0.09
MUSIC_LENGTH = 64.0          # the intro builds and the drop lands at 12 s
DEMO_START = BEAT_PHASE + 150 * 0.4   # 60.09 s, a short break before the 64 s drop
DEMO_LENGTH = 30.0
DEMO_FIRST_NOTE = 4.0        # the drop, ten beats into the clip
DEMO_LAST_NOTE = 27.6


def run(*args):
    subprocess.run(args, check=True)


def worlds():
    (OUT / "worlds").mkdir(parents=True, exist_ok=True)
    for stem, _, _ in WORLDS:
        image = Image.open(WALLPAPERS / f"theme_{stem}.webp").convert("RGB")
        image.resize((720, 1080), Image.LANCZOS).save(OUT / f"worlds/{stem}.webp", quality=80, method=6)
    print("worlds: 8 images")


def screens():
    """Resize the Play Store screenshots. They are 1080x1920 from an emulator with a clean status bar."""
    (OUT / "screens").mkdir(parents=True, exist_ok=True)
    for name, source in SCREENS.items():
        image = Image.open(APP / "design/play-store/screenshots" / f"{source}.png").convert("RGB")
        image.resize((540, 960), Image.LANCZOS).save(OUT / f"screens/{name}.webp", quality=85, method=6)
    print(f"screens: {len(SCREENS)} images")


def montage():
    inputs, filters = [], []
    for index, (stem, _, _) in enumerate(WORLDS):
        inputs += ["-loop", "1", "-t", f"{CLIP}", "-i", str(WALLPAPERS / f"theme_{stem}.webp")]
        # Tilt down or up the tall painting, drifting sideways a little, like a camera move.
        down = index % 2 == 0
        y = f"(ih-720)*({'0.15+0.45' if down else '0.65-0.45'}*t/{CLIP})"
        x = f"(iw-1280)*({'0.2+0.6' if index % 3 else '0.8-0.6'}*t/{CLIP})"
        filters.append(f"[{index}:v]scale=1440:2160,fps=30,crop=1280:720:x='{x}':y='{y}',setsar=1[v{index}]")
    last = "v0"
    offset = CLIP - FADE
    for index in range(1, len(WORLDS)):
        transition = TRANSITIONS[(index - 1) % len(TRANSITIONS)]
        filters.append(f"[{last}][v{index}]xfade=transition={transition}:duration={FADE}:offset={offset:.2f}[x{index}]")
        last = f"x{index}"
        offset += CLIP - FADE
    total = offset + FADE
    filters.append(f"[{last}]eq=saturation=1.12:contrast=1.04,vignette=PI/5,"
                   f"fade=t=in:st=0:d=0.4,fade=t=out:st={total - 0.4:.2f}:d=0.4,format=yuv420p[out]")
    graph = ";".join(filters)
    base = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[out]", "-an"]
    run(*base, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", str(OUT / "hero.webm"))
    run(*base, "-c:v", "libopenh264", "-b:v", "1800k", "-profile:v", "high", "-movflags", "+faststart", str(OUT / "hero.mp4"))
    run("ffmpeg", "-v", "error", "-y", "-ss", "0.5", "-i", str(OUT / "hero.webm"), "-frames:v", "1", "-c:v", "libwebp", "-quality", "78", str(OUT / "hero-poster.webp"))
    # The montage's scene timeline, for the "now showing" caption.
    timeline = [{"title": title, "culture": culture, "start": round(i * (CLIP - FADE), 2)} for i, (_, title, culture) in enumerate(WORLDS)]
    print(f"montage: {total:.1f} s")
    return timeline


def audio():
    run("ffmpeg", "-v", "error", "-y", "-i", str(TRACK), "-t", f"{MUSIC_LENGTH}",
        "-af", f"afade=t=out:st={MUSIC_LENGTH - 4}:d=4", "-ac", "2", "-b:a", "128k", str(OUT / "champions-rise.mp3"))
    run("ffmpeg", "-v", "error", "-y", "-ss", f"{DEMO_START:.3f}", "-i", str(TRACK), "-t", f"{DEMO_LENGTH}",
        "-af", f"afade=t=out:st={DEMO_LENGTH - 1.5}:d=1.5", "-ac", "2", "-b:a", "128k", str(OUT / "demo-champions-rise.mp3"))
    print("audio: music loop and demo clip")


def chart():
    """Place notes on the song's eighth notes wherever the music has a strong onset."""
    rate, hop = 8000, 80
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{DEMO_START:.3f}", "-t", f"{DEMO_LENGTH}", "-i", str(TRACK),
                          "-ac", "1", "-ar", str(rate), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    samples = array.array("h")
    samples.frombytes(pcm)
    energy = []
    for start in range(0, len(samples) - hop, hop):
        window = samples[start:start + hop:2]
        energy.append(math.log1p(math.sqrt(sum(s * s for s in window) / len(window))))
    onset = [0.0] + [max(0.0, energy[i] - energy[i - 1]) for i in range(1, len(energy))]

    def strength(t):
        k = int(t * 100)
        return max(onset[max(0, k - 2):k + 3] or [0])

    beat = 60 / BPM
    slots = []
    t = DEMO_FIRST_NOTE
    while t <= DEMO_LAST_NOTE + 1e-6:
        slots.append(round(t, 3))
        t += beat / 2
    offbeats = sorted((strength(s), s) for i, s in enumerate(slots) if i % 2)
    cutoff = offbeats[int(len(offbeats) * .6)][0] if offbeats else 1
    notes, lane, seed = [], 1, 11
    for index, slot in enumerate(slots):
        on_beat = index % 2 == 0
        if not on_beat and strength(slot) < cutoff:
            continue
        seed = (seed * 1103515245 + 12345) % 2 ** 31
        step = [1, 2, 3][seed % 3]
        lane = (lane + step) % 4
        notes.append([round(slot * 1000), lane])
    print(f"chart: {len(notes)} notes")
    return notes


def main():
    if not APP.exists():
        sys.exit(f"Expected the SENRITSU repository at {APP}")
    OUT.mkdir(parents=True, exist_ok=True)
    worlds()
    screens()
    timeline = montage()
    audio()
    notes = chart()
    data = {"bpm": BPM, "firstNote": DEMO_FIRST_NOTE * 1000, "length": DEMO_LENGTH * 1000, "notes": notes, "scenes": timeline}
    (OUT / "media.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print("wrote assets/media/media.json")


if __name__ == "__main__":
    main()
