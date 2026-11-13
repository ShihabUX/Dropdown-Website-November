# Activate website inquiries

The inquiry form is implemented. Live Google saves require the two private Vercel environment variables below. Missing configuration returns a truthful unavailable response; it never claims to have saved an inquiry.

## Destination

- Spreadsheet: https://docs.google.com/spreadsheets/d/1cup4bbnmDa-u-v38CGwBEENyenlIwG8ToTVJDXtgiv4/edit
- Dedicated tab: **Website inquiries**
- Configuration: `config/inquiries.json` (spreadsheet ID and tab name are not secrets).

The first successful submission creates this tab if needed and adds headings. Existing tabs are left alone. If the dedicated tab already has different headings, saving fails rather than overwriting them. Columns, in order:

`Submitted at (UTC) | Name | Email | Phone | Business / brand | Service | Project goals | Submission ID`

## Google access and Vercel settings

1. In Google Cloud Console, select/create a project and enable the **Google Sheets API**.
2. Create a service account. It does not need a Google Cloud project-wide Owner or Editor role. Create a JSON key for that service account and keep the downloaded file private.
3. Open the spreadsheet above and share it as **Editor** with the key file's `client_email`. Keep the sheet private; do not enable public editing.
4. In the existing Vercel project's **Settings → Environment Variables**, add:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: the JSON key's `client_email`.
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: the JSON key's `private_key`. Paste the actual multiline value, or its literal `\n` form. Do not include the entire JSON file.
5. Enable the variables for the intended deployment environment. Preview writes go to this same sheet unless `config/inquiries.json` is changed on that preview branch. Use a test sheet for isolated submission testing.
6. When ready to publish, deploy the changed project including `api/`, `config/`, `public/`, and `vercel.json`. Redeploy after changing Vercel environment variables. Nothing was deployed as part of this implementation.
7. Submit one inquiry with clearly identified test data, confirm the row in **Website inquiries**, and confirm the UI reports success. Remove the test row manually afterward if desired.

Never paste the key into chat, commit it, place it in `public/`, or use a public/client-side environment variable prefix. `.env*` files are ignored except for the empty `.env.example` template. A Google Drive connector in this chat does not provide persistent website authentication.

## Local preview

Node 22+:

```sh
node scripts/dev-server.cjs
```

Open http://127.0.0.1:8090. This serves the website and its actual API handler. Without credentials, submission returns HTTP 503 and retains the form entries.

For an authorized live local test, privately populate `.env.local` from `.env.example`, then run:

```sh
node --env-file=.env.local scripts/dev-server.cjs
```

This uses the configured sheet, so submissions are real. The server binds to localhost. Python's static server and the downloadable HTML preview cannot provide the API.

## Behavior and verification limits

- No download, automatic email, booking, or fake success. Success requires Sheets to acknowledge one appended row.
- Browser and server validate fields; the API accepts same-origin JSON, rejects oversized input, and includes a honeypot field. These are basic protections, not a complete anti-spam service.
- Sheets uses `RAW` input to keep user input literal rather than execute spreadsheet formulas.
- Submit is locked while pending. Failed requests retain entries and do not auto-retry. A network failure after Google commits a row can leave the result uncertain; manually retrying could create a duplicate. The same submission ID is retained for such retries to aid reconciliation.
- No submitted contact data, Google keys, tokens or upstream response bodies are logged by this code.
- Automated API tests mock Google responses and verify validation, JWT signing, the selected sheet, dedicated-tab setup, literal cell values and failure handling. Browser tests mock successful delivery. A live Google write cannot be verified until credentials are configured.
- Build/install commands stay empty and output stays `public`; the new Node function has a 30-second duration limit. No npm dependencies were added.
