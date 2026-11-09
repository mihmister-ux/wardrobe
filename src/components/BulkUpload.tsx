import { useState } from 'react';
import { db } from '../db/db';
import type { Item, Photo } from '../db/types';

export function BulkUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const createThumbnail = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxSize = 300;
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Ошибка миниатюры'));
        }, 'image/jpeg', 0.8);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setProgress({ current: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const itemId = crypto.randomUUID();
      const photoId = crypto.randomUUID();
      const cleanName = file.name.replace('.png', '').replace(/_/g, ' ');

      try {
        const arrayBuffer = await file.arrayBuffer();
        const mainBlob = new Blob([arrayBuffer], { type: 'image/png' });
        const thumbBlob = await createThumbnail(file);

        await db.transaction('rw', db.items, db.photos, async () => {
          const newItem: Item = {
            id: itemId,
            type: 'unknown',
            slot: 'top',
            label: cleanName,
            color: { family: 'black', hex: '#000000', label: 'Черный' },
            pattern: 'solid',
            texture: 'cotton',
            warmth: 3,
            tempMin: 5,
            tempMax: 20,
            waterResistance: 0,
            windproof: false,
            formality: 2,
            occasions: ['walk', 'home'],
            tags: [],
            status: 'available',
            favorite: false,
            photoId: photoId,
            wearCount: 0,
            source: 'import',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          const newPhoto: Photo = {
            id: photoId,
            itemId: itemId,
            main: mainBlob,
            thumb: thumbBlob,
            mime: 'image/png',
            width: 1000,
            height: 1000,
            bytes: file.size,
            createdAt: Date.now()
          };

          await db.items.add(newItem);
          await db.photos.add(newPhoto);
        });
      } catch (err) {
        console.error(`Ошибка при загрузке ${file.name}:`, err);
      }

      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    setIsUploading(false);
    alert('Все фото успешно загружены в базу!');
    e.target.value = '';
  };

  return (
    <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 my-4">
      <h3 className="text-white font-bold mb-2">Пакетная загрузка вещей (PNG)</h3>
      
      {!isUploading ? (
        <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg inline-block transition-colors">
          Выбрать файлы
          <input type="file" multiple accept="image/png" className="hidden" onChange={handleFiles} />
        </label>
      ) : (
        <div className="text-white">
          Загрузка: {progress.current} из {progress.total}...
          <div className="w-full bg-slate-700 h-2 mt-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}