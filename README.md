# Jake Side Quests

Personal portfolio at [jakesidequests.com](https://jakesidequests.com), hosted on GitHub Pages. Plain HTML, CSS, and JavaScript; no build step or package installation required.

## Preview locally

From the repository root:

```sh
python3 -m http.server 8000
```

Open [localhost:8000](http://localhost:8000). Use a local server so the absolute asset and page links resolve correctly.

## Edit the site

- `index.html`: homepage, selected projects, about, and contact.
- `senritsu/index.html`: SENRITSU product page.
- `senritsu/privacy/index.html`: published SENRITSU privacy policy.
- `assets/site.css`: shared styles, responsive layouts, and both themes.
- `assets/site.js`: theme selection and persistence. The site content and navigation also work without JavaScript.
- `assets/fonts/`: self-hosted DM Sans and Space Grotesk, with their licenses.
- `assets/images/sinhs-logo.png`: SINHS school seal used in the SINHS SIS project card, copied from that project's static assets.
- `assets/images/jake-side-quests-banner.webp`: homepage banner and social preview, optimized from `Jake Side Quests.png`.
- `assets/images/jake-side-quests-emblem.webp`: shared header logo and homepage emblem, optimized from `Jake Side Quests Gaming Emblem.png`.
- `assets/favicon.png`: 64px gaming emblem for browser tabs. The original brand PNGs remain in the repository root.

Selected work currently features SENRITSU and SINHS SIS. The SINHS SIS card links to [the school information system](https://sinhs.jakesidequests.com/) and summarizes its enrollment, grading, attendance, and school-report workflows.

To feature another project, add an article alongside the existing `.project-card` in the homepage’s `#work` section. Keep project details and links accurate and provide descriptive text for meaningful images.

## Keep pages consistent

Use the homepage as the design reference for every project and supporting page. Reuse `.hero` for introductions, `.hero-art` for the illustrated card, `.section-heading` for section titles, `.project-card` for showcases, `.contact` for contact panels, and the shared button/link classes. Colors, type sizes, spacing, and corner radii are defined in `assets/site.css`; avoid page-specific replacements for these patterns.

Keep the site header and footer identical across routes. Project pages can add `.page-context` with breadcrumbs and `.project-nav` for their own sections. Product policies belong to the corresponding project: SENRITSU’s privacy policy is linked from its game pages, never the homepage or shared site footer. New projects should link to their own applicable policies.

The `CNAME` file retains the custom domain. Publish changes through the repository’s existing GitHub Pages workflow.
