import { FoodItem } from '@/lib/cacheEngine';
import FoodCell from './FoodCell';
import { cn } from '@/lib/utils';

interface FridgeGridProps {
  items: FoodItem[];
  capacity: number;
  evictingId: string | null;
  onAccessItem: (id: string) => void;
}

export default function FridgeGrid({ items, capacity, evictingId, onAccessItem }: FridgeGridProps) {
  const emptySlots = capacity - items.length;

  return (
    <div className="frost-glass fridge-shadow rounded-2xl p-4 sm:p-6">
      {/* Fridge header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧊</span>
          <h2 className="text-lg font-display font-semibold text-foreground">냉장고</h2>
        </div>
        <span className="font-mono text-sm text-muted-foreground">
          {items.length}/{capacity}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
        {items.map((item) => (
          <FoodCell
            key={item.id}
            item={item}
            isEvicting={evictingId === item.id}
            onClick={() => onAccessItem(item.id)}
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className={cn(
              'rounded-lg border border-dashed border-border/50 aspect-square',
              'flex items-center justify-center text-muted-foreground/30 text-2xl'
            )}
          >
            ·
          </div>
        ))}
      </div>
    </div>
  );
}
