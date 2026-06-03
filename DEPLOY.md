# Deployment

This is a fully static marketing site — no build step and no serverless functions.

## Stack

- Static HTML/CSS/JS in the repo root.
- `serve.mjs` — local-only Node static server (with Range support).
- No backend: the contact page links directly to `mailto:cvi@nordicadvancedsystems.com`.

## Local Development

```bash
npm install
npm start
```

`npm start` runs `node serve.mjs` and serves the static site locally.

## Deploy

Push to the connected branch (Vercel deploys automatically), or run `npx vercel --prod`.
`vercel.json` only sets `cleanUrls` / `trailingSlash`; there are no environment
variables or API routes to configure.

## Contact

The contact page (`/contact`) shows the address `cvi@nordicadvancedsystems.com` as a
`mailto:` link and a "Kontakt os" button. To change it, edit `contact/index.html`
(the `.contact-mail` block) — no DNS, API keys, or email provider setup required.
