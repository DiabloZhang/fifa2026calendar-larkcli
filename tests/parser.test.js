import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { extractMatches, translatePlaceholder } from "../src/parser.js";

test("extract group-stage matches with finished score titles", async () => {
  const text = await readFile(new URL("./fixtures/group-a.txt", import.meta.url), "utf8");
  const matches = extractMatches("group-A", text);

  assert.equal(matches[0].summary, "🇲🇽墨西哥 2-0 南非🇿🇦");
  assert.equal(matches[1].summary, "🇰🇷韩国 2-1 捷克🇨🇿");
  assert.equal(matches[0].startTime.timezone, "America/Mexico_City");
});

test("extract knockout placeholders as future titles", async () => {
  const text = await readFile(new URL("./fixtures/knockout.txt", import.meta.url), "utf8");
  const matches = extractMatches("knockout", text);

  assert.equal(matches[0].summary, "A组第2 vs B组第2");
  assert.equal(matches[1].summary, "E组第1 vs A/B/C/D/F组第3");
});

test("translate placeholders", () => {
  assert.equal(translatePlaceholder("Winner Match 74"), "胜者（第74场）");
  assert.equal(translatePlaceholder("3rd Group C/E/F/H/I"), "C/E/F/H/I组第3");
});
