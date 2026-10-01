import test from "node:test";
import assert from "node:assert/strict";
import { createTranslator } from "../src/lib/i18n/shared.ts";

test("Dutch translates core navigation and English preserves the source", () => {
  const nl = createTranslator("nl");
  const en = createTranslator("en");
  for (const [source, translated] of [["Tasks", "Taken"], ["Settings", "Instellingen"], ["Calendar", "Agenda"], ["Daily gratitude", "Dagelijkse dankbaarheid"]]) {
    assert.equal(nl(source), translated);
    assert.equal(en(source), source);
  }
});
test("unrecognized content stays untouched and preferences remain independent", () => {
  assert.equal(createTranslator("nl")("Jason's personal message"), "Jason's personal message");
  assert.equal(createTranslator("nl").locale, "nl");
  assert.equal(createTranslator("en")("Save language"), "Save language");
});
