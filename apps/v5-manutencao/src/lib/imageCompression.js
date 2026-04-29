// Compressão client-side antes de enviar foto para a Edge Function image-inspector.
// Max 1568px no lado maior (recomendação Anthropic Vision), JPEG q85, OffscreenCanvas.
// Sem dependências externas — OffscreenCanvas disponível em Chrome/Safari 16+/Firefox 105+.

const MAX_PX = 1568;
const JPEG_QUALITY = 0.85;

export async function compressImage(file) {
  const bitmap = await createImageBitmap(file);

  let { width, height } = bitmap;
  if (width > MAX_PX || height > MAX_PX) {
    const ratio = Math.min(MAX_PX / width, MAX_PX / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });

  // arrayBuffer → base64 sem FileReader callback (safe para ficheiros grandes via chunking)
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }

  return {
    base64: btoa(binary),
    blob,
    mimeType: "image/jpeg",
    width,
    height,
    sizeBytes: blob.size,
  };
}
