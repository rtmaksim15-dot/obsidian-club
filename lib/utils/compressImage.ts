// Client-side image compression — runs in the browser before any
// upload (post photos, avatars), so real phone photos (often 5-15MB,
// well over what either the server's 8MB cap or Vercel's own 4.5MB
// function-body cap can take) shrink down before they ever leave the
// device. Resizes to a max 2048px long side and re-encodes as JPEG at
// ~0.85 quality, regardless of the source format — including HEIC,
// which decodes the same way through `createImageBitmap` on platforms
// that support it (notably Safari/iOS, the primary real-world case for
// "phone camera photo"). No separate HEIC-specific path or library.
const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;

export async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  let { width, height } = bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("Could not process image.");

  const baseName = file.name.replace(/\.[^./\\]+$/, "") || "photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
