import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCoverBrief } from "../scripts/cover-brief.mjs";

describe("cover brief generation", () => {
  it("builds a Codex cover brief from book content", async () => {
    const brief = await createCoverBrief(
      new URL("../", import.meta.url),
      "yolanda-starter"
    );

    assert.equal(brief.slug, "yolanda-starter");
    assert.equal(brief.mode, "auto");
    assert.equal(brief.outputPath, "assets/covers/yolanda-starter.svg");
    assert.match(brief.prompt, /Yolanda and the Book of Windows/);
    assert.match(brief.prompt, /floating library/);
    assert.match(brief.prompt, /book cover/i);
  });
});
