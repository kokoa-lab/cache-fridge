import { FoodItem } from '@/lib/cacheEngine';
import { cn } from '@/lib/utils';

interface FoodCellProps {
  item: FoodItem;
  isEvicting?: boolean;
  onClick: () => void;
}

function getTtlStatus(item: FoodItem): 'fresh' | 'warning' | 'expired' {
  const ratio = item.remainingTtl / item.ttl;
  if (ratio > 0.5) return 'fresh';
  if (ratio > 0.2) return 'warning';
  return 'expired';
}

export default function FoodCell({ item, isEvicting, onClick }: FoodCellProps) {
  const status = getTtlStatus(item);
  const pct = Math.max(0, (item.remainingTtl / item.ttl) * 100);

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg p-2 transition-all duration-200 cursor-pointer border aspect-square',
        'hover:scale-105 active:scale-95',
        status === 'fresh' && 'bg-fresh/10 border-fresh/30 food-glow-fresh',
        status === 'warning' && 'bg-warning/10 border-warning/30 food-glow-warning',
        status === 'expired' && 'bg-expired/10 border-expired/30 food-glow-expired',
        isEvicting && 'animate-shake-out',
        !isEvicting && 'animate-pop-in'
      )}
    >
      <span className="text-2xl sm:text-3xl">{item.emoji}</span>
      <span className="text-[10px] font-mono mt-1 text-foreground/70 truncate w-full text-center">
        {item.name}
      </span>

      {/* TTL bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg overflow-hidden bg-muted">
        <div
          className={cn(
            'h-full transition-all duration-1000 ease-linear',
            status === 'fresh' && 'bg-fresh',
            status === 'warning' && 'bg-warning',
            status === 'expired' && 'bg-expired',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Access count badge */}
      <span className="absolute -top-1 -right-1 text-[9px] font-mono bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
        {item.accessCount}
      </span>
    </button>
  );
}
