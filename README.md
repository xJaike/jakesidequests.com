# Jake Side Quests

Personal portfolio at [jakesidequests.com](https://jakesidequests.com), styled as a JRPG at night: a title screen, a quest board, a status screen, and an inn. Plain HTML, CSS, and JavaScript with no build step, deployed on Vercel.

## Preview locally

From the repository root:

```sh
python3 -m http.server 8000
```

Open [localhost:8000](http://localhost:8000). Use a local server so the absolute asset and page links resolve correctly. The local server shows its own 404 page; Vercel serves `404.html`.

## Deploy

Import the repository in Vercel with the **Other** framework preset, no build command, and the repository root as the output directory. `vercel.json` adds trailing slashes (`/senritsu` → `/senritsu/`) and caching headers. `.vercelignore` keeps the source artwork, scripts, and `CNAME` out of the deployment. Add `jakesidequests.com` under the project's Domains settings; `CNAME` only matters for GitHub Pages.

## Edit the site

- `index.html`: homepage. The title screen, cutscene banner, quest board (`#work`), status screen (`#about`), and inn (`#say-hello`).
- `senritsu/index.html`: SENRITSU product page with the playable demo.
- `senritsu/privacy/index.html`: published SENRITSU privacy policy.
- `404.html`: the page Vercel shows for unknown URLs.
- `assets/site.css`: shared styles. Colors and fonts are tokens on `:root`.
- `assets/site.js`: the HUD area label, command menu cursor and arrow keys, Jake's typed dialogue, and the night sky. The pages work without JavaScript.
- `assets/rhythm.js`: the SENRITSU demo (D F J K or tap; each hit plays a note of the melody). Loaded only on the SENRITSU page.
- `assets/images/jake-portrait.webp`: Jake's face, cropped from `Jake Side Quests Gaming Emblem.png`, for the dialogue box and status screen.
- `assets/images/jake-side-quests-emblem-96.webp`: small emblem for the header.
- `assets/images/jake-side-quests-banner.webp`: the cutscene banner and social preview.

### The building blocks

Every panel is a `.window`: a JRPG menu window with a double frame. Give it a `.window-tab` for its label (a speaker name, a quest type). Menus are `.command` lists, and links with the `.cursor` class get the gold pointer on hover and focus. Use `.button` for the main action and `.text-link cursor` for secondary links. Keep the header and footer identical across pages; set the HUD's `Area` text for each page.

To add a project, add an `article.window.quest` to the homepage quest board, before the locked `???` slot.

### Fonts

Dela Gothic One (titles), DotGothic16 (the game's voice), and Zen Kaku Gothic New (reading text) are self-hosted in `assets/fonts/`, under the SIL Open Font License. They are subset to the characters the pages use, so they stay small. Any new character outside ASCII and Latin-1, such as new Japanese text, falls back to a system font until you subset the fonts again:

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
