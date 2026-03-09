interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: 'hit' | 'miss' | 'evict' | 'expire' | 'add';
}

interface EventLogProps {
  logs: LogEntry[];
}

const typeStyles: Record<string, string> = {
  hit: 'text-fresh',
  miss: 'text-expired',
  evict: 'text-warning',
  expire: 'text-muted-foreground',
  add: 'text-primary',
};

const typeIcons: Record<string, string> = {
  hit: '✅',
  miss: '❌',
  evict: '🗑️',
  expire: '⏰',
  add: '📥',
};

export type { LogEntry };

export default function EventLog({ logs }: EventLogProps) {
  return (
    <div className="frost-glass fridge-shadow rounded-2xl p-4 sm:p-6">
      <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2 mb-3">
        <span>📋</span> 이벤트 로그
      </h2>
      <div className="h-48 overflow-y-auto space-y-1 scrollbar-thin">
        {logs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">아직 이벤트가 없습니다</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 text-xs font-mono animate-slide-in">
            <span className="text-muted-foreground shrink-0">{log.time}</span>
            <span>{typeIcons[log.type]}</span>
            <span className={typeStyles[log.type]}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
