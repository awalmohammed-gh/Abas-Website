import sharp from "sharp";
import { fileURLToPath } from "node:url";

const directory = new URL("../apps/web/public/icons/", import.meta.url);
for (const app of ["store", "admin"]) {
  const source = new URL(`${app}-512x512.png`, directory);
  const size = app === "admin" ? 156 : 180;
  const logo = await sharp(fileURLToPath(source)).resize(size, size).flatten({ background: "#ffffff" }).removeAlpha().png().toBuffer();
  const output = new URL(`${app}-apple-icon-180.png`, directory);
  await sharp({ create: { width: 180, height: 180, channels: 3, background: app === "admin" ? "#0b261e" : "#ffffff" } })
    .composite([{ input: logo, gravity: "centre" }]).removeAlpha().png().toFile(fileURLToPath(output));
  const metadata = await sharp(fileURLToPath(output)).metadata();
  if (metadata.width !== 180 || metadata.height !== 180 || metadata.hasAlpha) throw new Error(`Invalid ${app} Apple icon`);
  console.log(`${app}: 180x180 opaque PNG`);
}
