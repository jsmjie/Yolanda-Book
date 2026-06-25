# Yolanda Book

Yolanda Book is a small production MVP for publishing books from GitHub to Vercel.
It has no login, database, or in-browser write access. The source of truth is this
repository: edit local content files with Codex, validate them, commit, push, and
let Vercel redeploy the static site.

- Live site: <https://yolanda-book.vercel.app>
- GitHub repo: <https://github.com/jsmjie/Yolanda-Book>

## Local Workflow

```bash
npm test
npm run dev
```

Open `http://localhost:4173`.

## Publish Workflow

1. Add or edit a book under `content/books/<book-slug>/`.
2. Add the book entry to `content/books.json`.
3. Run `npm test`.
4. Commit and push to GitHub.
5. Redeploy production:

```bash
npx vercel@latest deploy --prod --yes
```

## Content Model

Each book has a `book.json` file:

```json
{
  "slug": "example-book",
  "title": "Example Book",
  "subtitle": "A short subtitle",
  "author": "Yolanda Book Studio",
  "status": "published",
  "summary": "One sentence summary.",
  "cover": {
    "image": "assets/covers/example-book.svg",
    "accent": "#4f8f8b"
  },
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "file": "chapter-01.md"
    }
  ],
  "publishedAt": "2026-06-26",
  "updatedAt": "2026-06-26"
}
```

Only books with `status: "published"` are listed when at least one published book
exists. Draft files remain in GitHub but stay out of the public catalog list.

## Validation

`npm test` checks:

- `content/books.json` is valid.
- Book slugs are unique lowercase kebab-case.
- Book metadata has required fields.
- Chapter files exist and contain publishable text.
- Optional cover images exist.

## Vercel Settings

Use these settings when importing the GitHub repo into Vercel:

- Framework preset: Other
- Build command: `npm run build`
- Output directory: `.`
- Install command: leave blank or use `npm install`

The app is static, so no environment variables are required.

To enable automatic deployments from GitHub pushes, connect the Vercel project to
the repo after the Vercel GitHub App has access to `jsmjie/Yolanda-Book`:

```bash
npx vercel@latest git connect https://github.com/jsmjie/Yolanda-Book.git --yes
```
