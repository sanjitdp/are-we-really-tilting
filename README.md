# Project page — *Are we really tilting?*

Static GitHub Pages site for the paper "Are we really tilting? The mechanics of reward guidance in flow and diffusion models" by Sanjit Dandapanthula and Nicholas M. Boffi (CMU).

## Local preview

```bash
cd website/
python -m http.server 8000
# open http://localhost:8000
```

## Deploy on GitHub Pages

Push this folder as the root of a repository, then in the repository settings enable Pages from `main` branch / `/ (root)`. The `.nojekyll` file disables Jekyll processing.

## Layout

```
website/
├── index.html       single-page site
├── style.css        Lato font + lavender accents (matches the paper)
├── script.js        vanilla-JS carousel
├── .nojekyll        skip Jekyll processing
└── assets/
    ├── fonts/       Lato Regular / Bold / Italic
    └── images/
        ├── cover/         six experiment panels (sliced from the paper cover figure)
        ├── theory/        overview, GMM hacking, mode-selection
        └── experiments/   FLUX experiments + checkerboard
```
