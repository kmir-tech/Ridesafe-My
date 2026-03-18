const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const SVG_PATH = path.join(PUBLIC_DIR, "icon-192.svg");

async function generateIcons() {
  if (!fs.existsSync(SVG_PATH)) {
    console.error(`SVG not found at ${SVG_PATH}`);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(SVG_PATH);

  const icons = [
    { size: 192, filename: "icon-192.png" },
    { size: 512, filename: "icon-512.png" },
    { size: 180, filename: "apple-touch-icon.png" },
  ];

  for (const { size, filename } of icons) {
    const outputPath = path.join(PUBLIC_DIR, filename);
    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
    console.log(`Generated ${filename} (${size}x${size})`);
  }

  console.log("All icons generated successfully.");
}

generateIcons().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
