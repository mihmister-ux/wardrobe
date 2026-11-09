 import Dexie, { type Table } from 'dexie';
import type { Item, Photo, Settings } from './types';

export class WardrobeDB extends Dexie {
  items!: Table<Item, string>;
  photos!: Table<Photo, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('wardrobe');
    this.version(1).stores({
      items: 'id, type, slot, status, createdAt, lastWornAt, [status+slot], *occasions, *tags',
      photos: 'id, itemId',
      settings: 'id',
    });
  }
}

export const db = new WardrobeDB();
