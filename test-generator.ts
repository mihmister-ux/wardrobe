 import { generate } from './src/generator/index';
import { candidate } from './src/generator/filter';

const items = [
  candidate({ id: 'shirt-1', tags: ['top', 'work'], traits: { quality: 80 } }),
  candidate({ id: 'jeans-1', tags: ['bottom', 'walk'], traits: { quality: 60 } }),
  candidate({ id: 'dress-1', tags: ['fullbody', 'evening'], traits: { quality: 95 } }),
  candidate({ id: 'shoes-1', tags: ['shoes', 'walk'], traits: { quality: 70 } }),
  candidate({ id: 'coat-1', tags: ['outerwear', 'cold'], traits: { quality: 85 } }),
];

const result = generate({
  seed: 'test-seed-123',
  candidates: items,
  explain: true,
});

console.log('--- РЕЗУЛЬТАТ ТЕСТА ---');
console.log('Всего на входе:', result.stats.totalIn);
console.log('Прошло фильтры:', result.stats.afterFilter);
console.log('Сколько образов выбрано:', result.selected.length);
console.log('\n--- ОТЧЕТ МОДЕЛИ ---');
console.log(result.report);
