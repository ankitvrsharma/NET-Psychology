# Beginner maintenance guide

You do not need to learn web development to use the project.

### When you want a change
Tell ChatGPT what you want, for example:

> Add Unit 2 content from the supplied books.

> Populate the PYQs from this PDF.

> Change the revision rule.

> Redesign the home page without adding more features.

ChatGPT can produce a replacement repository ZIP. You then upload/replace the files on GitHub.

### Files you normally do not need to edit
- `app.js`
- `styles.css`
- `sw.js`
- `manifest.webmanifest`

### Content
`content.js` is deliberately separate from application logic so content population can grow without redesigning the whole website.

### Important
Do not place learner progress into GitHub files. It belongs to the learner's device.
