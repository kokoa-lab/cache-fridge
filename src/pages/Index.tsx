import { useState, useCallback, useEffect, useRef } from 'react';
import {
  EvictionPolicy, FoodItem, CacheStats, HistoryPoint, RequestPattern,
  getFoodByPattern, createFoodItem, selectEvictionTarget, computeHitRate,
  setClockRef,
} from '@/lib/cacheEngine';
import FridgeGrid from '@/components/FridgeGrid';
import ControlPanel from '@/components/ControlPanel';
import StatsPanel from '@/components/StatsPanel';
import EventLog, { LogEntry } from '@/components/EventLog';
import BenchmarkPanel from '@/components/BenchmarkPanel';
import LearningGuide from '@/components/LearningGuide';

let logId = 0;

type TabId = 'simulation' | 'benchmark' | 'guide';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>('simulation');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [policy, setPolicy] = useState<EvictionPolicy>('LRU');
  const [capacity, setCapacity] = useState(8);
  const [ttl, setTtl] = useState(15);
  const [pattern, setPattern] = useState<RequestPattern>('random');
  const [isRunning, setIsRunning] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [stats, setStats] = useState<CacheStats>({ hits: 0, misses: 0, evictions: 0, expirations: 0 });
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [evictingId, setEvictingId] = useState<string | null>(null);
  const elapsed = useRef(0);

  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    setLogs((prev) => [{ id: ++logId, time, message, type }, ...prev].slice(0, 50));
  }, []);

  const handleAddFood = useCallback(() => {
    const { name, emoji } = getFoodByPattern(pattern);

    setItems((prev) => {
      const existing = prev.find((i) => i.name === name);
      if (existing) {
        setStats((s) => ({ ...s, hits: s.hits + 1 }));
        addLog(`${emoji} ${name} — 캐시 히트!`, 'hit');
        return prev.map((i) =>
          i.id === existing.id
            ? (() => { setClockRef(existing.id); return { ...i, lastAccessedAt: Date.now(), accessCount: i.accessCount + 1, remainingTtl: i.ttl }; })()
            : i
        );
      }

      setStats((s) => ({ ...s, misses: s.misses + 1 }));
      addLog(`${emoji} ${name} — 캐시 미스`, 'miss');

      const newItem = createFoodItem(name, emoji, ttl);
      let updated = [...prev];

      if (updated.length >= capacity) {
        const target = selectEvictionTarget(updated, policy);
        if (target) {
          setEvictingId(target.id);
          setTimeout(() => setEvictingId(null), 500);
          setStats((s) => ({ ...s, evictions: s.evictions + 1 }));
          addLog(`${target.emoji} ${target.name} — ${policy} 정책에 의해 퇴거`, 'evict');
          updated = updated.filter((i) => i.id !== target.id);
        }
      }

      addLog(`${emoji} ${name} — 냉장고에 추가`, 'add');
      return [...updated, newItem];
    });
  }, [capacity, policy, ttl, pattern, addLog]);

  const handleAccessItem = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      setStats((s) => ({ ...s, hits: s.hits + 1 }));
      addLog(`${item.emoji} ${item.name} — 접근 (히트)`, 'hit');
      setClockRef(id);
      return prev.map((i) =>
        i.id === id
          ? { ...i, lastAccessedAt: Date.now(), accessCount: i.accessCount + 1 }
          : i
      );
    });
  }, [addLog]);

  const handleReset = useCallback(() => {
    setItems([]);
    setStats({ hits: 0, misses: 0, evictions: 0, expirations: 0 });
    setHistory([]);
    setLogs([]);
    setIsRunning(false);
    setAutoMode(false);
    elapsed.current = 0;
  }, []);

  // TTL tick
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      elapsed.current += 1;

      setItems((prev) => {
        const expired: FoodItem[] = [];
        const alive = prev.map((item) => {
          const newTtl = item.remainingTtl - 1;
          if (newTtl <= 0) {
            expired.push(item);
            return null;
          }
          return { ...item, remainingTtl: newTtl };
        }).filter(Boolean) as FoodItem[];

        if (expired.length > 0) {
          setStats((s) => ({ ...s, expirations: s.expirations + expired.length }));
          expired.forEach((item) => {
            addLog(`${item.emoji} ${item.name} — 유통기한 만료!`, 'expire');
          });
        }

        return alive;
      });

      setStats((s) => {
        const hr = computeHitRate(s);
        setHistory((h) => [...h, { time: elapsed.current, hitRate: hr, hits: s.hits, misses: s.misses }].slice(-60));
        return s;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, addLog]);

  // Auto request
  useEffect(() => {
    if (!autoMode || !isRunning) return;
    const interval = setInterval(handleAddFood, 2000);
    return () => clearInterval(interval);
  }, [autoMode, isRunning, handleAddFood]);

  const tabs: { id: TabId; label: string; emoji: string }[] = [
    { id: 'simulation', label: '시뮬레이션', emoji: '🧊' },
    { id: 'benchmark', label: '벤치마크', emoji: '🏁' },
    { id: 'guide', label: '학습 가이드', emoji: '📚' },
  ];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
          🧊 CacheFridge
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl mx-auto">
          캐시 알고리즘을 냉장고 관리로 체험하세요. 식재료를 넣고, 유통기한을 관찰하고, 퇴거 정책을 바꿔보세요.
        </p>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mt-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-display text-sm font-medium transition-all duration-200 border ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:border-primary/50'
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Simulation tab */}
      {activeTab === 'simulation' && (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <FridgeGrid
              items={items}
              capacity={capacity}
              evictingId={evictingId}
              onAccessItem={handleAccessItem}
            />
            <StatsPanel stats={stats} history={history} />
          </div>

          <div className="space-y-4 sm:space-y-6">
            <ControlPanel
              policy={policy}
              onPolicyChange={setPolicy}
              capacity={capacity}
              onCapacityChange={setCapacity}
              ttl={ttl}
              onTtlChange={setTtl}
              pattern={pattern}
              onPatternChange={setPattern}
              isRunning={isRunning}
              onToggleRun={() => setIsRunning((r) => !r)}
              onAddFood={handleAddFood}
              onReset={handleReset}
              onAutoRequest={() => setAutoMode((a) => !a)}
              autoMode={autoMode}
            />
            <EventLog logs={logs} />
          </div>
        </div>
      )}

      {/* Benchmark tab */}
      {activeTab === 'benchmark' && (
        <div className="max-w-2xl mx-auto">
          <BenchmarkPanel capacity={capacity} />
        </div>
      )}

      {/* Guide tab */}
      {activeTab === 'guide' && (
        <div className="max-w-2xl mx-auto">
          <LearningGuide />
        </div>
      )}
    </div>
  );
}
