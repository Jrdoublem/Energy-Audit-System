// Reads an uploaded image file and re-encodes it as a JPEG data URL, capping
// the longest side so a multi-MB phone photo doesn't turn into a multi-MB
// upload — the result is handed to uploadImage() (src/context/storageStore.js)
// rather than stored inline, so this only needs to keep uploads reasonably
// sized, not localStorage-tiny like before.
export function fileToResizedDataUrl(file, maxSize = 1000, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale) || 1;
        const h = Math.round(img.height * scale) || 1;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        // PNGs may carry transparency (logos, icons) — re-encoding those as
        // JPEG would flatten the transparent areas to black, since JPEG has
        // no alpha channel. Keep PNG output for PNG input; everything else
        // (camera photos etc.) goes to JPEG to keep upload size down.
        const keepPng = file.type === 'image/png';
        resolve(keepPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
