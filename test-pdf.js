import puppeteer from "puppeteer";
import fs from "fs";

const browser = await puppeteer.launch({
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setContent("<h1>Test PDF</h1><p>If you can read this, Puppeteer works.</p>");
const buffer = await page.pdf({ format: "A4" });
fs.writeFileSync("test-output.pdf", buffer);
await browser.close();
console.log("Done — check test-output.pdf, size:", buffer.length, "bytes");