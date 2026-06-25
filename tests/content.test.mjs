import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateContent } from "../scripts/validate-content.mjs";

describe("content validation", () => {
  it("accepts the published starter book and its chapter files", async () => {
    const result = await validateContent(new URL("../", import.meta.url));

    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
    assert.equal(result.books.length, 1);
    assert.equal(result.books[0].slug, "yolanda-starter");
    assert.equal(result.books[0].chapters.length, 2);
  });
});
