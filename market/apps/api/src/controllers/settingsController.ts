import type { Request, Response } from "express";
import type { SettingsInput } from "@aba-mart/shared";
import * as settingsService from "../services/settingsService.js";
import { sendSuccess, setPublicCache } from "../utils/respond.js";

/** Everything here is safe to show customers; secrets never live in settings. */
export async function getPublicSettings(_req: Request, res: Response) {
  setPublicCache(res, 60);
  sendSuccess(res, await settingsService.getSettings());
}

export async function adminGetSettings(_req: Request, res: Response) {
  sendSuccess(res, await settingsService.getSettings());
}

export async function adminUpdateSettings(req: Request, res: Response) {
  sendSuccess(res, await settingsService.updateSettings(req.body as SettingsInput));
}
