import { EvictionPolicy, RequestPattern } from '@/lib/cacheEngine';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  policy: EvictionPolicy;
  onPolicyChange: (p: EvictionPolicy) => void;
  capacity: number;
  onCapacityChange: (c: number) => void;
  ttl: number;
  onTtlChange: (t: number) => void;
  pattern: RequestPattern;
  onPatternChange: (p: RequestPattern) => void;
  isRunning: boolean;
  onToggleRun: () => void;
  onAddFood: () => void;
  onReset: () => void;
  onAutoRequest: () => void;
  autoMode: boolean;
}

const policies: { value: EvictionPolicy; label: string; desc: string }[] = [
  { value: 'LRU', label: 'LRU', desc: '최근 미사용' },
  { value: 'LFU', label: 'LFU', desc: '최소 사용' },
  { value: 'FIFO', label: 'FIFO', desc: '선입선출' },
  { value: 'MRU', label: 'MRU', desc: '최근 사용' },
  { value: 'RR', label: 'RR', desc: '랜덤 교체' },
  { value: 'ARC', label: 'ARC', desc: '적응형 교체' },
  { value: 'CLOCK', label: 'CLOCK', desc: '시계 알고리즘' },
];

const patternOptions: { value: RequestPattern; label: string; icon: string }[] = [
  { value: 'random', label: '랜덤', icon: '🎲' },
  { value: 'hotItem', label: '핫 아이템', icon: '🔥' },
  { value: 'sequential', label: '순차', icon: '📋' },
];

export default function ControlPanel({
  policy, onPolicyChange, capacity, onCapacityChange,
  ttl, onTtlChange, pattern, onPatternChange,
  isRunning, onToggleRun,
  onAddFood, onReset, onAutoRequest, autoMode,
}: ControlPanelProps) {
  return (
    <div className="frost-glass fridge-shadow rounded-2xl p-4 sm:p-6 space-y-5">
      <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
        <span>⚙️</span> 설정
      </h2>

      {/* Policy selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">퇴거 정책</label>
        <div className="grid grid-cols-3 gap-2">
          {policies.map((p) => (
            <button
              key={p.value}
              onClick={() => onPolicyChange(p.value)}
              className={cn(
                'rounded-lg py-2 px-3 text-center transition-all duration-200 border',
                policy === p.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background/60 text-foreground border-border hover:border-primary/50'
              )}
            >
              <div className="font-mono font-bold text-sm">{p.label}</div>
              <div className="text-[10px] opacity-70">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Request pattern */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">요청 패턴</label>
        <div className="flex gap-2">
          {patternOptions.map((p) => (
            <button
              key={p.value}
              onClick={() => onPatternChange(p.value)}
              className={cn(
                'flex-1 rounded-lg py-2 px-2 text-center transition-all duration-200 border',
                pattern === p.value
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-background/60 text-foreground border-border hover:border-accent/50'
              )}
            >
              <div className="text-base">{p.icon}</div>
              <div className="text-[10px] font-display">{p.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Capacity */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          냉장고 용량: {capacity}
        </label>
        <input
          type="range"
          min={3}
          max={12}
          value={capacity}
          onChange={(e) => onCapacityChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      {/* TTL */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          유통기한: {ttl}초
        </label>
        <input
          type="range"
          min={5}
          max={30}
          value={ttl}
          onChange={(e) => onTtlChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button onClick={onToggleRun} variant={isRunning ? 'destructive' : 'default'} className="flex-1">
            {isRunning ? '⏸ 일시정지' : '▶️ 시작'}
          </Button>
          <Button onClick={onReset} variant="outline">
            🔄
          </Button>
        </div>
        <Button onClick={onAddFood} variant="secondary" className="w-full">
          🍎 식재료 추가
        </Button>
        <Button
          onClick={onAutoRequest}
          variant={autoMode ? 'default' : 'outline'}
          className="w-full"
        >
          {autoMode ? '🤖 자동 요청 ON' : '🤖 자동 요청 OFF'}
        </Button>
      </div>
    </div>
  );
}
