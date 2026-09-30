# Hosting the UGC NET Psychology Study Hub

This is a static HTML/CSS/JavaScript website. No Node.js, PHP, Python server, or database is required for the current version.

## Option 1 — Netlify (easiest, drag and drop)

1. Extract the ZIP on your computer.
2. Open Netlify's deploy/drag-and-drop page: https://app.netlify.com/drop
3. Drag the **`ugc_net_psychology_study_site`** folder into the deploy area.
4. Netlify publishes the site and gives you a live `*.netlify.app` URL.
5. Open that URL on your phone/tablet in Chrome.
6. Choose **Install App** or **Add to Home screen**.

For updates, drag the updated site folder to the site's deploy area again.

## Option 2 — GitHub Pages (best for version control)

1. Create a GitHub repository, for example `ugc-net-psychology`.
2. Upload the **contents** of `ugc_net_psychology_study_site` into the repository root so that `index.html` is at the top level.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and the `/ (root)` folder, then save.
6. GitHub will publish the site at a `github.io` address.

Keep the repository free of private/sensitive information if it is public.

## Option 3 — Cloudflare Pages

1. Put the site in a GitHub repository.
2. In Cloudflare, open **Workers & Pages → Create application → Pages**.
3. Import the Git repository.
4. For this static site, no build step is required; use `exit 0` if the dashboard asks for a build command.
5. Set the output directory to the repository root (`.`) if the site files are in the root.
6. Deploy. Cloudflare provides a `*.pages.dev` address.

## Self-hosting on your own computer / Raspberry Pi / VPS

The site can be served by any ordinary HTTP server. For example, with Python installed:

```bash
cd ugc_net_psychology_study_site
python -m http.server 8080
```

Then open `http://YOUR-SERVER-IP:8080/` on another device on the same network.

For a permanent public deployment, use HTTPS. The PWA install prompt and service worker require a secure origin (HTTPS), except for localhost development.

## Important data note

The current app stores notes, bookmarks, progress, and workspace data in the browser's local storage. That means data is device/browser-specific. Hosting the site publicly does **not** automatically synchronize your data between phone, tablet, and computer.

Use the app's export/backup feature regularly. A future cloud version can add authentication plus a database so that your progress and notes follow you across devices.
