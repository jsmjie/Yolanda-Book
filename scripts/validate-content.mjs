import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = new Set(["draft", "published"]);

function fromRoot(rootUrlOrPath, relativePath = "") {
  const rootPath =
    rootUrlOrPath instanceof URL ? fileURLToPath(rootUrlOrPath) : rootUrlOrPath;
  return path.resolve(rootPath, relativePath);
}

function safeRelativePath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.split(/[\\/]/).includes("..")
  );
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function requireString(errors, value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${label} must be a non-empty string`);
  }
}

function validateDate(errors, value, label) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    errors.push(`${label} must use YYYY-MM-DD`);
  }
}

async function validateBook(rootPath, entry, seenSlugs, index) {
  const errors = [];

  if (!safeRelativePath(entry?.path)) {
    errors.push(`books[${index}].path must be a safe relative path`);
    return { book: null, errors };
  }

  const bookPath = fromRoot(rootPath, entry.path);
  const bookDir = path.dirname(bookPath);
  let book;

  try {
    book = await readJson(bookPath);
  } catch (error) {
    errors.push(`${entry.path} could not be read as JSON: ${error.message}`);
    return { book: null, errors };
  }

  requireString(errors, book.slug, `${entry.path}: slug`);
  requireString(errors, book.title, `${entry.path}: title`);
  requireString(errors, book.author, `${entry.path}: author`);
  requireString(errors, book.summary, `${entry.path}: summary`);

  if (book.slug !== entry.slug) {
    errors.push(`${entry.path}: slug must match books.json entry`);
  }

  if (!SLUG_PATTERN.test(book.slug ?? "")) {
    errors.push(`${entry.path}: slug must be lowercase kebab-case`);
  }

  if (seenSlugs.has(book.slug)) {
    errors.push(`${entry.path}: duplicate slug "${book.slug}"`);
  } else {
    seenSlugs.add(book.slug);
  }

  if (!VALID_STATUSES.has(book.status)) {
    errors.push(`${entry.path}: status must be draft or published`);
  }

  validateDate(errors, book.publishedAt, `${entry.path}: publishedAt`);
  validateDate(errors, book.updatedAt, `${entry.path}: updatedAt`);

  if (!Array.isArray(book.chapters) || book.chapters.length === 0) {
    errors.push(`${entry.path}: chapters must contain at least one chapter`);
  } else {
    const chapterNumbers = new Set();

    for (const chapter of book.chapters) {
      if (!Number.isInteger(chapter.number) || chapter.number < 1) {
        errors.push(`${entry.path}: chapter number must be a positive integer`);
      }

      if (chapterNumbers.has(chapter.number)) {
        errors.push(`${entry.path}: duplicate chapter number ${chapter.number}`);
      } else {
        chapterNumbers.add(chapter.number);
      }

      requireString(errors, chapter.title, `${entry.path}: chapter title`);

      if (!safeRelativePath(chapter.file) || !chapter.file.endsWith(".md")) {
        errors.push(`${entry.path}: chapter file must be a safe .md path`);
        continue;
      }

      const chapterPath = path.resolve(bookDir, chapter.file);
      if (!(await fileExists(chapterPath))) {
        errors.push(`${entry.path}: missing chapter file ${chapter.file}`);
      } else {
        const chapterText = await readFile(chapterPath, "utf8");
        if (chapterText.trim().length < 40) {
          errors.push(`${entry.path}: ${chapter.file} is too short to publish`);
        }
      }
    }
  }

  if (!book.cover || typeof book.cover !== "object") {
    errors.push(`${entry.path}: cover.image is required`);
  } else if (!book.cover.image) {
    errors.push(`${entry.path}: cover.image is required`);
  } else if (!safeRelativePath(book.cover.image)) {
    errors.push(`${entry.path}: cover.image must be a safe relative path`);
  } else {
    const imagePath = fromRoot(rootPath, book.cover.image);
    if (!(await fileExists(imagePath))) {
      errors.push(`${entry.path}: missing cover image ${book.cover.image}`);
    }
  }

  return { book: { ...book, path: entry.path }, errors };
}

export async function validateContent(rootUrlOrPath = pathToFileURL(`${process.cwd()}/`)) {
  const rootPath = fromRoot(rootUrlOrPath);
  const errors = [];
  let index;

  try {
    index = await readJson(fromRoot(rootPath, "content/books.json"));
  } catch (error) {
    return {
      ok: false,
      errors: [`content/books.json could not be read: ${error.message}`],
      books: []
    };
  }

  if (!Array.isArray(index.books)) {
    return {
      ok: false,
      errors: ["content/books.json must contain a books array"],
      books: []
    };
  }

  const seenSlugs = new Set();
  const books = [];

  for (const [bookIndex, entry] of index.books.entries()) {
    if (!entry || typeof entry !== "object") {
      errors.push(`books[${bookIndex}] must be an object`);
      continue;
    }

    requireString(errors, entry.slug, `books[${bookIndex}].slug`);
    const result = await validateBook(rootPath, entry, seenSlugs, bookIndex);
    errors.push(...result.errors);

    if (result.book) {
      books.push(result.book);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    books
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await validateContent();

  if (!result.ok) {
    console.error("Content validation failed:");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Content validation passed for ${result.books.length} book(s).`);
  }
}
