/* Build the mobile visual index from the same optimized previews used on
   desktop. Keep dimensions, counts, and no-JavaScript HTML in sync. */
const fs = require('fs');
const path = require('path');
const { readImageSize } = require('./lib/image-size');
const root = path.join(__dirname, '..');
const readManifest = (file) => {
  const text = fs.readFileSync(path.join(root, 'js', file), 'utf8');
  return JSON.parse(text.slice(text.indexOf('=') + 1).trim().replace(/;\s*$/, ''));
};
const previews = readManifest('home-previews.js');
const images = readManifest('gallery-editorial-manifest.js');
const publications = readManifest('publication-manifest.js');
const reels = readManifest('reel-manifest.js');
// Reel previews are downsized poster frames, named <slug>-<size>.webp by
// scripts/generate-home-previews.js. Name the video each one came from so
// the card can play it inline and open it in the reel viewer.
const slugify = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
const reelByPreview = new Map(reels.filter(reel => reel.poster).map(reel => [slugify(path.basename(reel.poster, path.extname(reel.poster))), reel]));
const reelFor = src => reelByPreview.get(path.basename(src, '.webp').replace(/-[a-z0-9]+$/, ''));
// Card copy comes from the English dictionary (data/locales/en.json), the
// same keys the cards carry for the language switcher (js/i18n.js).
const en = JSON.parse(fs.readFileSync(path.join(root, 'data', 'locales', 'en.json'), 'utf8'));
const copy = (id, field) => {
  const value = en[`category.${id}.${field}`];
  if (!value) throw new Error(`data/locales/en.json is missing category.${id}.${field}`);
  return value;
};
const categories = [
  { id: 'editorial-layout', count: publications.length, unit: 'publications' },
  { id: 'social-media-campaigns', count: images['social-media-campaigns'].length, unit: 'images' },
  { id: 'print-brand-collateral', count: images['print-brand-collateral'].length, unit: 'images' },
  { id: 'commercial-lifestyle-photography', count: images['commercial-lifestyle-photography'].length, unit: 'photographs' },
  { id: 'short-form-video-reels', count: reels.length, unit: 'videos' },
].map((category, i) => ({ id: category.id, label: copy(category.id, 'label'), title: copy(category.id, 'title'), description: copy(category.id, 'short'), count: category.count, unit: category.unit, number: String(i + 1).padStart(2, '0'), previews: (previews[category.id] || []).map(src => {
  const size = readImageSize(fs.readFileSync(path.join(root, src)), '.webp');
  if (!size) throw new Error(`Missing preview dimensions: ${src}`);
  const reel = category.id === 'short-form-video-reels' ? reelFor(src) : undefined;
  if (!reel) return { src, ...size };
  // `reelPreview`: the reel's light preview clip, when one has been made.
  return { src, ...size, reel: reel.file, ...(reel.preview && { reelPreview: reel.preview }) };
}) }));
const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const cards = categories.map(category => {
  const preview = category.previews[0];
  if (!preview) throw new Error(`Missing preview: ${category.id}`);
  return `        <a class="mobile-gallery-card" href="pages/${category.id}.html" data-category="${category.id}" aria-labelledby="mobile-gallery-title-${category.number}">
          <div class="mobile-gallery-media">
            <img class="mobile-gallery-preview" width="${preview.width}" height="${preview.height}" alt="${escape(category.title)} selected work" ${category.number === '01' ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" data-i18n-attr="alt:gallery.selectedWork" data-i18n-vars='{"title":"@category.${category.id}.title"}' />
            <noscript><picture><source media="(max-width: 760px)" srcset="${preview.src}" /><img width="${preview.width}" height="${preview.height}" alt="${escape(category.title)} selected work" ${category.number === '01' ? '' : 'loading="lazy"'} decoding="async" /></picture></noscript>
          </div>
          <div class="mobile-gallery-info">
            <p class="mobile-gallery-number">${category.number} / <span data-i18n="category.${category.id}.label">${escape(category.label)}</span></p>
            <div class="mobile-gallery-title-row"><h3 id="mobile-gallery-title-${category.number}" data-i18n="category.${category.id}.title">${escape(category.title)}</h3></div>
            <p class="mobile-gallery-description" data-i18n="category.${category.id}.short">${escape(category.description)}</p>
            <p class="mobile-gallery-count" data-i18n="gallery.count.${category.unit}" data-i18n-count="${category.count}">${category.count} ${category.unit}</p>
          </div>
        </a>`;
}).join('\n');
const indexPath = path.join(root, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const block = `<!-- MOBILE GALLERY START -->\n      <div class="mobile-gallery-index">\n${cards}\n      </div>\n      <!-- MOBILE GALLERY END -->`;
if (!html.includes('<!-- MOBILE GALLERY START -->')) throw new Error('Missing mobile gallery markers');
fs.writeFileSync(indexPath, html.replace(/<!-- MOBILE GALLERY START -->[\s\S]*?<!-- MOBILE GALLERY END -->/, block));
fs.writeFileSync(path.join(root, 'js', 'mobile-gallery-data.js'), `/* Generated by scripts/generate-mobile-gallery.js. */\nwindow.MOBILE_GALLERY_DATA = ${JSON.stringify(categories, null, 2)};\n`);
console.log('[mobile-gallery] Updated five cards, counts, and preview dimensions');
