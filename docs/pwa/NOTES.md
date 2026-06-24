# Notes — PWA Adapta Driver

Pontos de atenção, decisões arquiteturais, problemas encontrados e workarounds. Diferente do CHANGELOG (que é factual e cronológico), este arquivo é **prescritivo** — quem chegar depois precisa entender o "porquê".

Organizado por tópicos. Adicionar livre, mas tentar manter dentro das seções existentes.

---

## Pontos de atenção (gerais, válidos durante todo o projeto)

### A1 — Service Worker é stateful e "preso" no navegador do usuário
Diferente de uma página web normal, um SW com bug fica ativo no dispositivo do motorista até **ele** rodar a checagem de update (ou o cache expirar). Consequências:
- Bugs em produção podem levar dias para sumir mesmo após hotfix.
- Sempre ter **"kill switch"** preparado (ver Fase 8 do ROADMAP).
- Em dev, **nunca** registrar SW (causa cache infernal entre rebuilds).

### A2 — iOS é o lado fraco da plataforma PWA
- Sem **Background Sync** confiável → fila offline depende de o app ser reaberto.
- Sem **Periodic Background Sync**.
- Push notifications: **só iOS ≥ 16.4** e **só após instalado** (Add to Home Screen).
- Storage: navegador pode apagar dados se o dispositivo estiver sem espaço; **não há promessa de durabilidade** sem `navigator.storage.persist()` (que pede permissão no iOS).
- `beforeinstallprompt` **não existe** → fluxo de instalação é manual via Compartilhar.

→ **Implicação arquitetural:** se uma feature offline é crítica para a operação, ela não pode depender exclusivamente de Background Sync. Sempre ter fallback de "drenar fila quando app abrir".

### A3 — HTTPS obrigatório
Service Worker só funciona em `https://` ou `localhost`. Se houver staging em domínio HTTP, PWA não testa lá.

### A4 — LGPD e dados sensíveis em cache
Cachear respostas de API significa que dados do motorista (CPF, viagens, valores financeiros) ficam no IndexedDB/Cache Storage do dispositivo. Considerar:
- Limpar cache no logout (`caches.delete()` + `indexedDB.deleteDatabase()`).
- **Não cachear** endpoints com dados especialmente sensíveis (token, credenciais).
- TTL agressivo em dados que podem ficar stale (ex: saldo financeiro).

### A5 — Câmera, geolocalização e PWA
O app já usa `html5-qrcode` (câmera) e `GeolocationGate`. Em PWA standalone:
- Permissões **persistem** entre sessões (bom).
- **Mas** se o usuário negar uma vez, recuperar exige instruir ele a ir em Ajustes → Site → Permissões. Documentar UX para isso.

---

## Decisões arquiteturais

### D1 — Biblioteca de Service Worker: `@serwist/next`
**Decidido em:** 2026-04-30 (aguardando validação prática).

**Alternativas consideradas:**
- `next-pwa`: defasado, último release sem suporte completo a Next 15+. Muitos issues abertos.
- Service Worker manual + Workbox: maior flexibilidade, mas precisa integrar manualmente com pipeline de build do Next.
- `@serwist/next`: sucessor espiritual do `next-pwa`, mantido, suporta App Router.

**Critério:** menor atrito com Next 16 + App Router. Reavaliar se descobrirmos limitação dura.

### D2 — Estratégia de update do SW: **prompt explícito**
**Decidido em:** 2026-05-11 (Fase 2 implementada).

Optamos por **prompt** (não `skipWaiting` automático). Implementação:
- `sw.ts` usa `skipWaiting: false` + `clientsClaim: true`. Listener de `message` no SW aceita `{ type: "SKIP_WAITING" }`.
- Hook `useServiceWorkerUpdate` detecta SW em waiting e expõe `{ updateAvailable, applyUpdate }`.
- Componente `<UpdatePrompt />` (renderizado no `RootLayout`) mostra banner "Nova versão disponível" com botão "Atualizar"; ao clicar, posta `SKIP_WAITING` e o `controllerchange` dispara `window.location.reload()`.

**Pendente:** auto-aplicação após N horas se o usuário ignorar — fica para uma iteração futura (não bloqueia Fase 3).

### D3 — Storage local: **`idb-keyval`** (revisar se a primeira feature offline exigir queries)
**Decidido em:** 2026-05-11 (Fase 6 implementada).

Optamos por `idb-keyval` pelo menor footprint (~600B) e API mínima. Wrapper tipado fica em `src/lib/offline-store.ts` com dois stores no banco `adapta-driver-offline`:
- `pendingMutations` — fila offline.
- `cachedData` — slot livre pra futuras features que precisarem cachear payloads (ex: viagens, ofertas).

**Sinais pra migrar para Dexie:**
- Lista cacheada >2k itens com filtros frequentes (ex: histórico de viagens com filtro por status + range de data).
- Necessidade de transações multi-store.
- Live queries (UI reativa a mudanças no store).

Migração é viável sem perda de dados (mesmo IndexedDB físico), só troca da camada de acesso.

### D4 — Idempotência das mutações offline
**Status:** front pronto, **backend pendente** (dependência cruzada com `adapta-hub`).

Cliente: cada `PendingMutation` gera UUID v4 (lib `uuid`), persiste em IndexedDB e envia como header `Idempotency-Key: <uuid>` em toda tentativa de drenar. Implementação em `src/lib/offline-queue.ts` (`executeMutation`).

**Backend (adapta-hub) precisa:**
- Aceitar o header `Idempotency-Key` em endpoints mutáveis usados pelo driver.
- Para cada chave, persistir o resultado da primeira execução. Retries com mesma chave devolvem o mesmo resultado **sem reaplicar efeito colateral** (cobra/desconta uma só vez, registra entrega uma só vez, etc.).
- Janela de retenção sugerida: 24h (suficiente pra rede ruim de motorista).

**Status atual:** abrir conversa com time do `adapta-hub` antes de a primeira feature offline ir pra produção. Enquanto não há suporte:
- O cliente já manda o header — backend pode ignorar sem quebrar.
- Risco: se o cliente reenviar (timeout entre cliente e servidor após o servidor processar) e o backend não desduplica, motorista registra entrega 2x.
- **Mitigação enquanto backend não topa:** deixar primeira feature offline ser somente operações que toleram duplicidade (raras) OU operações com idempotência natural (ex: `PUT` em recurso identificado, que sobrescreve em vez de criar).

---

### D5 — Estratégias de cache runtime: usar `defaultCache` do `@serwist/next/worker`
**Decidido em:** 2026-05-11 (Fase 3 implementada).

O Serwist exporta um `defaultCache` (de `@serwist/next/worker`) com regras razoáveis pro Next.js. Adotamos como baseline em vez de escrever cada estratégia manualmente. Resumo das regras:
- **Google Fonts stylesheets** (`fonts.googleapis.com`): StaleWhileRevalidate.
- **Google Fonts webfonts** (`fonts.gstatic.com`): CacheFirst, 1 ano, 4 entries.
- **Áudio / vídeo**: CacheFirst.
- **Imagens** (não-Next): StaleWhileRevalidate, 24h, 64 entries.
- **`/_next/image`**: StaleWhileRevalidate, 24h, 64 entries.
- **Estáticos JS/CSS / `__NEXT_DATA__`**: StaleWhileRevalidate.
- **APIs (`/api/*` same-origin)**: NetworkFirst.
- **Same-origin catch-all**: NetworkFirst.
- **Cross-origin**: NetworkFirst.

**Desvios em relação ao ROADMAP 3.2:**
- Roadmap pedia **CacheFirst** para imagens (economia de banda); usamos **SWR** (defaultCache). Aceitável — revisitar se for problema em campo.
- Roadmap pedia **SWR** para APIs GET de leitura; defaultCache usa **NetworkFirst**. Mais seguro: dados não ficam "stale" em uma volta de rede. Trocar para SWR caso latência percebida vire problema.

**Endpoints sensíveis (auth, dados pessoais):**
- Mutations (POST/PATCH/DELETE) não são cacheadas — comportamento default do Workbox/Serwist (só intercepta GET).
- `/auth/contact-login`, `/auth/contact-register`, `/auth/*-password`, `/auth/contact-token`: são todos POST/PATCH → naturalmente excluídos.
- **Pendente:** se surgir um GET `/auth/me` ou similar com dados sensíveis, adicionar `denylist` explícita pra não cachear. Hoje não existe — `useAuth().user` vem do cookie do login.

**Limpeza no logout:** ver A4 (ainda não implementada). Quando entrar storage offline (Fase 6), `logout()` precisa também executar `caches.delete()` + `indexedDB.deleteDatabase()`.

---

### D6 — Revisão por tela e gating de ações offline: adiado para junto da Fase 6
**Decidido em:** 2026-05-11 (Fase 5 implementada).

O ROADMAP 5 pede:
- (a) Telas dependentes de rede mostram "última atualização há X min".
- (b) Ações que exigem rede ficam desabilitadas ou enfileiradas offline.

Adiamos ambas porque dependem de decisões da Fase 6:
- (a) "Última atualização" só faz sentido se o dado vier do storage offline (caso contrário não há "última atualização salva" para citar) — exige `cachedTrips` / `cachedOffers` etc. já no IndexedDB.
- (b) "Enfileirar" depende de `enqueueMutation` + `idempotencyKey`, que são a infra da Fase 6.

**Hoje (Fase 5 entregue):** o usuário sabe que está offline pelo `<OfflineBanner />` global. Qualquer mutação que falhar mostra o erro padrão da API. Sem regressão em relação ao estado anterior.

**Próximo passo:** ao iniciar Fase 6, definir a primeira feature offline concreta (provavelmente "aceitar oferta" ou "registrar entrega" — alinhar com produto), implementar `enqueueMutation` específico pra ela, e então revisar a respectiva tela conforme (a) e (b).

---

### D7 — Política de conflito 409: tratar como sucesso (idempotência satisfeita)
**Decidido em:** 2026-05-11 (Fase 6 implementada).

Quando o servidor responde 409 ao drenar uma mutação, assumimos que ele **já registrou aquele `Idempotency-Key`** em uma tentativa anterior (sucesso parcial → cliente perdeu o ACK). O cliente remove a mutação da fila e contabiliza como drenada.

Outras opções consideradas e descartadas:
- **Reprocessar / aplicar de novo:** quebra a premissa de idempotência. Pode duplicar efeito caso o backend interprete 409 como "outra coisa que colidiu". Inseguro.
- **Prompt no usuário:** UX ruim para motorista em rota — interrompe o fluxo por algo que normalmente é benigno.

**Caveat:** se o backend usar 409 pra coisa diferente de idempotência (ex: "viagem cancelada por outro ator"), essa política perde silenciosamente a mutação. Para evitar, alinhar com `adapta-hub` que 409 nos endpoints do driver só sinaliza idempotência. Outras colisões devem retornar 422.

### D8 — Limpeza de IndexedDB no logout
**Decidido em:** 2026-05-11 (Fase 6 implementada).

`logout()` (e o `clear()` interno do `AuthContext` disparado por 401) chama `clearOfflineStorage()`, que executa `indexedDB.deleteDatabase("adapta-driver-offline")`. Resolve A4 (LGPD) — viagens, mutações pendentes, dados pessoais cacheados desaparecem.

**Limitação:** se houver mutações pendentes não drenadas, elas são perdidas no logout. Aceitável: motorista que faz logout com fila pendente está deliberadamente abandonando aquelas operações. Se virar problema (ex: app fechado força logout), revisitar — talvez bloquear logout enquanto fila não estiver vazia.

---

## Problemas encontrados / workarounds

*(vazio até agora — adicionar conforme aparecerem; usar formato `### YYYY-MM-DD — Título`)*

---

## Decisões pendentes (lista viva)

- [ ] **Hospedagem definitiva** (Vercel? Cloudflare? Self-hosted?) — afeta headers e scope do SW.
- [ ] **Lista de devices alvo mínima** (Android Chrome ≥ ?, iOS Safari ≥ ?).
- [x] **Comportamento de update** (D2). *(Decidido: prompt + reload, ver D2.)*
- [x] **Storage lib** (D3). *(Decidido: idb-keyval — ver D3.)*
- [ ] **Push notifications entram no escopo da v1?** (Fase 7 — opcional).
- [x] **Política de logout** com cache (limpa tudo? mantém cache "público"?). *(Decidido: limpa tudo — ver D8.)*
- [x] **Tratamento de conflito 409** ao drenar fila offline (last-write-wins? prompt usuário?). *(Decidido: trata como sucesso/idempotência — ver D7.)*
- [ ] **Telemetria de PWA** — onde mandar (Sentry? evento custom no backend?).

---

## Referências externas úteis

*(adicionar links conforme forem consultados — RFCs, docs do Serwist, posts de blog que ajudaram)*

- Web.dev — [Progressive Web Apps](https://web.dev/progressive-web-apps/)
- MDN — [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- Serwist docs — *(adicionar URL na Fase 2.1)*
