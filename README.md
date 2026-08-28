# cache-fridge

냉장고에 식재료를 넣고 빼는 과정으로 캐시 교체 정책(LRU, LFU, FIFO, MRU, RR, ARC, CLOCK)을 배우는 시뮬레이터입니다. 정책별 히트율을 비교하는 벤치마크 모드와 개념 설명 가이드도 포함되어 있습니다.

- 배포 URL: https://cache-fridge.코드.kr
- React, TypeScript, Vite, shadcn/ui 기반

## 개발 및 실행

```bash
# 의존성 설치
bun install

# 개발 서버 실행
bun dev
```

## 빌드

```bash
bun run build
```

## Cloudflare Workers 배포

정적 산출물(`dist/`)을 Cloudflare Workers assets로 배포합니다.

```bash
bun run build
bunx wrangler deploy
```
