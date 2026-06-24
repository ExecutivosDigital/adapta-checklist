# Changelog — PWA Adapta Driver

Registro cronológico de mudanças aplicadas no projeto de transformação em PWA. Mais recente no topo. Cada entrada referencia, quando aplicável, o item correspondente do [ROADMAP.md](./ROADMAP.md).

Formato sugerido por entrada:

```
## YYYY-MM-DD — Título curto
**Fase:** N.N
**Autor:** nome
**Resumo:** o que mudou em 1-2 linhas.

### Mudanças
- arquivo/módulo: o que foi feito

### Validação
- como foi testado / o que ficou verde

### Observações
- qualquer coisa não óbvia (ver NOTES.md se virar ponto recorrente)
```

---

## 2026-05-11 — Fase 6 (storage offline + fila de sincronização)
**Fase:** 6
**Resumo:** infra de mutações offline pronta — `enqueueMutation()` + drain com retry exponencial + Background Sync. Não usa nenhuma feature ainda; preparada pra primeira feature offline real ser plugada sem alterar a infra.

### Mudanças
- `package.json`: + `idb-keyval` (usa `uuid` que já existia).
- `src/types/offline.types.ts`: `PendingMutation` (idempotencyKey, endpoint, method, body, headers, kind, createdAt, attempts, lastError, status) + `DrainResult` + `MutationMethod`.
- `src/lib/offline-store.ts`: wrapper tipado em cima de `idb-keyval`. Banco `adapta-driver-offline` com dois stores: `pendingMutations` e `cachedData` (slot livre pra futuras features). Função `clearOfflineStorage()` (deleta o banco — chamada no logout).
- `src/lib/offline-queue.ts`:
  - `enqueueMutation({endpoint, method, body, headers, kind})`: gera UUID v4, persiste, tenta drenar imediato, pede `Background Sync` ao SW.
  - `drainQueue()`: lock em memória, processa em ordem, envia `Idempotency-Key` no header, backoff exponencial (1s→60s, máx 8 tentativas). 409 trata como sucesso/idempotência (D7); 4xx (não-409) interrompe a fila; rede/5xx para a passagem.
  - `countPendingMutations()` helper.
- `src/components/pwa/OfflineQueueDrainer.tsx`: componente headless dentro do `AuthGate`. Dispara `drainQueue` no mount, no evento `online` da window e ao receber `PWA_DRAIN_QUEUE` do SW.
- `src/app/sw.ts`: novo listener `sync` (Background Sync) com tag `adapta-drain-queue` — SW não acessa IndexedDB do cliente, só posta mensagem pros clients drenarem.
- `src/context/AuthContext.tsx`: `clear()` chama `clearOfflineStorage()` no logout (resolve A4 LGPD).
- `docs/pwa/NOTES.md`: novas decisões D3 (idb-keyval), D4 atualizada (cliente pronto, backend pendente), D7 (política 409 = idempotência), D8 (logout apaga IDB).

### Validação
- Typecheck: OK.
- Pendente real: smoke test ponta a ponta (enfileirar offline → online → conferir POST/PATCH ao backend com `Idempotency-Key`).
- **Pendente cruzado:** `adapta-hub` precisa aceitar e desduplicar `Idempotency-Key`. Sem isso, retries podem duplicar efeito colateral. Ver D4 em NOTES.

### Observações
- **A infra não é usada por nenhuma feature ainda.** Para usar: `import { enqueueMutation } from "@/lib/offline-queue"` e chamar com `{ endpoint, method, body, kind }`.
- Limpeza no logout pode descartar mutações pendentes — aceitável por enquanto, revisitar se virar problema.
- Background Sync só funciona em Chromium. iOS/Safari caem no fallback (drain ao reabrir app + listener `online`).

---

## 2026-05-11 — Fase 5 (awareness online/offline)
**Fase:** 5
**Resumo:** banner global "Sem conexão" aparece quando o navegador detecta perda de rede; restante da revisão por tela e gating de ações fica adiado para Fase 6.

### Mudanças
- `src/hooks/useNetworkStatus.ts`: escuta `online`/`offline` + `navigator.onLine`, expõe `{ online, hydrated }`. `hydrated` evita flicker SSR (no servidor `online` é chutado como `true`).
- `src/components/pwa/OfflineBanner.tsx`: barra fixa no topo (z-50) com ícone `CloudOff` + texto "Sem conexão — alterações serão sincronizadas quando voltar online". Respeita `env(safe-area-inset-top)`.
- `src/app/layout.tsx`: renderiza `<OfflineBanner />` no topo do RootLayout (cobre rotas públicas + privadas, inclusive `/login` e `/~offline`).
- `docs/pwa/NOTES.md`: nova entrada D6 documentando por que os itens "revisão por tela" e "gating de ações" do ROADMAP 5 foram adiados para junto da Fase 6.

### Validação
- Typecheck: OK.
- Pendente real: DevTools → Network → Offline → barra preta aparece no topo; voltar online → barra some.

### Observações
- `navigator.onLine` é heurístico: `false` é confiável, `true` apenas indica que o adapter tem IP — não que existe internet real. Pra "internet real" precisa health-check (não no escopo da Fase 5).
- O banner não cobre o conteúdo embaixo. Telas que precisem deslocar (ex: header sticky) podem ler `useNetworkStatus()` e ajustar offset — não fizemos por enquanto pois nenhuma tela tem header sticky.

---

## 2026-05-11 — Fase 4 (UX de instalação)
**Fase:** 4
**Resumo:** banner "Instalar Adapta Motorista" aparece pra usuários autenticados não instalados, com modal de instruções específico pra iOS Safari.

### Mudanças
- `src/hooks/useInstallPrompt.ts`: captura `beforeinstallprompt` (Android/Chromium), detecta `display-mode: standalone` e iOS (UA + iPadOS via `maxTouchPoints`), expõe `{ isStandalone, isIOS, canPrompt, promptInstall }`. Listener de `appinstalled` loga `[pwa] appinstalled` (placeholder de telemetria).
- `src/components/pwa/InstallBanner.tsx`: banner fixo no bottom com botão "Instalar" + X de dismiss. Em Android dispara `promptInstall()`; em iOS abre modal com 3 passos visuais (Compartilhar → Adicionar à Tela de Início → Adicionar). Cooldown de 7 dias salvo em `localStorage` (`adapta-driver-install-dismissed-at`) — também acionado em outcome "dismissed" do prompt nativo. Delay de 3s antes de aparecer pra evitar popup imediato pós-login.
- `src/app/(private)/layout.tsx`: renderiza `<InstallBanner />` dentro do `AuthGate` + `GeolocationGate` (só usuários logados veem).

### Validação
- Typecheck: OK (sem erros novos).
- Pendente real: testar em Android Chrome (deve aparecer banner com prompt nativo), iOS Safari (deve aparecer banner abrindo modal de instruções), modo standalone (não deve aparecer nada), dismiss + reload em <7 dias (não reaparece).

### Observações
- Banner posicionado acima da `BottomNavigation` no mobile (`bottom-[calc(7rem+env(safe-area-inset-bottom))]`) e em `bottom-6` no desktop.
- Telemetria de `appinstalled` é só `console.info` por enquanto — quando entrar Sentry/backend de eventos, substituir.
- Banner NÃO aparece em rotas públicas (`/login`, `/register`) — está no private layout para acompanhar o roadmap ("após login bem-sucedido").

---

## 2026-05-11 — Fase 3 (cache de assets + página offline)
**Fase:** 3
**Resumo:** runtime caching ativo via `defaultCache` do Serwist; rota `/~offline` precacheada como fallback de navegação quando offline.

### Mudanças
- `src/app/~offline/page.tsx`: nova rota com hero "Você está offline" + botão "Tentar novamente" (reload). Convenção `~offline` do Serwist.
- `src/app/sw.ts`: adicionada config `fallbacks.entries` apontando `/~offline` para requests com `destination === "document"` (navegações).
- `docs/pwa/NOTES.md`: nova entrada D5 documentando o `defaultCache` adotado, estratégias resolvidas por tipo de recurso e desvios em relação ao ROADMAP 3.2 (imagens SWR vs CacheFirst, APIs NetworkFirst vs SWR). Inclui checklist de endpoints sensíveis (auth — todos POST/PATCH, já excluídos) e nota sobre limpar caches no logout (pendente, vinculada à Fase 6).

### Validação
- Typecheck: OK (nenhum erro novo).
- Pendente (real): rodar `next build`, conferir tamanho do precache (<5MB), testar offline no DevTools (recarregar página, navegar entre rotas visitadas e não visitadas), validar Lighthouse PWA ≥ 90.

### Observações
- `defaultCache` cobre 90% dos casos do roadmap; manter como baseline. Customizar só se aparecer problema concreto em campo.
- Auth endpoints (login/register/forgot/reset/token) são todos POST/PATCH → naturalmente fora do cache. Se surgir um GET com dados sensíveis (ex: `/auth/me`), adicionar `denylist` explícita.

---

## 2026-05-11 — Fase 2 (Service Worker esqueleto + UX de update)
**Fase:** 2
**Resumo:** Service Worker pipeline no ar via `@serwist/next`, com SW desligado em dev, política de update por prompt (não skipWaiting automático) e UI de "Nova versão disponível".

### Mudanças
- `package.json`: + `@serwist/next ^9.5.11`, + `serwist ^9.5.11`.
- `next.config.ts`: wrap com `withSerwistInit`. `swSrc: src/app/sw.ts`, `swDest: public/sw.js`, `disable: NODE_ENV === "development"`, `reloadOnOnline: true`.
- `src/app/sw.ts`: entry do SW com `Serwist({ precacheEntries, skipWaiting: false, clientsClaim: true, navigationPreload: true, runtimeCaching: defaultCache })` + listener `message` para `SKIP_WAITING`. `/// <reference lib="webworker" />` no topo pra resolver tipos de `ServiceWorkerGlobalScope`.
- `src/hooks/useServiceWorkerUpdate.ts`: detecta SW em waiting (estado inicial + `updatefound`), retorna `{ updateAvailable, applyUpdate }`; recarrega no `controllerchange`.
- `src/components/pwa/UpdatePrompt.tsx`: banner fixo `bottom` com botão "Atualizar". Renderizado no `RootLayout` (cobre rotas públicas e privadas).
- `src/app/layout.tsx`: importa e renderiza `<UpdatePrompt />`.
- `.gitignore`: ignora `public/sw.js`, `public/sw.js.map`, `public/swe-worker-*.js`, `public/workbox-*.js`.

### Validação
- Typecheck: `npx tsc --noEmit` limpo na nova superfície (único erro restante é pré-existente em `DocumentDetailScreen.tsx:211` — `step.action` em dead code).
- Pendente (real): build prod (`next build`), abrir Application → Service Workers, fazer 2º deploy para validar prompt, confirmar que SW NÃO registra em `npm run dev`.

### Observações
- Decisão D2 (estratégia de update) resolvida — ver NOTES.md.
- Auto-aplicação após N horas (caso usuário ignore o prompt) fica para iteração futura. Atualmente o prompt fica visível indefinidamente até clique.

---

## 2026-05-11 — Fase 1 (manifest + ícones + metadata)
**Fase:** 1
**Resumo:** PWA agora é instalável — manifest válido, ícones em `public/icons/` (placeholders), metadata e viewport no layout root.

### Mudanças
- `src/app/manifest.ts`: Metadata Route do Next com `name`, `short_name`, `start_url`, `display: standalone`, `theme_color: #ed6842`, `orientation: portrait`, `lang: pt-BR`, 4 ícones (`any` + `maskable`, 192/512).
- `public/icons/`: criada com 5 PNGs placeholder (gerados via PowerShell + System.Drawing — fundo `#ed6842`, letra "A" branca):
  - `icon-192.png`, `icon-512.png` (purpose any)
  - `icon-maskable-192.png`, `icon-maskable-512.png` (purpose maskable, fonte 40% pra safe area)
  - `apple-touch-icon.png` (180×180)
- `src/app/layout.tsx`: adicionados `manifest`, `applicationName`, `appleWebApp`, `icons` no `metadata` e novo export `viewport` (width, initialScale, maximumScale, userScalable, viewportFit cover, themeColor).

### Validação
- Pendente: deploy em staging, abrir Chrome DevTools → Application → Manifest, instalar em Android/iOS reais, rodar Lighthouse.

### Observações
- Os PNGs são placeholders — substituir por arte final antes de produção. Basta sobrescrever os arquivos em `public/icons/` mantendo os nomes; nenhuma alteração de código necessária.
- Splash screens iOS (item 1.4 do ROADMAP) foram pulados nesta primeira passada — entrar depois junto com QA.

---

## 2026-04-30 — Estrutura inicial de planejamento criada
**Fase:** —
**Resumo:** criados `docs/pwa/README.md`, `ROADMAP.md`, `CHANGELOG.md` e `NOTES.md` para acompanhar a transformação em PWA. Nenhuma mudança de código ainda.

### Mudanças
- `docs/pwa/README.md`: visão geral, justificativa e índice.
- `docs/pwa/ROADMAP.md`: plano em 8 fases + manutenção, com checklists.
- `docs/pwa/CHANGELOG.md`: este arquivo.
- `docs/pwa/NOTES.md`: pontos de atenção iniciais e decisões pendentes.

### Validação
- N/A (apenas documentação).

### Observações
- Stack alvo: Next.js 16 + `@serwist/next`. Decisão registrada em NOTES.
