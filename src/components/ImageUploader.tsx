"use client";
import { useEffect, useRef, useState } from "react";
import { resolveImageSrc } from "@/lib/images";
import { cx } from "@/lib/format";
import { fileToWebp, MAX_BYTES } from "@/lib/imgtool";
import { useLang } from "@/lib/i18n";
import type { UploadedImg } from "@/lib/types";

/**
 * Reusable admin uploader: drag-drop / picker, ≤5 MB, aspect-preset center crop,
 * WebP compression, EN/FI alt text (required), replace/delete.
 * STUB → POST /api/uploads (swap body for S3/Cloudinary/Uploadthing later).
 */
export default function ImageUploader({
  value,
  onChange,
  preset,
}: {
  value?: UploadedImg;
  onChange: (img: UploadedImg | null) => void;
  preset: "1:1" | "16:9";
}) {
  const { t } = useLang();
  const [altEn, setAltEn] = useState(value?.altEn ?? "");
  const [altFi, setAltFi] = useState(value?.altFi ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!value) return;
    setAltEn(value.altEn ?? "");
    setAltFi(value.altFi ?? "");
  }, [value?.src, value?.altEn, value?.altFi]);

  const handle = async (file: File | undefined | null) => {
    setErr("");
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setErr("Max 5 MB");
      return;
    }
    if (!altEn.trim() || !altFi.trim()) {
      setErr(t("admin.altEn") + " & " + t("admin.altFi") + " required");
      return;
    }
    setBusy(true);
    try {
      // STUB → POST /api/uploads (swap the data URL for an S3/Cloudinary key later)
      const src = await fileToWebp(file, preset);
      onChange({ src, altEn: altEn.trim(), altFi: altFi.trim() });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input value={altEn} onChange={(e) => setAltEn(e.target.value)} placeholder={t("admin.altEn") + " *"} className="min-h-[36px] w-40 rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
        <input value={altFi} onChange={(e) => setAltFi(e.target.value)} placeholder={t("admin.altFi") + " *"} className="min-h-[36px] w-40 rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
      </div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handle(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        className={cx(
          "grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-cherry/25 bg-cream p-3 text-center text-xs font-bold text-cherry/60 transition hover:border-gold",
          preset === "1:1" ? "h-28 w-28 rounded-full" : "h-24 w-44"
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveImageSrc(value.src) ?? value.src} alt={value.altEn} className={cx("h-full w-full object-cover", preset === "1:1" ? "rounded-full" : "rounded-lg")} />
        ) : busy ? (
          "…"
        ) : (
          <span>{t("admin.upload")}<br />({preset})</span>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      </div>
      {err && <p className="text-xs font-bold text-brick">{err}</p>}
      {value && (
        <button onClick={() => onChange(null)} className="text-xs font-black text-brick underline">
          Delete / replace
        </button>
      )}
    </div>
  );
}
