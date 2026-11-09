"use client";

/**
 * Миниатюры старых импортов делались в JPEG: прозрачный фон PNG при этом
 * закрашивался чёрным. Пересобираем такую миниатюру из основного файла в WebP —
 * прозрачность сохраняется, и вещь на карточке действительно «парит».
 *
 * Размер и качество совпадают с новыми импортами, чтобы в базе не было
 * миниатюр двух разных стандартов.
 */
const MAX_SIZE = 320;
const QUALITY = 0.82;

/** Больше двух параллельных декодирований на телефоне уже заметно тормозят. */
const MAX_CONCURRENT = 2;

let active = 0;
const waiting: Array<() => void> = [];

function scheduleNext(): void {
  const next = waiting.shift();
  if (!next) return;

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(next, { timeout: 1200 });
  } else {
    setTimeout(next, 60);
  }
}

export function needsThumbUpgrade(thumb: Blob): boolean {
  return thumb.type === "image/jpeg";
}

export function createThumbBlob(source: Blob): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);

      const width = image.naturalWidth || 1;
      const height = image.naturalHeight || 1;
      const scale = Math.min(1, MAX_SIZE / Math.max(width, height));

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas недоступен"));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Не удалось собрать миниатюру")),
        "image/webp",
        QUALITY,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось прочитать фото"));
    };

    image.src = url;
  });
}

/**
 * Очередь для 60+ карточек: каждая пересобирает миниатюру один раз, но не все
 * одновременно. Если карточку успели закрыть — задача тихо пропускается.
 */
export function queueThumbCreation(
  source: Blob,
  isCancelled: () => boolean,
): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve) => {
    const run = () => {
      if (isCancelled()) {
        resolve(null);
        scheduleNext();
        return;
      }

      active += 1;
      createThumbBlob(source)
        .then((blob) => resolve(isCancelled() ? null : blob))
        .catch(() => resolve(null))
        .finally(() => {
          active -= 1;
          scheduleNext();
        });
    };

    if (active < MAX_CONCURRENT) run();
    else waiting.push(run);
  });
}
