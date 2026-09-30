# 🌐 Hosting & Deployment Guide

This guide explains how to publish the **UGC NET Psychology Study Hub** for free and keep it updated.

The current project is a **static HTML/CSS/JavaScript site**. It does not require a backend, database, Node.js installation, or server-side runtime for the basic version.

---

## ⭐ Recommended: GitHub Pages

GitHub Pages is a good fit when the project is stored in GitHub and you want version history and simple updates.

### Repository structure

Your repository should look like this:

```text
repository-root/
├── index.html
├── app.js
├── style.css
├── data.json
├── manifest.webmanifest
├── sw.js
├── dashboard.html
├── topic.html
├── unit.html
├── practice.html
├── flashcards.html
├── bookmarks.html
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

**Important:** `index.html` must be directly in the published folder/root. Avoid an unnecessary extra folder level.

### Enable GitHub Pages

1. Open the repository.
2. Go to **Settings**.
3. Open **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main`.
6. Select `/ (root)`.
7. Save.
8. Wait for GitHub Pages to publish the site.

A free `github.io` URL will be provided by GitHub.

### Updating the site

For a new release:

1. Replace the changed website files in the repository.
2. Commit the changes.
3. Wait for Pages to rebuild.
4. Open the website and refresh it.

If a PWA still displays the previous version, close/reopen it and refresh the website so the service worker can obtain the new assets.

---

## 🥈 Netlify

Netlify is convenient for quick static deployments.

### Deploy

1. Extract the website ZIP.
2. Open Netlify's deployment interface.
3. Upload/drag the **website folder contents** as required by the interface.
4. Netlify will provide a `netlify.app` URL.
5. Open the URL on your phone/tablet.
6. Install the PWA or add the site to your home screen.

For future updates, deploy the updated site contents again.

> Keep private study data out of a public repository or public deployment. The current app stores personal study state in the browser, not on Netlify.

---

## 🥉 Cloudflare Pages

Cloudflare Pages is another option for static hosting.

A typical Git-based deployment is:

1. Push the website to GitHub.
2. Connect the repository to Cloudflare Pages.
3. Use the repository root as the output directory.
4. No framework build is required for the current site.
5. Deploy.

Cloudflare will provide a `pages.dev` address.

---

## 🖥️ Local testing

For a quick local preview, Python can serve the files:

```bash
cd /path/to/website
python -m http.server 8080
```

Open:

```text
http://localhost:8080/
```

For another device on the same Wi-Fi network, use the computer's local IP address, for example:

```text
http://192.168.1.10:8080/
```

The exact IP depends on your network.

---

## 🏠 Self-hosting

Because the project is static, it can be served by common web servers such as:

- Nginx
- Apache
- Caddy
- Python's simple HTTP server for testing
- A Raspberry Pi/home server
- A VPS
- NAS web hosting

For a public deployment, use HTTPS.

---

## 📲 PWA requirements

The service worker and installable PWA experience require a secure origin in normal deployment:

```text
https://your-site.example/
```

`localhost` is also treated as a secure development origin by browsers.

Opening `index.html` directly as a `file://` URL is useful for a basic preview but is **not equivalent to the hosted PWA experience**.

---

## 💾 Study data and synchronization

The current application stores study state in browser storage.

This means:

```text
Phone browser  ──┐
Tablet browser  ──┼── separate local data
Desktop browser ──┘
```

Hosting the same website at one URL does not automatically synchronize those local records.

### Protect your work

Use the application's JSON export/backup feature regularly, especially before:

- clearing browser data
- uninstalling the PWA
- changing phones
- resetting the device
- making major content changes

### Future cloud architecture

A future synchronized version could use:

```text
User account
     ↓
Authentication
     ↓
Cloud database
     ↓
Progress / notes / bookmarks / scores
     ↓
Phone + tablet + desktop
```

---

## 🔧 Troubleshooting

### The homepage does not appear

Check that `index.html` is in the published root.

### Icons do not appear

Check that the repository contains:

```text
icons/icon-192.png
icons/icon-512.png
```

and that the paths in `manifest.webmanifest` match those filenames.

### The PWA does not install

Check that:

- the site is served over HTTPS;
- `manifest.webmanifest` is accessible;
- the icons exist at the expected paths;
- `sw.js` is accessible;
- you are using a browser that supports PWA installation.

### Changes are not visible immediately

The service worker may still have cached an older version. Refresh the site, close/reopen the PWA, and allow the new service-worker cache to activate.

If necessary during development, clear the site's browser storage/cache and reload.

---

## 🔒 Security reminder

Do not place the following in a public GitHub repository:

- passwords
- API keys
- private tokens
- personal identification documents
- private student records
- confidential counselling records
- private client information
- unlicensed copyrighted databases

The current project does not need secrets or API keys for its basic static operation.
