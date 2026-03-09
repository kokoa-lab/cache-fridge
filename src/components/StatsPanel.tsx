import { CacheStats, computeHitRate, HistoryPoint } from '@/lib/cacheEngine';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface StatsPanelProps {
  stats: CacheStats;
  history: HistoryPoint[];
}

export default function StatsPanel({ stats, history }: StatsPanelProps) {
  const hitRate = computeHitRate(stats);

  return (
    <div className="frost-glass fridge-shadow rounded-2xl p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
        <span>📊</span> 캐시 통계
      </h2>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="히트" value={stats.hits} color="text-fresh" />
        <StatCard label="미스" value={stats.misses} color="text-expired" />
        <StatCard label="퇴거" value={stats.evictions} color="text-warning" />
        <StatCard label="히트율" value={`${hitRate}%`} color="text-primary" />
      </div>

      {/* Chart */}
      {history.length > 1 && (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 88%)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v) => `${v}s`}
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
                  background: 'hsl(200 40% 96% / 0.9)',
                  border: '1px solid hsl(210 20% 88%)',
                  borderRadius: '8px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value}%`, '히트율']}
                labelFormatter={(v) => `${v}초`}
              />
              <Line
                type="monotone"
                dataKey="hitRate"
                stroke="hsl(205 85% 45%)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-background/60 rounded-lg p-3 text-center">
      <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
