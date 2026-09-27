// Builds the PNG app icons from public/icons/icon.svg.
import sharp from "sharp";
import { readFileSync } from "node:fs";
const svg = readFileSync("public/icons/icon.svg");
await sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(svg).resize(180, 180).flatten({ background: "#eaf0e3" }).png().toFile("public/icons/apple-touch-icon.png");
// Maskable: full-bleed background with the leaf inside the safe zone.
const maskable = readFileSync("public/icons/icon.svg", "utf8").replace('rx="112"', 'rx="0"').replace("scale(9.5)", "scale(7.2)");
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");
