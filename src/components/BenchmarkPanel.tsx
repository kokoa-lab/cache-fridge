import { useState, useRef, useCallback, useEffect } from 'react';
import {
  RequestPattern, EvictionPolicy, FoodItem, CacheStats,
  getFoodByPattern, selectEvictionTarget, computeHitRate,
} from '@/lib/cacheEngine';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { cn } from '@/lib/utils';

const patterns: { value: RequestPattern; label: string; desc: string }[] = [
  { value: 'random', label: '🎲 랜덤', desc: '모든 식재료 균등 요청' },
  { value: 'hotItem', label: '🔥 핫 아이템', desc: '일부 식재료 집중 요청 (70%)' },
  { value: 'sequential', label: '📋 순차', desc: '식재료를 순서대로 요청' },
];

const POLICY_COLORS: Record<string, string> = {
  LRU: 'hsl(205 85% 45%)',
  LFU: 'hsl(145 60% 45%)',
  FIFO: 'hsl(38 92% 50%)',
  MRU: 'hsl(280 70% 55%)',
  RR: 'hsl(350 70% 50%)',
  ARC: 'hsl(170 65% 40%)',
  CLOCK: 'hsl(25 85% 55%)',
};

const ALL_POLICIES: EvictionPolicy[] = ['LRU', 'LFU', 'FIFO', 'MRU', 'RR', 'ARC', 'CLOCK'];

interface PolicyState {
  items: FoodItem[];
  stats: CacheStats;
  hitRate: number;
}

interface HistoryEntry {
  step: number;
  LRU: number;
  LFU: number;
  FIFO: number;
  MRU: number;
  RR: number;
  ARC: number;
  CLOCK: number;
}

interface BenchmarkPanelProps {
  capacity: number;
}

export default function BenchmarkPanel({ capacity }: BenchmarkPanelProps) {
  const [pattern, setPattern] = useState<RequestPattern>('random');
  const [requestCount, setRequestCount] = useState(200);
  const [speed, setSpeed] = useState(50); // ms per step
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [policyStates, setPolicyStates] = useState<Record<EvictionPolicy, PolicyState> | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentFood, setCurrentFood] = useState<{ name: string; emoji: string } | null>(null);

  const sequenceRef = useRef<{ name: string; emoji: string }[]>([]);
  const statesRef = useRef<Record<EvictionPolicy, { items: FoodItem[]; stats: CacheStats }> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(0);

  const stopRun = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
  }, []);

  const processStep = useCallback(() => {
    const seq = sequenceRef.current;
    const states = statesRef.current;
    if (!states || stepRef.current >= seq.length) {
      stopRun();
      return;
    }

    const req = seq[stepRef.current];
    stepRef.current++;
    setCurrentStep(stepRef.current);
    setCurrentFood(req);

    const policies = ALL_POLICIES;
    const newStates: Record<string, PolicyState> = {};
    const entry: Record<string, number> = { step: stepRef.current };

    for (const policy of policies) {
      const s = states[policy];
      const existing = s.items.find((i) => i.name === req.name);

      if (existing) {
        s.stats.hits++;
        existing.lastAccessedAt = stepRef.current;
        existing.accessCount++;
      } else {
        s.stats.misses++;
        if (s.items.length >= capacity) {
          const target = selectEvictionTarget(s.items, policy);
          if (target) {
            s.stats.evictions++;
            s.items = s.items.filter((i) => i.id !== target.id);
          }
        }
        s.items.push({
          id: `bench-${policy}-${stepRef.current}`,
          name: req.name,
          emoji: req.emoji,
          ttl: 999,
          remainingTtl: 999,
          insertedAt: stepRef.current,
          lastAccessedAt: stepRef.current,
          accessCount: 1,
        });
      }

      const hitRate = computeHitRate(s.stats);
      newStates[policy] = { items: [...s.items], stats: { ...s.stats }, hitRate };
      entry[policy] = hitRate;
    }

    setPolicyStates(newStates as Record<EvictionPolicy, PolicyState>);
    setHistory((h) => {
      const next = [...h, entry as unknown as HistoryEntry];
      // Keep last 100 points for chart readability
      return next.length > 100 ? next.filter((_, i) => i % Math.ceil(next.length / 100) === 0 || i === next.length - 1) : next;
    });
  }, [capacity, stopRun]);

  const handleRun = useCallback(() => {
    if (isRunning) {
      stopRun();
      return;
    }

    // Generate sequence upfront
    sequenceRef.current = Array.from({ length: requestCount }, () => getFoodByPattern(pattern));
    stepRef.current = 0;
    statesRef.current = Object.fromEntries(
      ALL_POLICIES.map((p) => [p, { items: [], stats: { hits: 0, misses: 0, evictions: 0, expirations: 0 } }])
    ) as Record<EvictionPolicy, { items: FoodItem[]; stats: CacheStats }>;

    setCurrentStep(0);
    setPolicyStates(null);
    setHistory([]);
    setCurrentFood(null);
    setIsRunning(true);

    intervalRef.current = setInterval(processStep, speed);
  }, [isRunning, requestCount, pattern, speed, processStep, stopRun]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Update interval speed while running
  useEffect(() => {
    if (isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(processStep, speed);
    }
  }, [speed, isRunning, processStep]);

  const progress = requestCount > 0 ? Math.round((currentStep / requestCount) * 100) : 0;
  const isDone = currentStep >= requestCount && currentStep > 0;

  return (
    <div className="frost-glass fridge-shadow rounded-2xl p-4 sm:p-6 space-y-5">
      <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
        <span>🏁</span> 벤치마크 모드
      </h2>
      <p className="text-xs text-muted-foreground">
        동일한 요청 시퀀스로 LRU/LFU/FIFO를 동시에 실행하며 히트율 변화를 실시간 관찰합니다.
      </p>

      {/* Pattern selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">요청 패턴</label>
        <div className="flex gap-2">
          {patterns.map((p) => (
            <button
              key={p.value}
              onClick={() => !isRunning && setPattern(p.value)}
              disabled={isRunning}
              className={cn(
                'flex-1 rounded-lg py-2 px-3 text-center transition-all duration-200 border',
                pattern === p.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background/60 text-foreground border-border hover:border-primary/50',
                isRunning && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="font-display font-medium text-sm">{p.label}</div>
              <div className="text-[10px] opacity-70">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Request count */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          요청 횟수: {requestCount}
        </label>
        <input
          type="range"
          min={50}
          max={2000}
          step={50}
          value={requestCount}
          onChange={(e) => !isRunning && setRequestCount(Number(e.target.value))}
          disabled={isRunning}
          className="w-full accent-primary"
        />
      </div>

      {/* Speed control */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          속도: {speed <= 10 ? '최고속' : speed <= 30 ? '빠름' : speed <= 80 ? '보통' : '느림'} ({speed}ms)
        </label>
        <input
          type="range"
          min={5}
          max={200}
          step={5}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      <Button onClick={handleRun} variant={isRunning ? 'destructive' : 'default'} className="w-full">
        {isRunning ? '⏸ 일시정지' : isDone ? '🔄 다시 실행' : '🚀 벤치마크 시작'}
      </Button>

      {/* Progress */}
      {(isRunning || isDone) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>진행: {currentStep} / {requestCount}</span>
            {currentFood && (
              <span className="animate-pulse">{currentFood.emoji} {currentFood.name}</span>
            )}
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Live line chart */}
      {history.length > 1 && (
        <div className="space-y-4 animate-slide-in">
          <h3 className="text-sm font-display font-semibold text-foreground">📈 히트율 추이</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 88%)" />
                <XAxis
                  dataKey="step"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  stroke="hsl(215 12% 50%)"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(v) => `${v}%`}
                  stroke="hsl(215 12% 50%)"
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(200 40% 96% / 0.95)',
                    border: '1px solid hsl(210 20% 88%)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}%`]}
                />
                <Legend />
                {ALL_POLICIES.map((p) => (
                  <Line key={p} type="monotone" dataKey={p} stroke={POLICY_COLORS[p]} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Final bar chart & stats */}
      {policyStates && (
        <div className="space-y-4">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ALL_POLICIES.map((p) => ({
                  policy: p,
                  히트율: policyStates[p].hitRate,
                  히트: policyStates[p].stats.hits,
                  미스: policyStates[p].stats.misses,
                  퇴거: policyStates[p].stats.evictions,
                }))}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 88%)" />
                <XAxis dataKey="policy" tick={{ fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 700 }} stroke="hsl(215 12% 50%)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `${v}%`} stroke="hsl(215 12% 50%)" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(200 40% 96% / 0.95)',
                    border: '1px solid hsl(210 20% 88%)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === '히트율') return [`${value}%`, name];
                    return [value, name];
                  }}
                />
                <Bar dataKey="히트율" radius={[6, 6, 0, 0]}>
                  {ALL_POLICIES.map((p) => (
                    <Cell key={p} fill={POLICY_COLORS[p]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {ALL_POLICIES.map((p) => (
              <div
                key={p}
                className="bg-background/60 rounded-lg p-3 text-center border"
                style={{ borderColor: POLICY_COLORS[p] }}
              >
                <div className="font-mono font-bold text-sm" style={{ color: POLICY_COLORS[p] }}>{p}</div>
                <div className="text-xl font-mono font-bold text-foreground mt-1">{policyStates[p].hitRate}%</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  H:{policyStates[p].stats.hits} M:{policyStates[p].stats.misses} E:{policyStates[p].stats.evictions}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
