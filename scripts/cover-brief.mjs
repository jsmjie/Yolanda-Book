import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateContent } from "./validate-content.mjs";

function fromRoot(rootUrlOrPath, relativePath = "") {
  const rootPath =
    rootUrlOrPath instanceof URL ? fileURLToPath(rootUrlOrPath) : rootUrlOrPath;
  return path.resolve(rootPath, relativePath);
}

function bookDirectory(bookPath) {
  return bookPath.split("/").slice(0, -1).join("/");
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_`[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

async function readChapterText(rootPath, book, chapter) {
  const chapterPath = fromRoot(rootPath, `${bookDirectory(book.path)}/${chapter.file}`);
  const markdown = await readFile(chapterPath, "utf8");
  return stripMarkdown(markdown);
}

export async function createCoverBrief(
  rootUrlOrPath = pathToFileURL(`${process.cwd()}/`),
  slug
) {
  const rootPath = fromRoot(rootUrlOrPath);
  const validation = await validateContent(rootPath);

  if (!validation.ok) {
    throw new Error(`Content is invalid: ${validation.errors.join("; ")}`);
  }

  const book = validation.books.find((item) => item.slug === slug);

  if (!book) {
    throw new Error(`Book not found: ${slug}`);
  }

  const mode = book.cover?.mode ?? "auto";
  const chapterTexts = await Promise.all(
    book.chapters.slice(0, 3).map((chapter) => readChapterText(rootPath, book, chapter))
  );
  const contentSignals = excerpt(
    [book.summary, ...chapterTexts].filter(Boolean).join(" "),
    1200
  );
  const outputPath = book.cover?.image ?? `assets/covers/${book.slug}.png`;
  const prompt = [
    "Use case: illustration-story",
    "Asset type: public book cover for the Yolanda Book website",
    `Cover mode: ${mode}`,
    `Required output path: ${outputPath}`,
    `Book title: ${book.title}`,
    book.subtitle ? `Subtitle: ${book.subtitle}` : "",
    `Author: ${book.author}`,
    `Content signals: ${contentSignals}`,
    "Primary request: Create a polished portrait-format book cover based on the book content, suitable for a literary children's or young-reader story site.",
    "Composition: clear central visual, strong title area, readable thumbnail silhouette, no clutter.",
    "Style: warm editorial illustration with handcrafted storybook texture, refined enough for a production website.",
    "Avoid: stock-photo look, generic fantasy symbols, unreadable text, watermarks, unrelated characters, and dark muddy contrast."
  ]
    .filter(Boolean)
    .join("\n");

  return {
    slug: book.slug,
    mode,
    outputPath,
    prompt
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const slug = process.argv[2];

  if (!slug) {
    console.error("Usage: npm run cover:brief -- <book-slug>");
    process.exitCode = 1;
  } else {
    const brief = await createCoverBrief(pathToFileURL(`${process.cwd()}/`), slug);
    console.log(brief.prompt);
  }
}
