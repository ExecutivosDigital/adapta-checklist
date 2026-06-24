# Roadmap — PWA Adapta Driver

Plano fragmentado em fases. Cada fase é um conjunto coeso e independentemente deployável. **Marque `[x]` ao concluir cada item** e registre a mudança no [CHANGELOG.md](./CHANGELOG.md).

> **Regra de ouro:** nenhuma fase começa antes da anterior estar concluída e validada. PWA é stateful (Service Worker fica preso no navegador do usuário) — bug em fase anterior contamina as seguintes.

---

## Fase 0 — Pré-requisitos & Auditoria

**Objetivo:** garantir que o terreno está pronto antes de mexer em qualquer código.

- [ ] Confirmar que o domínio de produção serve via **HTTPS** (Service Worker exige; `localhost` é exceção em dev).
- [ ] Confirmar versão do Next.js no `package.json` (atualmente `^16.2.1`) e se a estratégia escolhida (`@serwist/next`) é compatível.
- [ ] Definir lista de **dispositivos/browsers alvo** (mínimo: Android Chrome ≥ X, iOS Safari ≥ Y) e registrar em NOTES.
- [ ] Auditar `viewport` meta atual e cobertura de `safe-area-inset-*` no CSS.
- [ ] Levantar tamanho atual do bundle JS (`next build`) — vai ser baseline para comparar depois do precache.
- [ ] Decidir hospedagem definitiva (Vercel? Cloudflare? Self-hosted?) — afeta headers e scope do SW.

**Saída:** documento em NOTES com decisões; nenhum código alterado ainda.

---

## Fase 1 — Manifest & Ícones (PWA "instalável" mínimo)

**Objetivo:** depois desta fase, o app pode ser instalado na tela inicial. Ainda **não** funciona offline.

### 1.1 — Manifest
- [x] Criar `src/app/manifest.ts` (Metadata Route do Next 13+) com: `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `background_color`, `theme_color: "#ed6842"`, `orientation: "portrait"`, `lang: "pt-BR"`.
- [ ] Validar manifest gerado em `/manifest.webmanifest` (Chrome DevTools → Application → Manifest).

### 1.2 — Ícones
- [x] Gerar set de ícones a partir do logo: *(placeholders — substituir por arte final antes de produção)*
  - `icon-192.png` (192×192)
  - `icon-512.png` (512×512)
  - `icon-maskable-192.png` (192×192, com safe area de 20%)
  - `icon-maskable-512.png` (512×512, com safe area de 20%)
  - `apple-touch-icon.png` (180×180, sem cantos arredondados — iOS arredonda)
- [x] Colocar todos em `public/icons/` (criar a pasta `public/`, ainda não existe).
- [x] Referenciar todos no manifest (`icons[]`) com `purpose: "any"` e `purpose: "maskable"` separados.

### 1.3 — Metadata do `app/layout.tsx`
- [x] Adicionar em `metadata`:
  - `manifest: "/manifest.webmanifest"`
  - `themeColor: "#ed6842"`
  - `appleWebApp: { capable: true, statusBarStyle: "default", title: "Adapta Motorista" }`
  - `icons: { apple: "/icons/apple-touch-icon.png" }`
- [x] Adicionar `viewport` export com `width: "device-width"`, `initialScale: 1`, `maximumScale: 1`, `userScalable: false`, `viewportFit: "cover"`.

### 1.4 — Splash screens iOS (opcional, mas recomendado)
- [ ] Gerar splash screens iOS para os principais tamanhos (iPhone SE/8/X/11/12/13/14/15) — biblioteca `pwa-asset-generator` ajuda.
- [ ] Adicionar `<link rel="apple-touch-startup-image" media="..." href="..." />` para cada.

### 1.5 — Validação
- [ ] Build & deploy em staging.
- [ ] Em Android Chrome: aparecer prompt "Adicionar à tela inicial" → instalar → abrir → conferir ícone, splash e modo standalone (sem URL bar).
- [ ] Em iOS Safari: Compartilhar → "Adicionar à Tela de Início" → conferir ícone e modo standalone.
- [ ] Rodar Lighthouse → seção PWA "Installable" toda verde.

---

## Fase 2 — Service Worker (esqueleto)

**Objetivo:** ter um Service Worker registrado, carregando, atualizando-se corretamente, **sem** ainda fazer cache agressivo. Foco é botar o pipeline no ar.

### 2.1 — Setup
- [x] Instalar `@serwist/next` e `serwist`.
- [x] Configurar `next.config.ts` com `withSerwist`.
- [x] Criar `src/app/sw.ts` (entry do Service Worker) — começar com config mínima (precache de `/`, sem runtime caching ainda).
- [x] Garantir que SW é **registrado apenas em produção** (em dev causa cache infernal — registrar via `useEffect` no root client component).

### 2.2 — Política de versionamento
- [x] Definir como o SW vai se identificar (versão atrelada ao build hash do Next, ou env var manual). *(Hash do build do Next via `__SW_MANIFEST` — atualização detectada por mudança do precache manifest.)*
- [x] Configurar `skipWaiting`/`clientsClaim` — **decisão**: ativar imediato ou prompt "atualizar"? Registrar escolha em NOTES. *(D2 resolvida: prompt via `<UpdatePrompt />`; `skipWaiting: false` + `clientsClaim: true`.)*

### 2.3 — UX de update
- [x] Hook `useServiceWorkerUpdate` que escuta `controllerchange` e expõe estado "nova versão disponível".
- [x] Componente `<UpdatePrompt />` que aparece como banner/toast quando há nova versão, com botão "Atualizar agora" (faz `postMessage({type:'SKIP_WAITING'})` + reload).

### 2.4 — Validação
- [ ] Build & deploy. Abrir Application → Service Workers no DevTools, conferir SW ativo.
- [ ] Fazer um deploy novo e validar que o prompt de update aparece.
- [ ] Confirmar que SW **não está ativo em dev** (`npm run dev`).

---

## Fase 3 — Cache de assets & runtime

**Objetivo:** app abre offline ou em conexão ruim, com pelo menos a interface básica funcional (mesmo que dados sejam fallback).

### 3.1 — Precache (build time)
- [x] Configurar Serwist para precachear: HTML do shell, JS/CSS do build, fontes, ícones. *(via `self.__SW_MANIFEST` gerado automaticamente pelo build do Next.)*
- [ ] Conferir tamanho do precache — se passar de ~5MB, revisar (motoristas em rede ruim sofrem no primeiro load). *(Pendente — só dá pra medir após `next build`.)*

### 3.2 — Runtime caching (rotas e estratégias)
Definir estratégia por tipo de recurso:

- [x] **Páginas HTML (navegação)**: `NetworkFirst` com fallback `CacheFirst` (timeout 3s). *(Via `defaultCache` — NetworkFirst com fallback para `/~offline` quando nem network nem cache resolverem. Ver D5 em NOTES.)*
- [x] **Imagens** (incluindo `next/image`): `CacheFirst` com expiração (ex: 30 dias, max 60 entries). *(Default usa SWR 24h/64 entries — desvio documentado em D5.)*
- [x] **Fontes do Google** (Poppins): `CacheFirst` com expiração longa (1 ano). *(Via `defaultCache` — `fonts.gstatic.com`.)*
- [x] **APIs GET de leitura** (`/api/...`): `StaleWhileRevalidate` — entrega cache instantâneo + atualiza em background. *(Default usa NetworkFirst — desvio documentado em D5.)*
- [x] **APIs de mutação (POST/PUT/DELETE)**: NÃO cachear; apenas registrar para fila offline (Fase 6). *(SW só intercepta GET por padrão.)*

### 3.3 — Página offline fallback
- [x] Criar `src/app/offline/page.tsx` simples (logo + "Você está offline" + botão "Tentar novamente"). *(Criada como `src/app/~offline/page.tsx` — convenção do Serwist.)*
- [x] Configurar Serwist para servir essa rota como fallback quando navegação falhar e cache não tiver a página. *(Via `fallbacks.entries` no `sw.ts`.)*
- [x] Garantir que `/offline` está na lista de precache. *(Auto-incluída via `__SW_MANIFEST` por ser uma rota estática do build.)*

### 3.4 — Validação
- [ ] DevTools → Network → Offline → recarregar página: app abre.
- [ ] Navegar entre rotas já visitadas offline: funciona (renderiza com último dado em cache).
- [ ] Navegar para rota nunca visitada offline: cai em `/offline`.
- [ ] Lighthouse PWA score ≥ 90.

---

## Fase 4 — UX de instalação

**Objetivo:** orientar ativamente o motorista a instalar, em vez de depender dele descobrir sozinho.

- [x] Hook `useInstallPrompt` que captura o evento `beforeinstallprompt` (Android/desktop Chrome) e expõe `canInstall` + `promptInstall()`.
- [x] Componente `<InstallBanner />` que aparece após N segundos / após login bem-sucedido — com cooldown (não mostrar se usuário dispensou nas últimas X horas, salvar em `localStorage`). *(3s após mount, cooldown de 7 dias.)*
- [x] Detecção de iOS Safari (sem `beforeinstallprompt`) → modal com instruções visuais ("Toque em Compartilhar → Adicionar à Tela de Início").
- [x] Detecção de **modo standalone** (`window.matchMedia('(display-mode: standalone)')`) → não mostrar banner se já instalado. *(Cobre iPad via `navigator.standalone` também.)*
- [x] Telemetria simples: log/contador de quantos usuários instalaram (via evento `appinstalled`). *(Hoje só `console.info("[pwa] appinstalled")` — substituir por evento real depois.)*

---

## Fase 5 — UX online/offline awareness

**Objetivo:** motorista sabe a qualquer momento se está online ou não, e o que está pendente de sincronizar.

- [x] Hook `useNetworkStatus` (escuta `online`/`offline` events + `navigator.onLine`).
- [x] Componente global `<OfflineBanner />` no layout: barra fixa no topo com "Sem conexão — alterações serão sincronizadas quando voltar online".
- [ ] Revisar telas que **dependem fortemente de rede** (ex: lista de ofertas) — mostrar estado "última atualização há X min, atualize quando voltar online". *(Adiado — depende da Fase 6 e de definição por feature. Ver D6 em NOTES.)*
- [ ] Desabilitar/avisar em ações que **exigem rede agora** (ex: aceitar oferta) — ou enfileirar (Fase 6). *(Adiado — depende da Fase 6. Ver D6 em NOTES.)*

---

## Fase 6 — Storage offline & fila de sincronização

**Objetivo:** preparar o terreno para as features offline futuras que motivaram este projeto. **Não implementa a feature em si**, apenas a infra.

### 6.1 — Storage local
- [x] Decidir entre `idb-keyval` (simples, key-value) ou `Dexie` (queries, índices) — registrar critério em NOTES. *(D3: idb-keyval.)*
- [x] Criar wrapper em `src/lib/offline-store.ts` com tipagem.
- [x] Definir schema inicial (mesmo que vazio): `pendingMutations`, `cachedTrips`, `cachedReceipts`, etc. *(`pendingMutations` + `cachedData` no banco `adapta-driver-offline`.)*

### 6.2 — Fila de mutações
- [x] Padrão: toda mutação que precise funcionar offline passa por `enqueueMutation({endpoint, method, body, idempotencyKey})`.
- [x] Worker de drenagem: quando volta online, processar fila em ordem, com retry exponencial. *(Backoff 1s → 60s, máx 8 tentativas.)*
- [x] Tratamento de **conflito** (servidor responde 409 ou similar): registrar em NOTES o protocolo (last-write-wins? merge? prompt usuário?). *(D7: 409 = idempotência satisfeita, remove da fila.)*
- [x] **Idempotência**: cada mutação carrega `idempotencyKey` (UUID gerado no cliente) — backend precisa respeitar (alinhar com adapta-api). *(Cliente envia header `Idempotency-Key`. D4: backend ainda pendente — alinhar com `adapta-hub`.)*

### 6.3 — Background Sync (onde suportado)
- [x] Registrar `sync` event no SW → tenta drenar fila quando navegador detecta conectividade. *(Tag `adapta-drain-queue` — SW notifica clients via `postMessage({type:"PWA_DRAIN_QUEUE"})`.)*
- [x] Fallback para iOS / browsers sem suporte: drenar quando app reabre + listener de `online`. *(Implementado no `OfflineQueueDrainer`.)*

### 6.4 — Validação
- [ ] Smoke test com mutação fake: enfileirar offline → voltar online → confirmar que foi enviada.
- [ ] Confirmar que `idempotencyKey` evita duplicatas em retry. *(Bloqueado por D4 — backend precisa implementar.)*

---

## Fase 7 — Push notifications (opcional, gating depende de produto)

**Objetivo:** notificar motorista sobre novas viagens, mensagens, etc. **Reavaliar se entra no escopo** antes de começar.

- [ ] Gerar par de chaves VAPID (público/privado).
- [ ] Endpoint backend de subscribe/unsubscribe (alinhar com adapta-api).
- [ ] Hook `usePushSubscription` no front.
- [ ] **Permissão progressiva**: nunca pedir no load; pedir após gesto explícito ("Quero receber alertas").
- [ ] Handler `push` no SW que mostra notificação + handler `notificationclick` que abre rota relevante.
- [ ] Telemetria: rastrear taxa de subscribe/unsubscribe.

---

## Fase 8 — QA, deploy & rollout

**Objetivo:** entregar com segurança e ter plano de rollback.

- [ ] Lighthouse PWA audit final → meta: 100 em "Installable" e ≥ 90 em "PWA Optimized".
- [ ] Teste em **dispositivos reais** (não só DevTools): pelo menos 1 Android baixo/médio + 1 iOS recente. Listar dispositivos testados em NOTES.
- [ ] Validar headers no host (especialmente `Service-Worker-Allowed` se SW estiver em path não-raiz).
- [ ] **Plano de "kill switch"**: ter forma de desregistrar SW remotamente (ex: deploy de SW vazio que faz `self.registration.unregister()`) caso descubra bug crítico em produção. Documentar passo-a-passo em NOTES.
- [ ] Documentar processo de **release**: como subir nova versão sem deixar usuários presos em SW antigo.
- [ ] Comunicar usuários (in-app banner uma vez) que o app virou instalável.

---

## Pós-rollout — Manutenção contínua

- [ ] Monitorar métricas: % de usuários instalados, taxa de reabertura offline, falhas no SW.
- [ ] Revisar estratégias de cache trimestralmente (rotas mudam, padrões de uso mudam).
- [ ] Atualizar este roadmap conforme features offline reais (Fases futuras) forem definidas.
