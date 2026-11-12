 import Dexie, { type Table } from 'dexie';
import type { Item, Photo, SavedOutfit, Settings, WornHistory } from './types';
import { guessItemColor, isPlaceholderColor } from '../features/items/guessColor';
import { itemColorFamilies } from '../features/items/itemColors';

export class WardrobeDB extends Dexie {
  items!: Table<Item, string>;
  photos!: Table<Photo, string>;
  settings!: Table<Settings, string>;
  savedOutfits!: Table<SavedOutfit, string>;
  wornHistory!: Table<WornHistory, number>;

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

    // v4: у вещи может быть несколько цветов (полосатая майка, свитер с
    // контрастными рукавами, отделка). Одноцветное поле `color` было объектом
    // { family, hex, label } — семейство переносим в `colors` первым и само
    // поле удаляем, чтобы не держать два источника правды. HEX и подпись не
    // теряются: они берутся из справочника COLOR_MAP по семейству, поэтому
    // база хранит только семейства.
    this.version(4)
      .stores({
        items: 'id, type, slot, status, createdAt, lastWornAt, [status+slot], *occasions, *tags',
        photos: 'id, itemId',
        settings: 'id',
        savedOutfits: 'id, createdAt',
      })
      .upgrade(async (tx) => {
        const table = tx.table<Item, string>('items');
        const items = await table.toArray();
        let migrated = 0;

        const next = items.map((item) => {
          const { color: legacy, ...rest } = item;
          if (legacy) migrated += 1;
          return {
            ...rest,
            colors: itemColorFamilies({ colors: item.colors, color: legacy }),
          };
        });

        if (next.length > 0) await table.bulkPut(next);
        console.info(
          `[wardrobe] db v4: colors перенесены у ${migrated} из ${next.length} вещей`,
        );
      });

    // v5: журнал ношения. Новая таблица `wornHistory` (автоинкремент), старые
    // таблицы не меняем — миграция Dexie просто создаёт её рядом, поэтому
    // гардероб и сохранённые образы остаются на месте.
    this.version(5).stores({
      items: 'id, type, slot, status, createdAt, lastWornAt, [status+slot], *occasions, *tags',
      photos: 'id, itemId',
      settings: 'id',
      savedOutfits: 'id, createdAt',
      wornHistory: '++id, date, createdAt',
    });
  }
}

export const db = new WardrobeDB();
