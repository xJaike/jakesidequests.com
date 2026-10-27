# Jake Side Quests

Personal portfolio at [jakesidequests.com](https://jakesidequests.com), built like an anime opening: a Press Start screen, a full-screen montage of SENRITSU's worlds, music that the page pulses to, scroll-driven scenes, and a playable SENRITSU demo. Plain HTML, CSS, and JavaScript with no build step, deployed on Vercel.

## Preview locally

From the repository root:

```sh
python3 -m http.server 8000
```

Open [localhost:8000](http://localhost:8000). The Press Start screen shows once per browser session; open a new private window to see it again. The local server shows its own 404 page; Vercel serves `404.html`.

## Deploy

The Vercel project `jakesidequests` is connected to this GitHub repository with the **Other** preset and no build command. Every push gets a preview deployment, and pushes to `main` go to production at [jakesidequests.com](https://jakesidequests.com). `vercel.json` adds trailing slashes (`/senritsu` → `/senritsu/`), caching headers, and a permanent redirect from `jakesidequests.vercel.app` to the custom domain; `www.jakesidequests.com` redirects there too, set in the project's Domains settings. `.vercelignore` keeps the source artwork and scripts out of the deployment.

DNS is on Cloudflare: an A record for `@` pointing to `76.76.21.21` and a CNAME for `www` pointing to `cname.vercel-dns.com`, both DNS only (not proxied), so Vercel can issue the HTTPS certificate. `sinhs` is a separate record for the SINHS SIS app. The site is no longer published with GitHub Pages.

## What's where

- `index.html`: homepage. Hero video, marquees, intro statement, the room cutscene, SENRITSU, the worlds gallery, more quests (SINHS SIS, ByteForge, LanguageBridge), Player 1 (about), and Say hi with fireworks.
- `senritsu/index.html`: SENRITSU page with the playable demo, app screens, features, worlds, and details.
- `senritsu/privacy/index.html`: published SENRITSU privacy policy.
- `byteforge/index.html` and `languagebridge/index.html`: pages for the ByteForge (`../ByteForge`) and LanguageBridge (`../parley`, formerly Parley) Android apps. Each page takes its accent color from the app icon (`--app` and `--app-2`, set per `data-page` in `assets/site.css`).
- `byteforge/privacy/index.html` and `languagebridge/privacy/index.html`: published privacy policies for both apps, written by hand from each app's source. Update them when an app's permissions or data handling change. These are the URLs entered in Google Play Console, so keep them stable; `vercel.json` permanently redirects the old `/parley/` pages to `/languagebridge/`.
- `byteforge/icon.svg`, `languagebridge/icon.svg`: app icons, redrawn from each app's adaptive launcher icon (`res/drawable/ic_launcher_background.xml` and `ic_launcher_foreground.xml`).
- `404.html`: the page Vercel shows for unknown URLs.
- `assets/site.css`: all styles. Colors and fonts are tokens on `:root`.
- `assets/site.js`: Press Start, the hero video shader (WebGL ripple and color split under the cursor), sakura petals, music and beat detection, smooth scrolling, scroll scenes, tilt and magnetic hovers, the cursor ring, and fireworks.
- `assets/rhythm.js`: the SENRITSU demo. Arrows are charted to the beats of a Champion's Rise clip and timed against the audio clock.
- `assets/vendor/`: GSAP 3.15 (with ScrollTrigger and SplitText, under GreenSock's no-charge standard license) and Lenis 1.3 (MIT), self-hosted.
- `assets/media/`: generated media (see below).

The pages work without JavaScript, and with reduced motion turned on the site shows a still image instead of video and skips the scroll animations. Each script feature only runs when its markup is on the page.

## Media from the SENRITSU repository

`scripts/build_media.py` builds `assets/media/` from `../SENRITSU`:

- `hero.webm`, `hero.mp4`, `hero-poster.webp`: a 22-second montage of eight cultural theme wallpapers with camera moves and transitions.
- `worlds/*.webp`: those wallpapers, resized for the galleries.
- `screens/*.webp`: four phone screens cropped from `design/themes/notes-and-effects-preview.webp`.
- `champions-rise.mp3`: the first 64 seconds of Champion's Rise, the site's background music.
- `demo-champions-rise.mp3` and the chart in `media.json`: a 30-second clip for the demo, with notes placed on the song's 150 BPM grid where the music has strong onsets.

Credits for the wallpapers and music are in `../SENRITSU/ASSET_CREDITS.md`. Rebuild with ffmpeg (libvpx-vp9, libopenh264, libmp3lame) and Pillow:

```sh
python3 scripts/build_media.py
```

## Media from the ByteForge and LanguageBridge repositories

`scripts/build_app_media.py` builds `assets/media/byteforge/` from screenshots in `../ByteForge/proof`, and `assets/media/languagebridge/` from `../parley` (screenshots in `docs/screenshots`, captured with `adb exec-out screencap -p`). Phone screenshots are cropped to remove the status bar (carrier and notifications) and the navigation bar. LanguageBridge's Face-to-Face and Transcript screens were captured while the app was still called Parley, so the script redraws their header title in the app's font; once they are retaken, remove `RETITLE` from the script. Rebuild with Pillow:

```sh
python3 scripts/build_app_media.py
```

## Fonts

Dela Gothic One (titles) and Zen Kaku Gothic New (everything else) are self-hosted in `assets/fonts/` under the SIL Open Font License. They are subset to the characters the pages and scripts use. Any new character outside ASCII and Latin-1, such as new Japanese text, falls back to a system font until you subset the fonts again:

```sh
python3 scripts/subset_fonts.py .
```

## Sync SENRITSU with the Android app

`~/SENRITSU` is the app source for this site's SENRITSU product facts, icon, and privacy wording.
With both repositories checked out beside each other, run from the website repository:

```sh
python3 ../SENRITSU/scripts/sync_website.py --website .
python3 ../SENRITSU/scripts/sync_website.py --website . --check
```

The check reports drift without changing files. The sync updates marked SENRITSU homepage and
product content, product meta descriptions, the privacy policy and its table of contents, and the
icon. It also updates the app's store song catalog and appearance copy. Keep the `<!-- senritsu:… -->` markers intact.
The styles for the synced markup (`.feature-grid`, `.feature`, `.feature-number`, `.page-meta`, `.policy-nav`, `.policy-content`) live in `assets/site.css`.
Edit feature wording in `../SENRITSU/design/website/features.html` and privacy wording in
`../SENRITSU/design/play-store/privacy-policy.html`, then sync again. App counts and settings come
from the Kotlin source, so the website cannot keep advertising an obsolete theme count.

This is a local content workflow; it does not publish or change other portfolio projects. See
`../SENRITSU/design/website/README.md` for the managed sources and release checks.
