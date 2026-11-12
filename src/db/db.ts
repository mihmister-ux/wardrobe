 import Dexie, { type Table } from 'dexie';
import type { Item, Photo, SavedOutfit, Settings } from './types';
import { guessItemColor, isPlaceholderColor } from '../features/items/guessColor';

export class WardrobeDB extends Dexie {
  items!: Table<Item, string>;
  photos!: Table<Photo, string>;
  settings!: Table<Settings, string>;
  savedOutfits!: Table<SavedOutfit, string>;

  constructor() {
    super('wardrobe');
    this.version(1).stores({
      items: 'id, type, slot, status, createdAt, lastWornAt, [status+slot], *occasions, *tags',
      photos: 'id, itemId',
      settings: 'id',
    });

    // v2: ранние пакетные загрузки записали всем вещам «Чёрный» (позже «Серый»)
    // как цвет по умолчанию. Пересчитываем его из названия один раз при апгрейде,
    // не трогая цвета, выбранные пользователем вручную.
    this.version(2)
      .stores({
        items: 'id, type, slot, status, createdAt, lastWornAt, [status+slot], *occasions, *tags',
        photos: 'id, itemId',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Item, string>("items")
          .toCollection()
          .modify((item) => {
            if (item.source !== "import") return;
            if (!isPlaceholderColor(item.color)) return;
            item.color = guessItemColor(item.label ?? "");
          });
      });

    // v3: сохранённые образы — набор id вещей + оценка. Вещи храним по ссылке,
    // чтобы образ жил вместе с гардеробом, а удаление одной вещи не ломало запись.
    this.version(3).stores({
      items: 'id, type, slot, status, createdAt, lastWornAt, [status+slot], *occasions, *tags',
      photos: 'id, itemId',
      settings: 'id',
      savedOutfits: 'id, createdAt',
    });
  }
}

export const db = new WardrobeDB();
