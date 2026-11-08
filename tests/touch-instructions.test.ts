import { test } from "node:test";
import assert from "node:assert/strict";
import { worlds } from "../src/data.ts";

for (const world of worlds) {
  for (const lang of ["en", "ru"] as const) {
    test(`${world.id}: ${lang} touch instructions name real controls without keyboard-only commands`, () => {
      const text = world.touchInstructions[lang];
      assert.ok(text.length > 50 && text.length <= 170);
      assert.doesNotMatch(text, /\bE\b|WASD/);
      assert.match(text, lang === "en" ? /on-screen arrows/ : /[Ээ]кранн/);
      if (world.id === "tidebound") {
        assert.match(
          text,
          lang === "en" ? /Release them to wait/ : /Отпусти их/,
        );
      } else {
        assert.ok(text.includes(world.actionLabel[lang]));
        assert.match(
          world.instructions[lang],
          /\bE\b/,
          "Desktop keeps its keyboard instruction",
        );
      }
      assert.notEqual(text, world.instructions[lang]);
    });
  }
}
