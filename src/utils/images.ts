// Existing data URLs are left untouched. Only new uploads are validated/downscaled.
export function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(Error("Please choose an image file."));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(Error("Choose an image smaller than 10 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(Error("Image could not be read."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(Error("Image could not be loaded."));
      img.onload = () => {
        try {
          const scale = Math.min(640 / img.width, 640 / img.height, 1),
            canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) throw Error("Image processing is unavailable.");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.76));
        } catch (error) {
          reject(error);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
