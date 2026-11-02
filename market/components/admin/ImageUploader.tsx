"use client";

import Image from "next/image";
import { useId, useRef, useState, type ChangeEvent } from "react";
import { FiArrowLeft, FiArrowRight, FiImage, FiTrash2, FiUploadCloud } from "react-icons/fi";
import type { ImageAsset, UploadFolder } from "@aba-mart/shared";
import { Spinner } from "@/components/ui/Spinner";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];

async function uploadFile(file: File, folder: UploadFolder): Promise<ImageAsset> {
  if (!ACCEPT.includes(file.type)) throw new Error(`${file.name}: use a JPEG, PNG, WebP or AVIF image.`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 4 MB.`);
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
  const [selected, setSelected] = useState(0);

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
    if (uploaded.length) {
      onChange([...value, ...uploaded]);
      // Show the first new photo large straight away.
      setSelected(value.length);
    }
    if (failures.length) setUploadError(failures.join(" "));
  }

  // The large preview follows a chosen photo; it falls back to the main photo after removals.
  const shown = Math.min(selected, Math.max(0, value.length - 1));
  const current = value[shown];

  const move = (index: number, delta: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    onChange(next);
    setSelected(index + delta);
  };

  const control = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white/95 px-2.5 text-xs font-semibold text-ink shadow-sm transition-colors hover:bg-white disabled:opacity-35";
  const addTile = (big: boolean) => (
    <label
      htmlFor={inputId}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center font-medium transition-colors",
        big ? "aspect-[4/3] text-sm" : "aspect-square text-[11px]",
        error ? "border-danger text-danger" : "border-line text-muted hover:border-brand hover:text-brand",
      )}
    >
      <FiUploadCloud className={big ? "size-8" : "size-5"} aria-hidden="true" />
      {big ? "Add product photos" : "Add"}
    </label>
  );

  return (
    <div className="space-y-3">
      {current ? (
        <figure className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-xl border border-line bg-white">
          <Image src={current.url} alt={`Photo ${shown + 1} of ${value.length}`} fill sizes="420px" className="object-contain" />
          {shown === 0 && <span className="absolute left-2 top-2 rounded-md bg-brand px-2 py-1 text-[11px] font-bold text-white">MAIN PHOTO</span>}
          <span className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">{shown + 1} / {value.length}</span>
          <figcaption className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-1.5 bg-gradient-to-t from-black/55 to-transparent p-2 pt-8">
            <span className="flex gap-1.5">
              <button type="button" disabled={shown === 0} onClick={() => move(shown, -1)} className={control} aria-label="Move photo left"><FiArrowLeft className="size-4" /></button>
              <button type="button" disabled={shown === value.length - 1} onClick={() => move(shown, 1)} className={control} aria-label="Move photo right"><FiArrowRight className="size-4" /></button>
              {shown > 0 && <button type="button" onClick={() => move(shown, -shown)} className={control}>Set as main</button>}
            </span>
            <button type="button" onClick={() => onChange(value.filter((_, i) => i !== shown))} className={cn(control, "text-danger")}>
              <FiTrash2 className="size-4" aria-hidden="true" />Remove
            </button>
          </figcaption>
        </figure>
      ) : uploading ? (
        <div className="mx-auto flex aspect-[4/3] w-full max-w-[420px] items-center justify-center rounded-xl border border-dashed border-brand/40 bg-brand-50 text-brand"><Spinner label="Uploading" /></div>
      ) : (
        addTile(true)
      )}

      {(value.length > 0 || uploading > 0) && (
        <ul className="grid grid-cols-4 gap-2" aria-label="Product photos">
          {value.map((image, index) => (
            <li key={image.publicId}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Preview photo ${index + 1}${index === 0 ? " (main)" : ""}`}
                aria-pressed={index === shown}
                className={cn("relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-white transition-colors", index === shown ? "border-brand" : "border-line hover:border-brand/50")}
              >
                <Image src={image.url} alt="" fill sizes="96px" className="object-contain" />
                {index === 0 && <span className="absolute inset-x-0 bottom-0 bg-brand py-0.5 text-center text-[9px] font-bold text-white">MAIN</span>}
              </button>
            </li>
          ))}
          {Array.from({ length: value.length ? uploading : 0 }, (_, i) => (
            <li key={`uploading-${i}`} className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-brand/40 bg-brand-50 text-brand">
              <Spinner label="Uploading" />
            </li>
          ))}
          {value.length > 0 && value.length + uploading < max && <li>{addTile(false)}</li>}
        </ul>
      )}
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
      <p className="text-xs text-muted">{hint ?? `Up to ${max} images, 4 MB each. JPEG, PNG, WebP or AVIF. The first image is shown on product cards.`}</p>
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
