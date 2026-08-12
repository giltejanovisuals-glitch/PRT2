# Gil Tejano — Portfolio

Static site, no build step. Open `index.html` directly or serve the folder root.

## Structure

```
PRT2/
├── index.html                 Homepage — hero carousel, selected work,
│                               and the Project Gallery showcase section
├── pages/
│   ├── porta-mobili.html      Brand case study pages. All four share one
│   ├── hooga.html             template; each resolves its own content
│   ├── dunlopillo.html        from js/projects-data.js by matching its
│   ├── metal-lite.html        own filename (see js/project-gallery.js)
│   │
│   ├── social-campaigns.html  Category gallery pages. All five share one
│   ├── print-collaterals.html template; each resolves its own content
│   ├── catalogues-editorial.html  from js/gallery-categories-data.js by
│   ├── retail-instore.html    matching its own filename (see
│   └── digital-ecommerce.html js/gallery-category.js)
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
│   │                            (including the Project Gallery showcase)
│   └── project-gallery.css     Case-study-only: gallery, lightbox,
│                                brand-nav, floating counters, category
│                                entry list
├── js/
│   ├── script.js                Homepage: theme/menu toggles, hero
│   │                             carousel, work panel
│   ├── gallery-index.js         Homepage: Project Gallery mobile
│   │                             accordion (desktop hover is CSS-only)
│   ├── project-gallery.js       Brand pages: resolves the project from
│   │                             projects-data.js, builds the gallery,
│   │                             lightbox, prev/next nav
│   └── gallery-category.js      Category pages: resolves the category
│                                 from gallery-categories-data.js, builds
│                                 the entry list, lightbox, prev/next nav
├── js/projects-data.js          Single source of truth for all brand
│                                 project copy (title, overview, gallery
│                                 layout, credits, etc.)
└── js/gallery-categories-data.js  Single source of truth for all
                                    category copy and per-entry
                                    brand/year/type captions
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

## Adding or editing a Project Gallery category

1. Edit its entry in `js/gallery-categories-data.js` (title, lede, intro,
   and its `entries` array — each entry is one gallery item with a
   `layout` of `landscape`, `pair`, or `portrait`, plus placeholder
   `brand`/`year`/`type`/`contribution` copy).
2. The five homepage showcase panels in `index.html` (`#gallery`) are
   hand-written, not generated — update a panel's copy there to match if
   you change a category's title or description.
3. If it's a new category, copy any file in `pages/social-campaigns.html`
   etc. to `pages/<id>.html` — it resolves its own id from its filename,
   same as the brand pages.

All category copy is currently placeholder ("Client Name", generic
project types) and every tile renders as a CSS gradient (the
`showcase-tone-*` classes in `css/style.css`) until real project entries
and images replace them.
