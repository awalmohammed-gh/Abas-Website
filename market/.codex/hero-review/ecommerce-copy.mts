import { readFileSync, writeFileSync } from "node:fs";
import { env } from "../../apps/api/src/config/env.js";
import { connectMongoDB, disconnectMongoDB } from "../../config/mongodb.js";
import { Banner } from "../../apps/api/src/models/Banner.js";
import { revalidateStorefront } from "../../apps/api/src/services/revalidationService.js";

const originals = JSON.parse(readFileSync(new URL("./banners-before.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));
const copy = [
  {
    eyebrow: "The graphic tee collection",
    title: "Find your everyday statement.",
    description: "Make room for a tee with personality. Explore white, lilac and warm beige styles with tea-inspired artwork, music quotes, headphone graphics and playful character prints. Short sleeves and round necks make them easy to style with your favourite denim or shorts. Find your print, check available sizes and add an everyday favourite to your cart.",
    buttonText: "Shop graphic tees",
  },
  {
    eyebrow: "Everyday wardrobe essentials",
    title: "Your outfit starts here.",
    description: "Build your next look around the essentials. These plain white, grey and black tees feature short sleeves, round necks and a clean, print-free finish. Pair them with jeans, keep things casual with shorts or layer beneath an open shirt. Explore the collection, choose from the available colours and sizes, and order through WhatsApp.",
    buttonText: "Shop everyday tees",
  },
  {
    eyebrow: "Home care · Larger bottle",
    title: "Stock up on home essentials.",
    description: "Add Aba's multi-purpose liquid soap to your household shopping list. The larger yellow container pictured has a built-in carry handle and a red screw cap, with the product name displayed on its lemon-themed label. Explore our soap selection to check the available bottle sizes and current prices, then order through WhatsApp.",
    buttonText: "Shop liquid soap",
  },
  {
    eyebrow: "Home care · Smaller bottle",
    title: "A small everyday essential.",
    description: "Complete your household shop with the smaller Aba's multi-purpose liquid soap bottle. Its compact yellow packaging features a flip-top cap and a lemon-themed label, as shown in the banner. Browse the soap selection to check current availability, compare bottle sizes and confirm the price. Add to your cart and order on WhatsApp.",
    buttonText: "Shop liquid soap",
  },
];
for (const [index, item] of copy.entries()) {
  console.log(`Banner ${index + 1}: ${item.description.length} characters`);
  if (item.description.length > 350) throw new Error("Description exceeds 350 characters");
}
await connectMongoDB(env.mongo);
try {
  const banners = await Promise.all(originals.map((original) => Banner.findOne({ _id: original.id, "desktopImage.publicId": original.desktopImage.publicId })));
  if (banners.some((banner) => !banner)) throw new Error("A reviewed banner no longer matches");
  writeFileSync(new URL("./banners-ecommerce-before.json", import.meta.url), JSON.stringify(banners, null, 2));
  for (const [index, banner] of banners.entries()) {
    Object.assign(banner!, copy[index]);
    await banner!.save();
  }
  await revalidateStorefront("banners");
  console.log("Saved ecommerce banner copy.");
} finally {
  await disconnectMongoDB();
}
