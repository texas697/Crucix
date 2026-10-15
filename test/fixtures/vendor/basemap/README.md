# Basemap fixtures (Carto `carto.streets/v1` vector tiles)

Local, pinned copies of the three Carto GL styles the dashboard loads, plus the
minimum sprite / glyph / tile set needed for the map to render offline.

All files were fetched 2026-10-14 and are listed with sha256 in
`../MANIFEST.md`.

## Layout

```
basemap/
  styles/dark-matter.json            # was dark-matter-gl-style/style.json
  styles/dark-matter-nolabels.json   # was dark-matter-nolabels-gl-style/style.json
  styles/positron.json               # was positron-gl-style/style.json
  sprite/dark-matter.json|.png       # shared by dark-matter + dark-matter-nolabels
  sprite/positron.json|.png
  glyphs/<fontstack>/<range>.pbf     # one dir per text-font stack used by the styles
  tiles/<z>/<x>/<y>.mvt              # a small set of vector tiles
```

## Rewrites applied to the style JSONs

Each saved style is byte-different from upstream in exactly three places so it
resolves entirely to local relative paths (relative to the style file):

| Field | Upstream | Local |
|-------|----------|-------|
| `sprite` | `https://tiles.basemaps.cartocdn.com/gl/<style>-gl-style/sprite` | `../sprite/dark-matter` or `../sprite/positron` |
| `glyphs` | `https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf` | `../glyphs/{fontstack}/{range}.pbf` |
| `sources.carto.url` | `.../vector/carto.streets/v1/tiles.json` (TileJSON) | replaced by inline `sources.carto.tiles = ["../tiles/{z}/{x}/{y}.mvt"]`, `minzoom:0`, `maxzoom:2` |

`dark-matter-nolabels.json` has no text layers, so it references no glyphs even
though the template is present.

### Relative-path note

Because MapLibre resolves `sprite` / `glyphs` / tile templates **relative to the
style document's URL**, serve each style from `basemap/styles/` and the `../`
prefixes resolve to `basemap/sprite`, `basemap/glyphs`, `basemap/tiles`. If a
harness instead inlines the stylesheet into the page, rewrite the `../` prefixes
to the served root (e.g. `/basemap/sprite/...`).

## Encoding of `.pbf` / `.mvt`

Upstream serves both glyphs and vector tiles with `Content-Encoding: gzip`. The
saved copies here are **decompressed** (`curl --compressed`). When serving them
from Playwright, fulfil with `Content-Type: application/x-protobuf` and **do
not** set a `Content-Encoding` header.

## Coverage — what is vendored vs. not

### Sprites
- [x] `dark-matter` sprite pair (`.json` + `.png`)
- [x] `positron` sprite pair (`.json` + `.png`)
- (dark-matter-nolabels reuses the dark-matter sprite.)

### Glyphs
The Carto styles use four distinct `text-font` fallback stacks. Each is saved as
a directory (spaces and commas preserved, matching the exact `{fontstack}` path
MapLibre builds by joining the array with `,`).

| fontstack | 0-255 | 256-511 |
|-----------|:-----:|:-------:|
| `Montserrat Regular,Open Sans Regular,Noto Sans Regular,HanWangHeiLight Regular,NanumBarunGothic Regular` | yes | yes |
| `Montserrat Medium,Open Sans Bold,Noto Sans Regular,HanWangHeiLight Regular,NanumBarunGothic Regular` | yes | yes |
| `Montserrat Regular Italic,Open Sans Italic,Noto Sans Regular,HanWangHeiLight Regular,NanumBarunGothic Regular` | yes | no |
| `Montserrat Medium Italic,Open Sans Italic,Noto Sans Regular,HanWangHeiLight Regular,NanumBarunGothic Regular` | yes | no |

- Range `0-255` (basic Latin) covers all ASCII place labels.
- Range `256-511` (Latin-1 supplement) is included for the two upright stacks;
  it is **not** vendored for the two italic stacks (italic labels are rare at
  low zoom). Those requests will miss — add them if a baseline needs them.
- All other ranges (Cyrillic, CJK, etc.) are **not** vendored. The two non-Latin
  fallbacks (`HanWangHeiLight Regular`, `NanumBarunGothic Regular`) are only
  present as part of the merged stacks; their non-Latin glyph ranges are absent.

### Tiles (`tiles/{z}/{x}/{y}.mvt`)
The TileJSON advertises `minzoom: 0`, `maxzoom: 14` and four subdomains
(`tiles-a..d`); the local template collapses to a single `../tiles/{z}/{x}/{y}.mvt`.

- [x] `z=0` — `0/0/0`
- [x] `z=1` — `0/0`, `1/0`, `0/1`, `1/1` (the whole world at z1; this is what the
  default view `center:[20,25] zoom:1.35` requests, since vector tiles are 512px
  and `floor(1.35)=1`)
- [x] `z=2` — partial, covering the default center region: `1/1`, `2/1`, `1/2`, `2/2`
- [ ] `z>=3` and the remaining `z=2` tiles — **not vendored / placeholder**.
  The style's source `maxzoom` is pinned to `2`, so MapLibre overzooms z2 tiles
  instead of requesting deeper levels. If a baseline needs real detail at
  `zoom >= 3`, fetch the additional `tiles/<z>/<x>/<y>.mvt` (e.g. the US-west
  tiles) and it will route without any style change.

Nothing else is un-fetchable: every URL referenced above returned HTTP 200. The
only deliberate omissions are the additional tile zooms and glyph ranges noted
as placeholders above, kept out to avoid downloading the whole tile pyramid.
