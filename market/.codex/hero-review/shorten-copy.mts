import { readFileSync, writeFileSync } from "node:fs";
import { env } from "../../apps/api/src/config/env.js";
import { connectMongoDB, disconnectMongoDB } from "../../config/mongodb.js";
import { Banner } from "../../apps/api/src/models/Banner.js";
import { revalidateStorefront } from "../../apps/api/src/services/revalidationService.js";

const originals = JSON.parse(readFileSync(new URL("./banners-before.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));
const descriptions = [
  "Add personality to your everyday outfits with graphic tees in white, soft lilac and warm beige. The five styles pictured feature tea-inspired artwork, a music quote, headphones and playful character prints, all with short sleeves and round necks. Pair your favourite with jeans or shorts, and browse the collection for available designs and sizes.",
  "Keep your everyday wardrobe simple with the plain tees pictured on this rail. Six short-sleeved, round-neck T-shirts alternate between white, grey and black, with a clean, print-free finish. Wear these neutral styles with denim or shorts, or layer one beneath an open shirt. Browse our T-shirts and tops for available colours, styles and sizes.",
  "Aba's larger multi-purpose liquid soap comes in the bright yellow container shown here, with a red screw cap and a built-in carry handle. Lemons, green leaves and floating bubbles surround the bottle beside stacked dishes in a sunny kitchen scene. The artwork shows GH\u20b520; browse our soap selection to confirm the current price and availability.",
  "Discover the smaller bottle of Aba's multi-purpose liquid soap, pictured in compact yellow packaging with a flip-top cap. Lemons, green leaves, splashing water and bubbles frame the bottle beside a stack of dishes, giving the artwork a fresh kitchen theme. Shown at GH\u20b57 in the image; browse our soap selection to confirm the price and availability.",
];
for (const [index, description] of descriptions.entries()) {
  console.log(`Banner ${index + 1}: ${description.length} characters`);
  if (description.length > 350) throw new Error("Description exceeds 350 characters");
}
await connectMongoDB(env.mongo);
try {
  const banners = await Promise.all(originals.map((original) => Banner.findOne({ _id: original.id, "desktopImage.publicId": original.desktopImage.publicId })));
  if (banners.some((banner) => !banner)) throw new Error("A reviewed banner no longer matches");
  writeFileSync(new URL("./banners-shortened-before.json", import.meta.url), JSON.stringify(banners, null, 2));
  for (const [index, banner] of banners.entries()) {
    banner!.description = descriptions[index];
    await banner!.save();
  }
  await revalidateStorefront("banners");
  console.log("All four descriptions saved.");
} finally {
  await disconnectMongoDB();
}
