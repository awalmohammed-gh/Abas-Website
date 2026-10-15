"use client";

import Image from "next/image";
import { useId, useRef, useState, type ChangeEvent } from "react";
import { FiArrowLeft, FiArrowRight, FiImage, FiTrash2, FiUploadCloud } from "react-icons/fi";
import type { ImageAsset, UploadFolder } from "@aba-mart/shared";
import { Spinner } from "@/components/ui/Spinner";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];

async function uploadFile(file: File, folder: UploadFolder): Promise<ImageAsset> {
  if (!ACCEPT.includes(file.type)) throw new Error(`${file.name}: use a JPEG, PNG, WebP or AVIF image.`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 5 MB.`);
  const form = new FormData();
  form.append("image", file);
  return api.post<ImageAsset>(`/admin/uploads?folder=${folder}`, form);
}

interface MultiProps {
  value: ImageAsset[];
  onChange: (images: ImageAsset[]) => void;
  folder: UploadFolder;
  max: number;
  hint?: string;
  error?: string;
}

/** Uploads straight to the API (which stores them in Cloudinary). The first image is the main image. */
export function ImageListUploader({ value, onChange, folder, max, hint, error }: MultiProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, max - value.length));
    event.target.value = "";
    if (!files.length) return;
    setUploadError(null);
    setUploading(files.length);
    const uploaded: ImageAsset[] = [];
    const failures: string[] = [];
    for (const file of files) {
      try {
        uploaded.push(await uploadFile(file, folder));
      } catch (e) {
        failures.push(errorMessage(e));
      }
      setUploading((n) => n - 1);
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
    if (failures.length) setUploadError(failures.join(" "));
  }

  const move = (index: number, delta: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {value.map((image, index) => (
          <li key={image.publicId} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-cream-200">
            <Image src={image.url} alt="" fill sizes="160px" className="object-cover" />
            {index === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">MAIN</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5">
              <div className="flex gap-1">
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-md bg-white/90 p-1.5 text-ink disabled:opacity-30" aria-label="Move image left">
                  <FiArrowLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded-md bg-white/90 p-1.5 text-ink disabled:opacity-30"
                  aria-label="Move image right"
                >
                  <FiArrowRight className="size-3.5" />
                </button>
              </div>
              <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} className="rounded-md bg-white/90 p-1.5 text-danger" aria-label="Remove image">
                <FiTrash2 className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <li key={`uploading-${i}`} className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-brand/40 bg-brand-50 text-brand">
            <Spinner label="Uploading" />
          </li>
        ))}
        {value.length + uploading < max && (
          <li>
            <label
              htmlFor={inputId}
              className={cn(
                "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center text-xs font-medium transition-colors",
                error ? "border-danger text-danger" : "border-line text-muted hover:border-brand hover:text-brand",
              )}
            >
              <FiUploadCloud className="size-6" aria-hidden="true" />
              Add image
            </label>
          </li>
        )}
      </ul>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT.join(",")}
        multiple
        className="sr-only"
        onChange={handleFiles}
        disabled={uploading > 0}
      />
      <p className="text-xs text-muted">{hint ?? `Up to ${max} images, 5 MB each. JPEG, PNG, WebP or AVIF. The first image is shown on product cards.`}</p>
      {(uploadError || error) && (
        <p className="text-xs font-medium text-danger" role="alert">
          {uploadError || error}
        </p>
      )}
    </div>
  );
}

interface SingleProps {
  label: string;
  value: ImageAsset | null;
  onChange: (image: ImageAsset | null) => void;
  folder: UploadFolder;
  hint?: string;
  aspect?: string;
  error?: string;
  required?: boolean;
}

export function SingleImageUploader({ label, value, onChange, folder, hint, aspect = "aspect-video", error, required }: SingleProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      onChange(await uploadFile(file, folder));
    } catch (e) {
      setUploadError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </p>
      <div className={cn("relative overflow-hidden rounded-xl border bg-cream-200", aspect, error ? "border-danger" : "border-line")}>
        {value ? (
          <Image src={value.url} alt="" fill sizes="480px" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted">
            <FiImage className="size-7" aria-hidden="true" />
            <span className="text-xs">No image</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-brand">
            <Spinner label="Uploading" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink hover:border-brand/40 hover:bg-brand-50"
        >
          <FiUploadCloud className="size-4" aria-hidden="true" /> {value ? "Replace" : "Upload"}
        </label>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-danger hover:bg-danger-50">
            <FiTrash2 className="size-4" aria-hidden="true" /> Remove
          </button>
        )}
      </div>
      <input id={inputId} type="file" accept={ACCEPT.join(",")} className="sr-only" onChange={handleFile} disabled={uploading} />
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {(uploadError || error) && (
        <p className="text-xs font-medium text-danger" role="alert">
          {uploadError || error}
        </p>
      )}
    </div>
  );
}
