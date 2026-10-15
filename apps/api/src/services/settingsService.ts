import type { SettingsInput, StoreSettingsDTO } from "@aba-mart/shared";
import { env } from "../config/env.js";
import { SETTINGS_KEY, Settings, type SettingsDoc } from "../models/Settings.js";
import { toSettingsDTO } from "../utils/serialize.js";
import { assertOwnedImages, cleanupRemovedImages } from "./imageService.js";
import { revalidateStorefront } from "./revalidationService.js";

/** Returns the single store settings document, creating it with defaults on first use. */
export async function getSettingsDoc(): Promise<SettingsDoc> {
  const settings = await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY, whatsappNumber: env.STORE_WHATSAPP_NUMBER ?? "" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean<SettingsDoc>();
  if (!settings) throw new Error("Store settings could not be loaded");
  return settings;
}

export async function getSettings(): Promise<StoreSettingsDTO> {
  return toSettingsDTO(await getSettingsDoc());
}

export async function updateSettings(input: SettingsInput): Promise<StoreSettingsDTO> {
  assertOwnedImages([input.logo, input.favicon], "branding");
  const before = await getSettingsDoc();
  const updated = await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: input },
    { returnDocument: "after", runValidators: true },
  ).lean<SettingsDoc>();
  if (!updated) throw new Error("Store settings could not be saved");

  cleanupRemovedImages([before.logo, before.favicon], [updated.logo, updated.favicon]);
  revalidateStorefront("settings");
  return toSettingsDTO(updated);
}
