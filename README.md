# Gil Tejano — Portfolio

Static site, no build step. Open `index.html` directly or serve the folder root.

## Structure

```
PRT2/
├── index.html                 Homepage — hero carousel + selected work
├── pages/
│   ├── porta-mobili.html      Case study pages. All four share one
│   ├── hooga.html             template; each resolves its own content
│   ├── dunlopillo.html        from js/projects-data.js by matching its
│   └── metal-lite.html        own filename (see js/project-gallery.js)
├── assets/
│   ├── images/
│   │   ├── home/               Homepage carousel / work-panel images
│   │   ├── porta-mobili/       10 images, 1920×1080 (16:9), flush stacked
│   │   ├── hooga/
│   │   ├── dunlopillo/
│   │   └── metal-lite/
│   ├── icons/
│   │   └── favicon.png         Linked from every page's <head>
│   └── fonts/                  Empty — fonts are currently loaded from
│                                Google Fonts CDN in each page's <head>.
│                                Drop self-hosted font files here if that
│                                changes.
├── css/
│   ├── style.css               Shared: tokens, reset, header/nav, homepage
│   └── project-gallery.css     Case-study-only: gallery, lightbox,
│                                brand-nav, floating counters
├── js/
│   ├── script.js                Homepage: theme/menu toggles, hero
│   │                             carousel, work panel
│   └── project-gallery.js       Case-study pages: resolves the project
│                                 from projects-data.js, builds the
│                                 gallery, lightbox, prev/next nav
└── js/projects-data.js          Single source of truth for all project
                                  copy (title, overview, gallery layout,
                                  credits, etc.)
```

## Adding or editing a project

1. Edit its entry in `js/projects-data.js` (or add a new one — order there
   sets homepage thumbnail order and the "Project 0N" numbering).
2. Drop that project's images into `assets/images/<id>/`.
3. If it's a new project, copy any file in `pages/` to `pages/<id>.html` —
   the page needs no edits; it resolves its own id from its filename.

Currently no real photography is wired in yet — all gallery tiles render as
CSS placeholder gradients (see the `project-<id>` tone classes in
`css/style.css`) until real `<img>`/background assets are dropped into
`assets/images/`.
