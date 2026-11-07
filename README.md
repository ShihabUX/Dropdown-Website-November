# Dropdown Digital — Vercel project

Complete editable static website: HTML, CSS, vanilla JavaScript, service JSON and every image used by the website. No framework, bundler, npm dependencies, API keys or build step required.

## Vercel settings

| Setting | Value |
|---|---|
| Framework Preset | Other |
| Root Directory | Folder containing vercel.json |
| Build Command | Empty (override on) |
| Output Directory | public |
| Install Command | Empty |
| Environment variables | None |

These settings are supplied in vercel.json. Do not select Next.js or use npm run build.

## Deploy through GitHub

1. Extract this ZIP.
2. Create a GitHub repository and upload the CONTENTS of dropdown-digital-vercel (public folder, vercel.json, README.md and .gitignore) to the repository root.
3. In Vercel, add a new project and import that repository.
4. Select Other and confirm the settings above. If you uploaded the outer folder instead, select dropdown-digital-vercel as Root Directory.
5. Deploy. No source edits are needed for hosting.

## Alternative: Vercel CLI

From the extracted folder containing vercel.json, with Node.js installed:

```sh
npx vercel
npx vercel --prod
```

Follow the login/project prompts. The first command creates a preview; the second deploys production. This archive itself has not been deployed to Vercel.

## Local preview

With Python installed, run from the project folder:

```sh
python -m http.server 8080 --directory public
```

Open http://localhost:8080. On Windows, py can replace python. Use the local HTTP server for representative testing. Services and choices are embedded in the HTML; JavaScript enhances filters, panels and brief download.

## Edit files

- public/index.html: page structure, text, FAQ and form
- public/style.css: colors, layout, responsive styles and motion
- public/app.js: filters, service expansion and downloadable project brief
- public/services.json: all eight services, scope, pricing and examples
- public/assets/: three complete WebP image assets used on the website

Images are included locally; system fonts require no font downloads. This includes all website assets, not unrelated social-media posters from the conversation. Website source is maintained under public; hosting configuration is adapted for Vercel. The old one-off data-generation script was not needed: services.json is the editable source of truth here. ChatGPT hosting metadata and Git credentials are excluded.

## Current functionality and limits

The form generates a local downloadable brief. It does not submit an inquiry, book a call or send email. Add your verified email/WhatsApp/booking destination or a backend to enable lead delivery. Pricing remains indicative. No database or authentication is included. The private access gate on the ChatGPT-hosted version is not part of this static code; check Vercel deployment protection before publishing if privacy is required.

## Official reference

https://vercel.com/docs/builds/configure-a-build

## বাংলা সংক্ষিপ্ত নির্দেশনা

ZIP extract করে ভেতরের public folder ও vercel.json সহ ফাইলগুলো GitHub repository-তে দিন। Vercel-এ repository import করে Framework Other, Output public এবং Build Command খালি রাখুন। তারপর Deploy করুন। কোনো environment variable লাগবে না।


## Motion system and content maintenance

The site remains plain HTML/CSS/JavaScript with no runtime dependencies and no build step. `public/motion.js` progressively enhances the page with the Web Animations API and IntersectionObserver. CSS motion tokens live at the end of `public/style.css`.

- Hero sequence completes in about one second; section groups reveal once. No parallax or continuous decorative animation.
- Filters cancel stale transitions, update `aria-pressed`, remove hidden rows from keyboard navigation and reposition visible rows.
- Native service/FAQ details animate measured panel heights; resizing or reduced-motion changes settle to intrinsic dimensions. Native details remain usable without JavaScript.
- Header/progress updates are scheduled once per animation frame; scroll remains native.
- Reduced-motion changes are handled live; hidden tabs finish pending motion. Content is visible by default, including when animation APIs are unavailable.
- Buttons keep their hit targets stationary; arrows provide directional feedback. Brief download retains the truthful live-region message.

`services.json` remains the content source. After editing it, run `node scripts/render-services.mjs` and commit the refreshed `public/index.html` alongside the JSON. This optional maintenance command creates the service rows and select options ahead of time so the eight offers remain readable without JavaScript. **It is not a Vercel build command.**

### Preview and checks

```sh
python -m http.server 8090 --directory public
```

Open `http://localhost:8090`. Basic checks:

```sh
node --check public/app.js
node --check public/motion.js
node scripts/render-services.mjs
git diff --check
```

The optional browser suite uses Playwright supplied by your development environment (no site dependency):

```sh
TEST_URL=http://127.0.0.1:8090 node scripts/test-motion.cjs
```

If Playwright or Chromium are installed outside Node's normal search path, set `PLAYWRIGHT_MODULE` to the Playwright module path and `CHROMIUM_PATH` to the Chromium executable. The suite checks 390/768/1440 px layouts, filters and rapid clicks, all service panels, deep links, FAQ keyboard operation, downloaded brief contents, live reduced-motion changes, no-JavaScript reading and animation-API fallback. Screenshots are written to `/tmp`.

Validated in headless Chromium, including responsive screenshots. Physical iOS/Android devices, Safari/Firefox, assistive-technology reading and measured frame-rate/performance scores have not been tested. Vercel settings remain unchanged: framework Other, empty build/install commands, output `public`. No deployment is required to review these local changes.
