import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { validateContent } from "../scripts/validate-content.mjs";

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function makeBookFixture(book) {
  const root = await mkdtemp(path.join(tmpdir(), "yolanda-book-test-"));
  const bookDir = path.join(root, "content/books/missing-cover");

  await mkdir(bookDir, { recursive: true });
  await writeJson(path.join(root, "content/books.json"), {
    books: [
      {
        slug: "missing-cover",
        path: "content/books/missing-cover/book.json"
      }
    ]
  });
  await writeJson(path.join(bookDir, "book.json"), book);
  await writeFile(
    path.join(bookDir, "chapter-01.md"),
    "# Start\n\nThis chapter has enough text to pass validation for the book fixture.\n"
  );

  return root;
}

describe("content validation", () => {
  it("accepts the published starter book and its chapter files", async () => {
    const result = await validateContent(new URL("../", import.meta.url));

    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
    assert.equal(result.books.length, 1);
    assert.equal(result.books[0].slug, "yolanda-starter");
    assert.equal(result.books[0].chapters.length, 2);
  });

  it("rejects a book without a cover image", async () => {
    const root = await makeBookFixture({
      slug: "missing-cover",
      title: "Missing Cover",
      author: "Yolanda Book Studio",
      status: "published",
      summary: "A fixture book that intentionally has no cover image.",
      chapters: [
        {
          number: 1,
          title: "Start",
          file: "chapter-01.md"
        }
      ],
      publishedAt: "2026-06-26",
      updatedAt: "2026-06-26"
    });

    const result = await validateContent(root);

    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((error) => error.includes("cover.image is required")),
      `Expected cover error, received: ${result.errors.join("; ")}`
    );
  });
});
