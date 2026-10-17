/**
 * Client-side image prep shared by the admin uploader:
 * center-crop to an aspect preset, downscale, encode WebP.
 */
export type Preset = "1:1" | "16:9";

export const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Encode straight to a Blob. Prefer this over the data-URL variant: reading the
 * canvas result back as `data:` and then `fetch()`-ing it is blocked by the
 * site's CSP (`connect-src` does not — and should not — allow `data:`), and it
 * would inflate the payload by ~33% for nothing. The upload endpoint takes the
 * Blob body as-is.
 */
export function fileToWebpBlob(file: Blob, preset: Preset, maxW = 1200): Promise<Blob> {
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
          resolve(blob);
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

/** Data-URL variant, kept for previews. Do not `fetch()` the result: CSP blocks
    `data:` under connect-src. Upload with `fileToWebpBlob` instead. */
export async function fileToWebp(file: Blob, preset: Preset, maxW = 1200): Promise<string> {
  const blob = await fileToWebpBlob(file, preset, maxW);
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(blob);
  });
}
