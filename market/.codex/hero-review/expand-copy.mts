import { readFileSync, writeFileSync } from "node:fs";
import { env } from "../../apps/api/src/config/env.js";
import { connectMongoDB, disconnectMongoDB } from "../../config/mongodb.js";
import { Banner } from "../../apps/api/src/models/Banner.js";
import { revalidateStorefront } from "../../apps/api/src/services/revalidationService.js";

const originals = JSON.parse(readFileSync(new URL("./banners-before.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));
const descriptions = [
  "Bring a little personality to your everyday outfits with the graphic tees pictured here. Five short-sleeved, round-neck styles hang side by side in white, soft lilac and warm beige, featuring tea-inspired artwork, a music quote, headphones and playful character prints. Choose a design that reflects your interests, then pair it with jeans or shorts for a relaxed look. Browse the collection to check available styles and sizes.",
  "Build your everyday outfits around the plain tees shown on this rail. The six T-shirts alternate between crisp white, grey and black, with short sleeves, round necklines and a simple, print-free finish. Their neutral colours give you plenty of styling options: wear one with denim, team it with shorts or layer it beneath an open shirt. Explore our T-shirts and tops to see the colours, sizes and styles currently available.",
  "Meet the larger container of Aba's multi-purpose liquid soap, pictured in a bright yellow bottle with a red screw cap and a built-in carry handle. Lemon slices, green leaves, floating bubbles and a stack of dishes frame the kitchen scene, while the label identifies the product as multi-purpose liquid soap. The artwork advertises this larger option at GH\u20b520. Open the soap selection to check current availability and confirm the size and price before ordering.",
  "Take a closer look at the smaller Aba's multi-purpose liquid soap bottle. Its compact yellow packaging has a flip-top cap, with the product name clearly displayed on the front. Lemons, green leaves, splashing water and soap bubbles surround the bottle beside a stack of dishes, continuing the fresh kitchen theme. The artwork advertises this smaller option at GH\u20b57. Browse the soap selection to check current availability and confirm the size and price before ordering.",
];

await connectMongoDB(env.mongo);
try {
  const banners = await Promise.all(originals.map((original) => Banner.findOne({ _id: original.id, "desktopImage.publicId": original.desktopImage.publicId })));
  if (banners.some((banner) => !banner) || descriptions.some((description) => description.length > 600)) throw new Error("Banner or description validation failed");
  writeFileSync(new URL("./banners-expanded-before.json", import.meta.url), JSON.stringify(banners, null, 2));
  for (const [index, banner] of banners.entries()) {
    banner!.description = descriptions[index];
    await banner!.save();
    console.log(`Expanded banner ${index + 1}: ${descriptions[index].length} characters`);
  }
  await revalidateStorefront("banners");
} finally {
  await disconnectMongoDB();
}
