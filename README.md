# Dropdown Digital — Vercel project

Complete editable static website: HTML, CSS, vanilla JavaScript, service JSON and every image used by the website. No framework, bundler, npm dependencies or build step required. The inquiry form uses a Vercel Node function and private Google service-account credentials.

## Vercel settings

| Setting | Value |
|---|---|
| Framework Preset | Other |
| Root Directory | Folder containing vercel.json |
| Build Command | Empty (override on) |
| Output Directory | public |
| Install Command | Empty |
| Environment variables | GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY |

These settings are supplied in vercel.json. Do not select Next.js or use npm run build.

## Deploy through GitHub

1. Extract this ZIP.
2. Create a GitHub repository and upload the CONTENTS of dropdown-digital-vercel (public, api, config, vercel.json, README.md and .gitignore) to the repository root.
3. In Vercel, add a new project and import that repository.
4. Select Other and confirm the settings above. If you uploaded the outer folder instead, select dropdown-digital-vercel as Root Directory.
5. Configure Google Sheets access using [the setup guide](docs/GOOGLE_SHEETS_SETUP.md), then deploy when authorized.

## Alternative: Vercel CLI

From the extracted folder containing vercel.json, with Node.js installed:

```sh
npx vercel
npx vercel --prod
```

Follow the login/project prompts. The first command creates a preview; the second deploys production. This archive itself has not been deployed to Vercel.

## Local preview

With Node 22+ installed, run from the project folder:

```sh
node scripts/dev-server.cjs
```

Open http://127.0.0.1:8090. This serves the static site and its inquiry API. Without Google credentials, submissions return an unavailable message and preserve the entries. Services and choices remain embedded in HTML.

## Edit files

- public/index.html: page structure, text, FAQ and form
- public/style.css: colors, layout, responsive styles and motion
- public/app.js: filters, service expansion and inquiry submission
- api/inquiry.js: validated Google Sheets delivery
- config/inquiries.json: selected spreadsheet and dedicated tab
- public/services.json: all eight services, scope, pricing and examples
- public/assets/: three complete WebP image assets used on the website

Images are included locally; system fonts require no font downloads. This includes all website assets, not unrelated social-media posters from the conversation. Website source is maintained under public; hosting configuration is adapted for Vercel. The old one-off data-generation script was not needed: services.json is the editable source of truth here. ChatGPT hosting metadata and Git credentials are excluded.

## Current functionality and limits

The Your next chapter section sends inquiries to the user's selected Google Sheet through `/api/inquiry`. It no longer creates a downloadable brief. It does not send email or book calls. Live saving requires the credentials and sheet sharing described in [GOOGLE_SHEETS_SETUP.md](docs/GOOGLE_SHEETS_SETUP.md). Success is shown only after Google confirms the row was saved. No deployment or live Google write was performed during implementation.

## Official reference

https://vercel.com/docs/builds/configure-a-build

## বাংলা সংক্ষিপ্ত নির্দেশনা

ZIP extract করে ভেতরের public folder ও vercel.json সহ ফাইলগুলো GitHub repository-তে দিন। Vercel-এ repository import করে Framework Other, Output public এবং Build Command খালি রাখুন। তারপর Deploy করুন। Inquiry form চালাতে Google service-account credentials Vercel environment variables-এ যোগ করতে হবে।


## Motion system and content maintenance

The site remains plain HTML/CSS/JavaScript with no runtime dependencies and no build step. `public/motion.js` and `public/motion-scenes.js` progressively enhance the page with the Web Animations API and IntersectionObserver. CSS motion tokens live at the end of `public/style.css`.

- Hero sequence completes in about one second; section groups reveal once. Artwork and architectural accents settle once over 4.2 seconds, then remain still. The statement ribbon follows native scrolling. Desktop-only pointer depth and modest parallax affect artwork wrappers. There is no pause button or endless animation.
- Filters cancel stale transitions, update `aria-pressed`, remove hidden rows from keyboard navigation and reposition visible rows.
- Native service/FAQ details animate measured panel heights; resizing or reduced-motion changes settle to intrinsic dimensions. Native details remain usable without JavaScript.
- Header/progress updates are scheduled once per animation frame; scroll remains native.
- Reduced-motion changes are handled live; hidden tabs finish pending motion. Content is visible by default, including when animation APIs are unavailable.
- Buttons keep their hit targets stationary; arrows provide directional feedback. Inquiry submission announces pending, confirmed success and failure through the live region.

`services.json` remains the content source. After editing it, run `node scripts/render-services.mjs` and commit the refreshed `public/index.html` alongside the JSON. This optional maintenance command creates the service rows and select options ahead of time so the eight offers remain readable without JavaScript. **It is not a Vercel build command.**

### Preview and checks

```sh
node scripts/dev-server.cjs
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

If Playwright or Chromium are installed outside Node's normal search path, set `PLAYWRIGHT_MODULE` to the Playwright module path and `CHROMIUM_PATH` to the Chromium executable. The suite checks 390/768/1440 px layouts, filters and rapid clicks, all service panels, deep links, FAQ keyboard operation, inquiry success with explicitly mocked transport, live reduced-motion changes, no-JavaScript reading and animation-API fallback. Screenshots are written to `/tmp`.

Validated in headless Chromium, including responsive screenshots. Physical iOS/Android devices, Safari/Firefox, assistive-technology reading and measured frame-rate/performance scores have not been tested. Vercel settings remain unchanged: framework Other, empty build/install commands, output `public`. No deployment is required to review these local changes.


### Vector icons and ambient motion

Arrow icons are inline SVG in controls and an SVG CSS mask for service bullets. They inherit the brand colors and never depend on an operating system’s emoji font. The service renderer preserves the same icons when regenerating content.

Ambient motion uses independent `translate` animations so it does not compete with entrance transforms. Artwork and background accents travel 7px on desktop and 3px on small/touch screens, once over 4.2 seconds. These finite effects pause offscreen and in hidden tabs. Reduced motion cancels them completely. No new dependencies or Vercel settings are needed.

For a portable browser review without publishing:

```sh
node scripts/create-preview.mjs /tmp/dropdown-preview.html
```

The resulting HTML embeds styles, scripts and original image assets. Download/open it in a browser, or serve its directory locally if your browser restricts local files. This is a preview artifact, not an additional deployment source.


### Section choreography

`motion-scenes.js` builds reusable masked heading, highlight wipe, image entrance, rule draw and staggered-group patterns on the shared native animation primitives. The existing accordion/filter logic stays in `motion.js`, while `app.js` retains the inquiry-submission behavior.

- Header/hero: sequential logo, navigation and contact entrance; masked headline lines, lime highlight wipe, artwork entrance and supporting CTA. Desktop pointer depth is limited to 4px horizontally / 3px vertically and 0.4 degrees; touch devices skip it.
- Statement strip: two identically sized groups form a ribbon that moves only with native scroll position, with capped travel and gently rotating lime separators. A decorative liquid-glass lens moves in the opposite direction behind the unscaled text; curved reflections and a slight change in shape follow the same scroll progress. It reverses without drift and stops with scrolling. Only the original text group is exposed to assistive technology. Reduced motion hides the lens and restores a stationary, fully readable strip. Small/touch screens omit the lens blur; browsers without backdrop-filter retain its gradient and rim. The scrolled header uses a lightly frosted surface.
- Intro: label first, then the three heading lines and supporting description. It reveals once rather than scrubbing or replaying while the visitor reads.
- Services: heading and pill sequences, progressive row/divider entrances, hover feedback and the existing measured-height panels. A filter action finishes outstanding row entrances to avoid double animation.
- Launch: sequential three-line headline, highlight wipe, copy and CTA, image entrance and a desktop-only 18px parallax range on the figure wrapper.
- Philosophy/process: statement lines, philosophy columns, sequential process rules/numbers/titles/copy and subtle scroll emphasis. These decorative rules do not indicate real project status.
- Brand/FAQ: mockup entrance and text sequence; heading and question-row reveals with the existing keyboard-accessible panels.
- Brief/footer: headline/highlight sequence, once-only field introductions (skipping any field in use), truthful submission feedback and a calm footer stagger.

No GSAP, Lenis, React, Next.js migration or other dependency was introduced. There is no `npm run build` because this repository intentionally has no package manifest or bundler. `vercel.json` preserves the static output and empty build/install commands; the inquiry API has a 30-second duration limit.

Additional QA: `scripts/test-editorial-scenes.cjs` checks 320, 375, 430, 768, 1024 and 1440px layouts, reversible ribbon/glass movement, stationary-scroll behavior, masked text, pointer/touch policy, live reduced-motion changes and no-JavaScript content. Run it with the same Playwright/Chromium environment variables as the other browser suites. Performance scores and physical-device Safari behavior have not been measured.


### Clients and footer

The footer uses the supplied transparent inverse SVG (`dropdown-digital-logo-white.svg`) at its natural aspect ratio. The header logo is unchanged. Client cards contain the four supplied names and exact HTTPS links.

Client content lives in `public/clients.json`. Run `node scripts/render-clients.mjs` after editing it; this optional maintenance step updates static HTML and is not a Vercel build command. Categories and 25–40-word descriptions require verified sources. Reviews require an authentic quote and owner attribution; `review` accepts `quote`, `owner`, and optional `title`. Empty fields are omitted rather than replaced by speculative copy.

All four websites were inaccessible from this environment (proxy tunnel returned HTTP 403), so business descriptions, categories and reviews remain unset:

- Wear Mono — https://wearmono.shop
- Diffo — https://diffoclothing.com/
- Nogor Essentials — https://nogoressetials.com/
- Sunlight Dyeing & Processing Industries — https://sunlightdyeing.app/

Verified business details and authentic owner reviews have been requested. The public section makes no claims about project scope, results or client satisfaction.

`node scripts/test-ambient.cjs` checks finite motion, removed pause control, footer transparency/aspect ratio, exact client links and reduced motion at 390/768/1440px. It uses the same Playwright environment variables described above.


### Architectural animated background

`public/background.js` selects a desktop or mobile GIF of the generated black/white/lime architectural plate. The animation is a gentle camera drift over a 3D-style render, not a real-time 3D scene. It plays once for about 4.8 seconds, then switches to the matching WebP still. A maximum 24px desktop / 10px mobile scroll-linked translation continues the sense of depth without a perpetual animation loop.

The fixed decorative layer sits behind the content, ignores pointer input and is hidden from assistive technology. Low opacity and a central white veil preserve legibility. The mobile GIF is approximately 580 KiB; the desktop GIF is approximately 2.52 MiB. No runtime library or Vercel setting changed.

Reduced motion, data-saving mode and disabled JavaScript use the still without requesting a GIF. Switching to reduced motion or hiding the tab stops playback. An unavailable GIF falls back to the still.

Assets: `public/assets/atmosphere-desktop.gif`, `atmosphere-mobile.gif`, and `atmosphere-still.webp`. To regenerate from the original generated plate, use `python scripts/render-atmosphere.py /path/to/generated-plate.png` with ffmpeg installed. This is an optional asset-encoding command, not a site build command.

Run `scripts/test-background.cjs` with the documented Playwright environment variables to check 390/768/1440px, finite playback, scroll depth, reduced motion, image fallback, data saving and no-JavaScript behavior.
