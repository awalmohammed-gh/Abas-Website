import { readFileSync } from "node:fs";
import { env } from "../../apps/api/src/config/env.js";
import { connectMongoDB, disconnectMongoDB } from "../../config/mongodb.js";
import { Banner } from "../../apps/api/src/models/Banner.js";
import { revalidateStorefront } from "../../apps/api/src/services/revalidationService.js";

const before = JSON.parse(readFileSync(new URL("./banners-before.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));
const copy = [
  {
    description: "White, lilac and warm beige tees with tea, music, headphone and playful character prints. The short sleeves and round necks make these graphic styles easy to pair with your favourite jeans or shorts.",
    alt: "Five white, lilac and beige short-sleeved T-shirts on wooden hangers, with tea, music, headphone and cartoon prints.",
  },
  {
    description: "Plain white, grey and black tees with round necks and short sleeves, shown on a clothing rail. These simple, print-free styles pair easily with jeans or shorts, or layer under an open shirt.",
    alt: "Six plain short-sleeved T-shirts in white, grey and black on wooden hangers along a white clothing rail against a tan wall.",
  },
  {
    description: "The larger yellow container of Aba's multi-purpose liquid soap has a built-in carry handle and a red screw cap. Pictured with lemons, bubbles and stacked dishes, the bottle is advertised at GH\u20b520.",
    alt: "Large yellow Aba's multi-purpose liquid soap container with a carry handle and red cap, surrounded by lemons and bubbles; artwork shows GH\u20b520.",
  },
  {
    description: "The smaller bottle of Aba's multi-purpose liquid soap comes with a yellow flip-top cap. Shown with lemons, green leaves and soap bubbles beside stacked dishes, this compact option is advertised at GH\u20b57.",
    alt: "Small yellow Aba's multi-purpose liquid soap bottle with a flip-top cap, surrounded by lemons, green leaves and bubbles; artwork shows GH\u20b57.",
  },
];

await connectMongoDB(env.mongo);
try {
  for (const [index, original] of before.entries()) {
    const update = copy[index];
    if (!update || update.description.length > 220 || update.alt.length > 160) throw new Error("Copy exceeds banner limits");
    const banner = await Banner.findOne({ _id: original.id, "desktopImage.publicId": original.desktopImage.publicId });
    if (!banner || banner.description !== original.description) throw new Error("Banner changed since review; refusing to overwrite");
    banner.description = update.description;
    banner.desktopImage.alt = update.alt;
    if (banner.mobileImage) banner.mobileImage.alt = update.alt;
    await banner.save();
    console.log(`Updated banner ${index + 1}: ${banner.title}`);
  }
  await revalidateStorefront("banners");
} finally {
  await disconnectMongoDB();
}
