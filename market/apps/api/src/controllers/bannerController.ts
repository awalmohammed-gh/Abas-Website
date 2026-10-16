import type { Request, Response } from "express";
import { bannerInputSchema, type BannerInput } from "@aba-mart/shared";
import { Banner, type BannerDoc } from "../models/Banner.js";
import { assertOwnedImages, cleanupRemovedImages } from "../services/imageService.js";
import { revalidateStorefront } from "../services/revalidationService.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, setPublicCache } from "../utils/respond.js";
import { toBannerDTO } from "../utils/serialize.js";

const ORDER = { displayOrder: 1, createdAt: -1 } as const;

export async function listBanners(_req: Request, res: Response) {
  const banners = await Banner.find({ isActive: true }).sort(ORDER).limit(8).lean<BannerDoc[]>();
  setPublicCache(res, 60);
  sendSuccess(res, banners.map(toBannerDTO));
}

export async function adminListBanners(_req: Request, res: Response) {
  const banners = await Banner.find().sort(ORDER).lean<BannerDoc[]>();
  sendSuccess(res, banners.map(toBannerDTO));
}

export async function adminCreateBanner(req: Request, res: Response) {
  const input = req.body as BannerInput;
  assertOwnedImages([input.desktopImage, input.mobileImage], "image");
  const banner = await Banner.create(input);
  revalidateStorefront("banners");
  sendSuccess(res, toBannerDTO(banner.toObject()), 201);
}

export async function adminUpdateBanner(req: Request, res: Response) {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw ApiError.notFound("Banner not found.");
  const current = toBannerDTO(banner.toObject());

  const merged = bannerInputSchema.parse({
    title: current.title,
    description: current.description,
    desktopImage: current.desktopImage,
    mobileImage: current.mobileImage,
    buttonText: current.buttonText,
    buttonLink: current.buttonLink,
    displayOrder: current.displayOrder,
    isActive: current.isActive,
    ...(req.body as object),
  });
  assertOwnedImages([merged.desktopImage, merged.mobileImage], "image");

  banner.set(merged);
  await banner.save();
  cleanupRemovedImages([current.desktopImage, current.mobileImage], [merged.desktopImage, merged.mobileImage]);
  revalidateStorefront("banners");
  sendSuccess(res, toBannerDTO(banner.toObject()));
}

export async function adminDeleteBanner(req: Request, res: Response) {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw ApiError.notFound("Banner not found.");
  const current = toBannerDTO(banner.toObject());
  await banner.deleteOne();
  cleanupRemovedImages([current.desktopImage, current.mobileImage], []);
  revalidateStorefront("banners");
  sendSuccess(res, { id: current.id, deleted: true });
}
