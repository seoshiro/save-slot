import { chromium } from "@playwright/test";
import sharp from "sharp";
import fs from "node:fs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const samples = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(process.env.TEST_URL || "http://localhost:4197/");
  await page.locator(".open-button").hover();
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /OPEN BOX/ }).click();
  const start = Date.now();
  for (let i = 0; i < 9; i++) {
    await page.waitForTimeout(90);
    const buffer = await page.screenshot({ animations: "allow" });
    const { data } = await sharp(buffer)
      .extract({ left: 0, top: 250, width: 950, height: 450 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let coloured = 0;
    for (let j = 0; j < data.length; j += 3) {
      if (
        Math.max(data[j], data[j + 1], data[j + 2]) -
          Math.min(data[j], data[j + 1], data[j + 2]) >
        45
      )
        coloured++;
    }
    samples.push({ ms: Date.now() - start, colouredPixels: coloured });
    if (coloured < 500) {
      fs.writeFileSync("evidence/empty-transition-frame.png", buffer);
      throw Error("Visible objects disappeared in a sampled transition frame");
    }
  }
  await page
    .getByRole("button", { name: /Back to shelf/ })
    .first()
    .click();
  await page.waitForTimeout(1700);
} finally {
  await browser.close();
  fs.writeFileSync(
    "evidence/motion-qa.json",
    JSON.stringify(
      {
        samples,
        note: "Nine real browser screenshots sample the opening. Saturated object pixels detect the previously observed empty canvas during animated resize; this is not a claim about every presented frame.",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(samples));
}
