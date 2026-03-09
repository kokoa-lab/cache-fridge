export type EvictionPolicy = 'LRU' | 'LFU' | 'FIFO' | 'MRU' | 'RR' | 'ARC' | 'CLOCK';
export type RequestPattern = 'random' | 'hotItem' | 'sequential';

export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  ttl: number;
  remainingTtl: number;
  insertedAt: number;
  lastAccessedAt: number;
  accessCount: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
}

export interface HistoryPoint {
  time: number;
  hitRate: number;
  hits: number;
  misses: number;
}

export interface BenchmarkResult {
  policy: EvictionPolicy;
  stats: CacheStats;
  hitRate: number;
}

export const FOOD_ITEMS: { name: string; emoji: string }[] = [
  { name: '우유', emoji: '🥛' },
  { name: '달걀', emoji: '🥚' },
  { name: '사과', emoji: '🍎' },
  { name: '치즈', emoji: '🧀' },
  { name: '당근', emoji: '🥕' },
  { name: '고기', emoji: '🥩' },
  { name: '빵', emoji: '🍞' },
  { name: '버터', emoji: '🧈' },
  { name: '포도', emoji: '🍇' },
  { name: '양파', emoji: '🧅' },
  { name: '생선', emoji: '🐟' },
  { name: '딸기', emoji: '🍓' },
  { name: '브로콜리', emoji: '🥦' },
  { name: '토마토', emoji: '🍅' },
  { name: '옥수수', emoji: '🌽' },
];

let idCounter = 0;

export function getRandomFood(): { name: string; emoji: string } {
  return FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)];
}

// Generate food based on request pattern
let sequentialIndex = 0;
const hotItems = FOOD_ITEMS.slice(0, 4); // first 4 are "hot"

export function getFoodByPattern(pattern: RequestPattern): { name: string; emoji: string } {
  switch (pattern) {
    case 'hotItem': {
      // 70% chance hot item, 30% random
      if (Math.random() < 0.7) {
        return hotItems[Math.floor(Math.random() * hotItems.length)];
      }
      return FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)];
    }
    case 'sequential': {
      const item = FOOD_ITEMS[sequentialIndex % FOOD_ITEMS.length];
      sequentialIndex++;
      return item;
    }
    case 'random':
    default:
      return getRandomFood();
  }
}

export function createFoodItem(name: string, emoji: string, ttl: number): FoodItem {
  const now = Date.now();
  return {
    id: `food-${++idCounter}`,
    name,
    emoji,
    ttl,
    remainingTtl: ttl,
    insertedAt: now,
    lastAccessedAt: now,
    accessCount: 1,
  };
}

// CLOCK algorithm state
let clockPointer = 0;
const clockRefBits = new Map<string, boolean>();

export function resetClockState() {
  clockPointer = 0;
  clockRefBits.clear();
}

export function setClockRef(id: string) {
  clockRefBits.set(id, true);
}

export function selectEvictionTarget(items: FoodItem[], policy: EvictionPolicy): FoodItem | null {
  if (items.length === 0) return null;

  switch (policy) {
    case 'LRU':
      return items.reduce((oldest, item) =>
        item.lastAccessedAt < oldest.lastAccessedAt ? item : oldest
      );
    case 'LFU':
      return items.reduce((least, item) =>
        item.accessCount < least.accessCount ? item :
        item.accessCount === least.accessCount && item.lastAccessedAt < least.lastAccessedAt ? item : least
      );
    case 'FIFO':
      return items.reduce((first, item) =>
        item.insertedAt < first.insertedAt ? item : first
      );
    case 'MRU':
      return items.reduce((newest, item) =>
        item.lastAccessedAt > newest.lastAccessedAt ? item : newest
      );
    case 'RR':
      return items[Math.floor(Math.random() * items.length)];
    case 'ARC': {
      // Adaptive: items accessed once → evict LRU among them; if all accessed multiple times → evict LFU
      const onceItems = items.filter((i) => i.accessCount <= 1);
      const pool = onceItems.length > 0 ? onceItems : items;
      return pool.reduce((oldest, item) =>
        item.lastAccessedAt < oldest.lastAccessedAt ? item : oldest
      );
    }
    case 'CLOCK': {
      // Second-chance / clock algorithm
      if (items.length === 0) return null;
      let attempts = 0;
      while (attempts < items.length * 2) {
        clockPointer = clockPointer % items.length;
        const candidate = items[clockPointer];
        const ref = clockRefBits.get(candidate.id) ?? false;
        if (!ref) {
          clockRefBits.delete(candidate.id);
          return candidate;
        }
        // Give second chance: clear ref bit
        clockRefBits.set(candidate.id, false);
        clockPointer++;
        attempts++;
      }
      // Fallback: evict at pointer
      clockPointer = clockPointer % items.length;
      return items[clockPointer];
    }
  }
}

export function computeHitRate(stats: CacheStats): number {
  const total = stats.hits + stats.misses;
  return total === 0 ? 0 : Math.round((stats.hits / total) * 100);
}

// Run a pure benchmark simulation (no TTL, just capacity eviction)
export function runBenchmark(
  requestSequence: { name: string; emoji: string }[],
  capacity: number,
): BenchmarkResult[] {
  const policies: EvictionPolicy[] = ['LRU', 'LFU', 'FIFO', 'MRU', 'RR', 'ARC', 'CLOCK'];

  return policies.map((policy) => {
    let items: FoodItem[] = [];
    const stats: CacheStats = { hits: 0, misses: 0, evictions: 0, expirations: 0 };
    let fakeTime = 0;

    for (const req of requestSequence) {
      fakeTime++;
      const existing = items.find((i) => i.name === req.name);

      if (existing) {
        stats.hits++;
        existing.lastAccessedAt = fakeTime;
        existing.accessCount++;
      } else {
        stats.misses++;

        if (items.length >= capacity) {
          const target = selectEvictionTarget(items, policy);
          if (target) {
            stats.evictions++;
            items = items.filter((i) => i.id !== target.id);
          }
        }

        items.push({
          id: `bench-${policy}-${fakeTime}`,
          name: req.name,
          emoji: req.emoji,
          ttl: 999,
          remainingTtl: 999,
          insertedAt: fakeTime,
          lastAccessedAt: fakeTime,
          accessCount: 1,
        });
      }
    }

    return { policy, stats, hitRate: computeHitRate(stats) };
  });
}
