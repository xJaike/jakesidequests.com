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

To feature another project, add an article alongside the existing `.project-card` in the homepage’s `#work` section. Keep project details and links accurate and provide descriptive text for meaningful images.

The `CNAME` file retains the custom domain. Publish changes through the repository’s existing GitHub Pages workflow.
