/**
 * Client-side image prep shared by the admin uploader and the ZIP bulk import:
 * center-crop to an aspect preset, downscale, encode WebP.
 */
export type Preset = "1:1" | "16:9";

export const MAX_BYTES = 5 * 1024 * 1024;

export function fileToWebp(file: Blob, preset: Preset, maxW = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new window.Image();
    im.onload = () => {
      const target = preset === "1:1" ? 1 : 16 / 9;
      let sw = im.width,
        sh = im.height,
        sx = 0,
        sy = 0;
      if (sw / sh > target) {
        sw = sh * target;
        sx = (im.width - sw) / 2;
      } else {
        sh = sw / target;
        sy = (im.height - sh) / 2;
      }
      const outW = Math.min(maxW, Math.round(sw));
      const outH = Math.round(outW / target);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      canvas.getContext("2d")!.drawImage(im, sx, sy, sw, sh, 0, 0, outW, outH);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("encode failed"));
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(new Error("read failed"));
          r.readAsDataURL(blob);
        },
        "image/webp",
        0.85
      );
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not an image"));
    };
    im.src = url;
  });
}

/** "Tropicana.webp" / "pizza/tropicana.jpg" → "tropicana" */
export function slugFromFilename(name: string): string {
  const base = name.split("/").pop() ?? name;
  return base
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
