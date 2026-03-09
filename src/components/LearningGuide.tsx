import { useState } from 'react';
import { cn } from '@/lib/utils';

const sections = [
  {
    id: 'lru',
    title: 'LRU (Least Recently Used)',
    emoji: '🕐',
    color: 'text-primary',
    borderColor: 'border-primary/30',
    description: '가장 오래 전에 사용(접근)된 항목을 먼저 퇴거시킵니다.',
    analogy: '냉장고에서 가장 오래 손대지 않은 식재료를 버리는 것과 같습니다.',
    pros: ['최근 접근 패턴에 빠르게 적응', '웹 브라우저 캐시, DB 캐시에 널리 사용', '시간적 지역성(temporal locality)이 높은 워크로드에 최적'],
    cons: ['순차 스캔 시 캐시가 오염될 수 있음', '접근 빈도를 고려하지 않음'],
    bestFor: '웹 페이지 캐싱, 데이터베이스 버퍼, OS 페이지 교체',
  },
  {
    id: 'lfu',
    title: 'LFU (Least Frequently Used)',
    emoji: '📊',
    color: 'text-fresh',
    borderColor: 'border-fresh/30',
    description: '사용 횟수가 가장 적은 항목을 먼저 퇴거시킵니다.',
    analogy: '냉장고에서 거의 꺼내 먹지 않는 식재료를 버리는 것과 같습니다.',
    pros: ['인기 있는 항목을 오래 유지', '안정적인 접근 패턴에 높은 히트율', '핫 아이템이 있는 워크로드에 최적'],
    cons: ['접근 빈도 변화에 느리게 적응', '한때 인기였던 항목이 계속 남을 수 있음 (cache pollution)'],
    bestFor: 'CDN 캐싱, 인기 콘텐츠 캐싱, 추천 시스템',
  },
  {
    id: 'fifo',
    title: 'FIFO (First In, First Out)',
    emoji: '📦',
    color: 'text-warning',
    borderColor: 'border-warning/30',
    description: '가장 먼저 들어온 항목을 먼저 퇴거시킵니다. 접근 패턴을 전혀 고려하지 않습니다.',
    analogy: '냉장고에 먼저 넣은 식재료부터 순서대로 빼는 것과 같습니다.',
    pros: ['구현이 매우 간단 (큐 자료구조)', '예측 가능한 동작', '오버헤드가 가장 적음'],
    cons: ['접근 빈도와 최근성 모두 무시', '일반적으로 히트율이 낮음'],
    bestFor: '간단한 버퍼, 네트워크 패킷 큐, 로그 버퍼',
  },
  {
    id: 'mru',
    title: 'MRU (Most Recently Used)',
    emoji: '🔄',
    color: 'text-primary',
    borderColor: 'border-primary/30',
    description: '가장 최근에 사용된 항목을 먼저 퇴거시킵니다. LRU와 정반대 전략입니다.',
    analogy: '방금 꺼내 먹은 식재료를 다시 냉장고에 넣지 않고 바로 버리는 것과 같습니다.',
    pros: ['순차 스캔 패턴에서 LRU보다 우수', '스택 기반 접근 패턴에 적합', '반복 접근이 적은 워크로드에 효과적'],
    cons: ['일반적인 캐시 워크로드에서 성능이 낮음', '최근 데이터를 바로 제거하므로 직관에 반함'],
    bestFor: '파일 순차 스캔, 데이터베이스 풀 테이블 스캔, 한 번만 읽는 데이터',
  },
  {
    id: 'rr',
    title: 'RR (Random Replacement)',
    emoji: '🎲',
    color: 'text-accent-foreground',
    borderColor: 'border-accent/30',
    description: '퇴거 대상을 무작위로 선택합니다. 어떤 메타데이터도 추적하지 않습니다.',
    analogy: '냉장고에서 눈을 감고 아무거나 하나 집어서 버리는 것과 같습니다.',
    pros: ['구현이 가장 간단', '메타데이터 저장 불필요 (메모리 절약)', '특정 워크로드에서 의외로 준수한 성능'],
    cons: ['최적의 선택을 보장하지 않음', '성능 예측 불가능'],
    bestFor: 'ARM 프로세서 캐시, 하드웨어 캐시, 저전력 환경',
  },
  {
    id: 'arc',
    title: 'ARC (Adaptive Replacement Cache)',
    emoji: '🔀',
    color: 'text-primary',
    borderColor: 'border-primary/30',
    description: 'LRU와 LFU를 결합한 적응형 알고리즘입니다. 최근성과 빈도를 모두 고려하여 동적으로 전략을 조절합니다.',
    analogy: '냉장고를 두 칸으로 나눠, 한 칸은 새로 넣은 식재료, 다른 칸은 자주 꺼내 먹는 식재료용으로 쓰면서 상황에 따라 칸 크기를 조절하는 것과 같습니다.',
    pros: ['LRU와 LFU의 장점을 결합', '워크로드 변화에 자동 적응', '순차 스캔에도 강건함'],
    cons: ['구현 복잡도가 높음', '메모리 오버헤드가 큼 (고스트 리스트 유지)', 'IBM 특허 이슈 (일부 환경)'],
    bestFor: 'ZFS 파일시스템, 데이터베이스 버퍼 풀, 범용 고성능 캐시',
  },
  {
    id: 'clock',
    title: 'CLOCK (Second-Chance)',
    emoji: '🕰️',
    color: 'text-warning',
    borderColor: 'border-warning/30',
    description: '원형 버퍼와 참조 비트를 사용하는 알고리즘입니다. LRU의 근사치를 저렴한 비용으로 구현합니다.',
    analogy: '냉장고 선반을 시계처럼 돌면서 확인하되, 최근에 꺼내 먹은 식재료는 한 번 봐주고(second chance) 넘어가는 것과 같습니다.',
    pros: ['LRU보다 구현이 간단하고 효율적', '참조 비트만 필요 (낮은 오버헤드)', 'OS 페이지 교체에서 널리 사용'],
    cons: ['정확한 LRU보다 히트율이 약간 낮을 수 있음', '참조 비트 초기화 타이밍에 민감'],
    bestFor: 'OS 가상 메모리 페이지 교체, Linux 커널, 범용 시스템 캐시',
  },
];

const concepts = [
  { term: '캐시 히트', desc: '요청한 데이터가 캐시에 이미 존재하여 빠르게 반환하는 것', icon: '✅' },
  { term: '캐시 미스', desc: '요청한 데이터가 캐시에 없어 원본 저장소에서 가져와야 하는 것', icon: '❌' },
  { term: 'TTL', desc: 'Time-To-Live. 데이터가 캐시에 유효한 시간. 만료되면 자동 삭제', icon: '⏰' },
  { term: '퇴거(Eviction)', desc: '캐시가 꽉 찼을 때 정책에 따라 기존 항목을 제거하는 것', icon: '🗑️' },
  { term: '히트율', desc: '전체 요청 중 캐시 히트 비율. 캐시 효율의 핵심 지표', icon: '📈' },
];

export default function LearningGuide() {
  const [openSection, setOpenSection] = useState<string | null>('lru');

  return (
    <div className="frost-glass fridge-shadow rounded-2xl p-4 sm:p-6 space-y-5">
      <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
        <span>📚</span> 학습 가이드
      </h2>

      {/* Core concepts */}
      <div className="space-y-2">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">핵심 개념</h3>
        <div className="grid gap-2">
          {concepts.map((c) => (
            <div key={c.term} className="flex items-start gap-2 bg-background/60 rounded-lg p-2.5">
              <span className="text-base shrink-0">{c.icon}</span>
              <div>
                <span className="font-display font-semibold text-sm text-foreground">{c.term}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Policy deep-dives */}
      <div className="space-y-2">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">퇴거 정책 상세</h3>
        <div className="space-y-2">
          {sections.map((s) => (
            <div key={s.id} className={cn('rounded-lg border overflow-hidden transition-all', s.borderColor)}>
              <button
                onClick={() => setOpenSection(openSection === s.id ? null : s.id)}
                className="w-full flex items-center gap-2 p-3 text-left hover:bg-background/40 transition-colors"
              >
                <span className="text-lg">{s.emoji}</span>
                <span className={cn('font-display font-semibold text-sm flex-1', s.color)}>{s.title}</span>
                <span className="text-muted-foreground text-xs">{openSection === s.id ? '▲' : '▼'}</span>
              </button>
              {openSection === s.id && (
                <div className="px-3 pb-3 space-y-3 animate-slide-in">
                  <p className="text-sm text-foreground">{s.description}</p>
                  <div className="bg-primary/5 rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground">🧊 냉장고 비유</p>
                    <p className="text-sm text-foreground mt-1">{s.analogy}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs font-mono text-fresh mb-1">✅ 장점</p>
                      <ul className="space-y-1">
                        {s.pros.map((p, i) => (
                          <li key={i} className="text-[11px] text-foreground/80">{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-mono text-expired mb-1">⚠️ 단점</p>
                      <ul className="space-y-1">
                        {s.cons.map((c, i) => (
                          <li key={i} className="text-[11px] text-foreground/80">{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="bg-background/60 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">🎯 적합한 사용처</p>
                    <p className="text-xs text-foreground mt-0.5">{s.bestFor}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
