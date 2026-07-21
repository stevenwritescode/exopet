# ExoPet Website

Static marketing/docs site for ExoPet: build guide with affiliate supplies
list, STL downloads, and a kit waitlist shop. Next.js App Router with
`output: 'export'` — the build produces plain static files in `out/`.

## Develop

Requires Node 18.18+ (repo machines: `nvm use 20`).

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static export to out/
```

## Configuration (one-line switches)

| What | Where | How |
|---|---|---|
| Amazon affiliate tag | `src/data/affiliate.ts` | Set `AMAZON_TAG = 'yourtag-20'` — all amazon.com links get tagged site-wide |
| Waitlist endpoint | `src/data/site.ts` | Set `WAITLIST_ENDPOINT` to a Formspree-style URL; until then the form falls back to a mailto link |
| Contact email / GitHub URL | `src/data/site.ts` | `CONTACT_EMAIL`, `GITHUB_URL` |

## Content

All content is data-driven — edit these, no JSX required:

- `src/data/parts.ts` — supplies list (name, description, vendor URL, price)
- `src/data/guide.ts` — both walkthroughs (steps, code snippets, photo captions)
- `src/data/stls.ts` — STL catalog (print settings, file paths)
- `src/data/kits.ts` — shop kits and expected prices

## Replacing placeholders

- **STLs:** drop real files over `public/stl/<id>.stl` (the current ones are
  single-triangle placeholders).
- **Photos:** each guide step has an `imageAlt` caption rendered as a dashed
  placeholder box; swap `StepCard.tsx` to an `<img>` once photos exist and
  put them in `public/photos/`.
- **STL previews:** `StlCard.tsx` shows a gradient placeholder — replace with
  render images when available.

## Deploy

`npm run build`, then serve `out/` from any static host (Netlify, Vercel,
GitHub Pages, Cloudflare Pages). No server required.
