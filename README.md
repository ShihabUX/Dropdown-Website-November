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

Open http://localhost:8080. On Windows, py can replace python. Do not double-click index.html: service data is loaded with fetch and needs an HTTP server.

## Edit files

- public/index.html: page structure, text, FAQ and form
- public/style.css: colors, layout, responsive styles and motion
- public/app.js: filters, service expansion and downloadable project brief
- public/services.json: all eight services, scope, pricing and examples
- public/assets/: three complete WebP image assets used on the website

Images are included locally; system fonts require no font downloads. This includes all website assets, not unrelated social-media posters from the conversation. Original website source is preserved byte-for-byte under public; hosting configuration is adapted for Vercel. The old one-off data-generation script was not needed: services.json is the editable source of truth here. ChatGPT hosting metadata and Git credentials are excluded.

## Current functionality and limits

The form generates a local downloadable brief. It does not submit an inquiry, book a call or send email. Add your verified email/WhatsApp/booking destination or a backend to enable lead delivery. Pricing remains indicative. No database or authentication is included. The private access gate on the ChatGPT-hosted version is not part of this static code; check Vercel deployment protection before publishing if privacy is required.

## Official reference

https://vercel.com/docs/builds/configure-a-build

## বাংলা সংক্ষিপ্ত নির্দেশনা

ZIP extract করে ভেতরের public folder ও vercel.json সহ ফাইলগুলো GitHub repository-তে দিন। Vercel-এ repository import করে Framework Other, Output public এবং Build Command খালি রাখুন। তারপর Deploy করুন। কোনো environment variable লাগবে না।
