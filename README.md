# 🧠 UGC NET Psychology Study Hub

> A mobile-first, tablet-friendly study platform for **UGC NET Psychology** — built around the official 10-unit syllabus, topic-level study, revision, practice, flashcards, bookmarks, and personal progress tracking.

[![Live Demo](https://img.shields.io/badge/Live-GitHub%20Pages-222?logo=github)](#-deploy-with-github-pages)
[![PWA](https://img.shields.io/badge/PWA-Installable-5a67d8)](#-install-as-an-app)
[![Responsive](https://img.shields.io/badge/Responsive-Phone%20%7C%20Tablet%20%7C%20Desktop-0ea5e9)](#-responsive-design)
[![No Build Step](https://img.shields.io/badge/Build%20Step-None-16a34a)](#-quick-start)

## ✨ What is this?

The UGC NET Psychology Study Hub turns the Psychology syllabus into an interactive study workspace instead of a static list of topics.

The current site includes:

- **10 official syllabus units** and their syllabus points
- Topic-by-topic study pages
- Editable detailed notes and quick-revision notes
- PYQ workspace for adding and verifying previous-year questions
- MCQ practice workspace
- Flashcards
- Bookmarks and mastery status
- Progress dashboard
- Daily Study Cockpit
- Topic search and navigation
- JSON export/import for backups
- Mobile, tablet and desktop layouts
- Progressive Web App (PWA) support
- Offline caching after the site has been loaded once

## 🎯 Study workflow

```text
Syllabus
   ↓
Topic
   ↓
Learn
   ↓
Recall / Flashcards
   ↓
Practice MCQs
   ↓
Add & verify PYQs
   ↓
Mark mastery
   ↓
Revise again
```

The homepage is designed as a **study cockpit**: open the site and immediately see what to work on, your progress, and your next study actions.

---

## 📚 Syllabus source

The syllabus hierarchy is based on the uploaded **NET Psychology Syllabus** document and follows its **10-unit structure**.

The 10 units are:

1. Emergence of Psychology
2. Research Methodology and Statistics
3. Psychological Testing
4. Biological Basis of Behavior
5. Attention, Perception, Learning, Memory and Forgetting
6. Thinking, Intelligence and Creativity
7. Personality, Motivation, emotion, stress and coping
8. Social Psychology
9. Human Development and Interventions
10. Emerging Areas

> **Content integrity:** Generated study aids are not automatically official UGC NET PYQs. A question should be labelled as a verified PYQ only after its original paper or a traceable authoritative reproduction has been checked.

---

## 🏠 Daily Study Cockpit

The homepage is more than navigation. It provides a personal starting point for each study session.

It can surface:

- Today's date
- Study streak
- Daily progress
- A small topic queue
- MCQ practice target
- Current/unfinished topics
- Bookmarked topics
- Overall syllabus mastery

The system uses the study activity stored in your browser to make the homepage more useful over time.

---

## 📱 Responsive design

The interface is designed for:

| Device | Experience |
|---|---|
| 📱 Android phone | Single-column, touch-friendly study interface |
| 📲 Tablet portrait | Expanded cards and navigation |
| 🖥️ Tablet landscape | Wider study workspace and sidebar |
| 💻 Desktop | Full-width dashboard and study workspace |

The site can also be installed as a PWA on supported browsers.

---

## 🚀 Quick start

This is a **static website**. There is no build system and no server-side application required for the current version.

### Local preview

You can open `index.html` for a basic preview.

For the complete PWA/service-worker experience, serve the site through HTTP(S). For example:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

---

## 🌐 Deploy with GitHub Pages

This is the recommended free hosting method if you want to keep the project in GitHub and update it regularly.

### 1. Create a repository

For example:

```text
ugc-net-psychology
```

### 2. Upload the website files

The repository root should contain `index.html` directly:

```text
ugc-net-psychology/
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
├── README.md
├── HOSTING.md
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

Do **not** put the entire site inside another nested folder unless you intentionally configure Pages for that structure.

### 3. Enable Pages

In GitHub:

**Repository → Settings → Pages**

Choose:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

Save the setting.

GitHub will provide your free `github.io` address.

### 4. Update the website later

Replace the changed files in the repository and commit them. GitHub Pages will rebuild the site automatically.

---

## 📲 Install as an app

After the website is hosted over HTTPS:

1. Open the website in Chrome on Android.
2. Use **Install App** or **Add to Home screen** when offered.
3. Launch it from your home screen.

The app includes a web manifest and service worker for the PWA experience.

> If you update the site and an old version remains visible, refresh the website or reopen the installed PWA so the updated service-worker cache can take effect.

---

## 💾 Your study data

The current version is intentionally **client-side**.

Your notes, bookmarks, progress and workspace information are stored in the browser's local storage.

That means:

- Your phone and tablet do **not** automatically share the same progress.
- Clearing browser/site data can remove locally stored study data.
- Hosting the website does **not** create cloud synchronization.

### Backup

Use the app's **JSON export/import** functionality regularly.

A future cloud version can add authentication and a database so that progress follows you across devices.

---

## 🗂️ Project structure

```text
.
├── index.html                 # Homepage / Daily Study Cockpit
├── dashboard.html             # Progress dashboard
├── unit.html                  # Unit view
├── topic.html                 # Topic study workspace
├── practice.html              # MCQ practice
├── flashcards.html            # Flashcard review
├── bookmarks.html             # Saved topics
├── app.js                     # Application logic and local data handling
├── style.css                  # Responsive UI styles
├── data.json                  # Syllabus and study content
├── manifest.webmanifest       # PWA metadata
├── sw.js                      # Service worker / offline cache
├── icons/                     # PWA icons
├── HOSTING.md                 # Hosting instructions
└── meta.json                  # Project metadata
```

---

## 🧩 Content model

Each syllabus point can act as a study unit containing areas such as:

- Exact syllabus point
- Study explanation
- Detailed notes
- Quick revision notes
- PYQ workspace
- MCQ workspace
- Flashcards
- References
- Bookmark status
- Revision/mastery status

This structure is intended to make the site extensible into a larger question bank and revision platform.

---

## 🔐 PYQ accuracy policy

This project deliberately separates **generated study material** from **verified previous-year questions**.

### Do

- Add the year/session when known.
- Preserve the original wording where appropriate.
- Record the source of the question.
- Verify the question against the original paper or a traceable authoritative reproduction before calling it an official PYQ.

### Don't

- Label a model-generated MCQ as an official PYQ.
- Invent a year/session for a question.
- Treat a generic coaching question as an official NTA question without verification.

---

## 🛠️ Customization

The project is deliberately simple so it can be extended without a framework.

Common places to edit:

- `data.json` → syllabus/content data
- `app.js` → application behaviour
- `style.css` → visual design and responsive layouts
- `index.html` → homepage structure
- `manifest.webmanifest` → PWA name/icons/display settings
- `sw.js` → cached assets and offline behaviour

---

## 🗺️ Suggested roadmap

### Phase 1 — Study foundation

- [x] Official 10-unit syllabus structure
- [x] Topic hierarchy
- [x] Notes workspace
- [x] Bookmarks
- [x] Progress tracking
- [x] MCQ workspace
- [x] Flashcards
- [x] JSON backup
- [x] Mobile/tablet responsive design
- [x] PWA support
- [x] Daily Study Cockpit

### Phase 2 — Exam intelligence

- [ ] Verified Psychology PYQ database
- [ ] Year/session filters
- [ ] Topic → PYQ mapping
- [ ] Difficulty tagging
- [ ] Question explanations
- [ ] Timed mock tests
- [ ] Weak-topic analysis

### Phase 3 — Cross-device platform

- [ ] User accounts
- [ ] Cloud synchronization
- [ ] Secure database
- [ ] Cross-device progress
- [ ] Personal study history
- [ ] Advanced analytics

---

## 🤝 Contributing / improving the content

If you add academic content, keep the distinction between:

1. **Source-derived syllabus content**
2. **Verified external/PYQ material**
3. **Generated learning aids**
4. **Personal notes or interpretations**

That separation makes the platform easier to audit and maintain.

---

## 📄 License / ownership note

No open-source license is currently declared for this project. Unless a license is added to the repository, treat the repository's original code/content as **all rights reserved** and do not assume permission to redistribute or commercially reuse it.

Third-party material, if added later, should retain its own copyright/license information.

---

## 🙌 Project goal

The long-term goal is to turn the official UGC NET Psychology syllabus into a practical personal learning system:

> **Understand → Recall → Practice → Verify → Revise → Master**

Built to grow from a static GitHub Pages project into a complete Psychology exam-preparation platform.
