# Testes manuais — PWA & Offline

Roteiro de validação ponta a ponta do `adapta-driver` rodando como PWA com APIs reais (não mocks). Foco: instalação, Service Worker, cache, awareness online/offline, fila de sincronização e idempotência.

Este documento **assume que as features de domínio (viagens, ofertas, entrega) já estão integradas a endpoints reais e que ao menos uma mutação está usando `enqueueMutation`**. Enquanto o app ainda usar dados mock e nenhuma feature usar a fila, partes desta validação ficarão como "não aplicável" — ver seção [O que não dá pra testar com mocks](#o-que-não-dá-pra-testar-com-mocks).

> Para o contexto técnico de cada fase do PWA, ver [ROADMAP.md](./ROADMAP.md) e [NOTES.md](./NOTES.md).

---

## Pré-requisitos

### Ambiente

- **Service Worker exige HTTPS.** `localhost` é exceção, mas para celular precisamos de túnel HTTPS público (`cloudflared`, `ngrok`, ou hospedagem real).
- **SW NÃO registra em `NODE_ENV=development`.** Toda validação roda em build de produção (`npm run build && npm run start`).
- **Limpar estado entre testes:** DevTools (no PC, via `chrome://inspect`) → Application → Storage → "Clear site data". Sem isso, SW antigo, cache antigo, IndexedDB antigo contaminam o teste seguinte.

### Variáveis de ambiente (`.env.local`)

`NEXT_PUBLIC_*` são embutidos no build — qualquer mudança exige `npm run build` de novo.

```
NEXT_PUBLIC_API_URL=https://<tunnel-do-adapta-hub>
NEXT_PUBLIC_CTE_API_URL=https://<tunnel-do-fiscal-api>   # se for testar entrega SEFAZ
NEXT_PUBLIC_USER_TOKEN=adapta_driver_token
NEXT_PUBLIC_USER_DATA=adapta_driver_user
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<key sem restrição de domínio em dev>
```

### Setup (4 terminais)

1. **adapta-hub** (porta 3334): `npm run start:dev` no projeto do hub.
2. **Tunnel do hub**: `cloudflared tunnel --url http://localhost:3334` → anota a URL HTTPS.
3. **adapta-driver**: ajusta `.env.local` com a URL do passo 2 → `npm run build && npm run start`.
4. **Tunnel do driver**: `cloudflared tunnel --url http://localhost:3000` → essa é a URL que você abre no celular.

### Dispositivos alvo

Mínimo recomendado por bateria de teste:
- **1 Android** com Chrome (≥ versão recente; ideal um device baixo/médio).
- **1 iOS** com Safari (≥ 16.4 se quisermos validar PWA com push no futuro).

Diferenças entre os dois afetam vários cenários — sempre rodar a bateria nos dois.

### Como debugar no celular

- **Android Chrome:** no PC, abrir `chrome://inspect/#devices`. Aparece o tab aberto no celular conectado via USB. Pode usar DevTools normal (Application, Console, Network).
- **iOS Safari:** Mac com Safari → menu Desenvolvedor → escolher o dispositivo. (Não há equivalente em Windows.)
- Sempre que falar "Application → X", refere-se ao DevTools do Chrome remoto.

---

## Roteiro de testes

Convenções:

- 🟢 = funcionalidade core, **bloqueia release** se falhar.
- 🟡 = nice-to-have ou caso de borda, falha não bloqueia mas precisa investigar.
- 📱 = só faz sentido testar em celular real.
- 🖥️ = pode testar no DevTools desktop primeiro, mas confirmar no celular antes de fechar.

Cada teste tem: **Pré-condição**, **Passos**, **Resultado esperado**, **Se falhar**.

---

### 1. Manifest e ícones (Fase 1)

#### 1.1 — Manifest válido 🟢 🖥️

**Pré-condição:** build em produção, app aberto via URL do tunnel.

**Passos:**
1. DevTools → Application → Manifest.
2. Verificar campos: `name`, `short_name`, `start_url=/`, `display=standalone`, `theme_color=#ed6842`, `orientation=portrait`, `lang=pt-BR`.
3. Verificar que aparecem **4 ícones** (192 any, 512 any, 192 maskable, 512 maskable).

**Resultado esperado:** todos os campos presentes, nenhum warning em vermelho.

**Se falhar:** confirmar que `src/app/manifest.ts` existe e que o build incluiu a rota. Conferir `npm run build` por erros.

#### 1.2 — Ícones em produção 🟡

**Pré-condição:** arte final dos ícones já foi entregue.

**Passos:**
1. Conferir `public/icons/` — devem estar lá os 5 PNGs reais (não os placeholders laranja com "A"):
   - `icon-192.png`, `icon-512.png` (purpose any)
   - `icon-maskable-192.png`, `icon-maskable-512.png` (safe area de 20%)
   - `apple-touch-icon.png` (180×180)
2. Conferir em [maskable.app/editor](https://maskable.app/editor) que os ícones maskable não cortam conteúdo importante.

**Resultado esperado:** ícones reais no diretório, maskables com safe area correta.

**Se falhar:** ícones ainda são placeholders → substituir os arquivos mantendo os nomes; sem mudança de código necessária.

---

### 2. Instalação (Fase 1 + 4)

#### 2.1 — Instalar no Android Chrome 🟢 📱

**Pré-condição:** Chrome no Android, usuário autenticado.

**Passos:**
1. Abrir a URL do tunnel.
2. Fazer login.
3. Esperar 3s. Banner "Instalar Adapta Motorista" deve aparecer no rodapé.
4. Tocar em **"Instalar"** → prompt nativo do Chrome aparece.
5. Confirmar instalação.

**Resultado esperado:**
- Banner aparece.
- Prompt nativo dispara após clique.
- App é adicionado à tela inicial com ícone configurado.
- Ao abrir pela tela inicial, app roda em **modo standalone** (sem URL bar do navegador).
- Console mostra `[pwa] appinstalled`.

**Se falhar:**
- Banner não aparece → Application → Manifest → verifica erros. Verificar se já não está instalado (banner é suprimido em standalone).
- Prompt não dispara → conferir se o navegador suporta `beforeinstallprompt` (não suportado em iOS, Firefox Android limitado).

#### 2.2 — Instalar no iOS Safari 🟢 📱

**Pré-condição:** iOS Safari, usuário autenticado.

**Passos:**
1. Abrir a URL do tunnel no Safari.
2. Fazer login.
3. Esperar 3s. Banner aparece.
4. Tocar em "Instalar" → **modal de instruções com 3 passos** aparece.
5. Seguir os passos: tocar no botão Compartilhar nativo do Safari → escolher "Adicionar à Tela de Início" → confirmar.

**Resultado esperado:** ícone na tela inicial, abre em standalone.

**Se falhar:**
- Banner aparece mas modal não → conferir `InstallBanner.tsx` (`isIOS` provavelmente não está sendo detectado, ver `useInstallPrompt`).
- Não aparece em standalone → revisar metadata `appleWebApp.capable: true`.

#### 2.3 — Cooldown de dispense 🟡 📱

**Passos:**
1. Após banner aparecer, tocar no X (dispensar).
2. Sair e voltar ao app.
3. Recarregar.

**Resultado esperado:** banner não reaparece (cooldown 7 dias).

**Se falhar:** `localStorage` da chave `adapta-driver-install-dismissed-at` não foi gravado — conferir storage do site no DevTools.

#### 2.4 — Modo standalone esconde banner 🟡 📱

**Passos:**
1. Após instalar, abrir o app pela tela inicial.
2. Esperar 5s.

**Resultado esperado:** banner não aparece.

**Se falhar:** detecção de `display-mode: standalone` está quebrada — testar `window.matchMedia('(display-mode: standalone)').matches` no console.

---

### 3. Service Worker (Fase 2)

#### 3.1 — SW ativo em produção 🟢 🖥️

**Passos:**
1. Build + start + abrir no celular.
2. `chrome://inspect` → entrar no tab do celular → Application → Service Workers.

**Resultado esperado:** `sw.js` listed como **activated and running** com escopo `/`.

**Se falhar:**
- "Skipped, Bad MIME type" → `next.config.ts` ou Serwist não estão servindo o `sw.js` corretamente. Conferir que `public/sw.js` foi gerado pelo build.
- "Registration failed" → confirmar que HTTPS está válido (tunnel ativo).

#### 3.2 — SW NÃO ativo em dev 🟢 🖥️

**Passos:**
1. Parar o build em produção.
2. `npm run dev` na máquina + abrir no celular via tunnel.
3. DevTools → Application → Service Workers.

**Resultado esperado:** lista vazia (nenhum SW).

**Se falhar:** alguém alterou a config — `disable: process.env.NODE_ENV === "development"` em `next.config.ts` deve estar presente. Se SW antigo estiver instalado, fazer "Clear site data" antes.

#### 3.3 — Prompt de update após novo deploy 🟢 📱 🖥️

**Pré-condição:** SW ativo de um build anterior.

**Passos:**
1. No PC, editar qualquer arquivo (ex: trocar um texto na Home).
2. `npm run build && npm run start` de novo.
3. No celular, com app já aberto na versão anterior, recarregar a página (pull-to-refresh).
4. Esperar alguns segundos (browser checa atualização do SW).

**Resultado esperado:**
- Application → Service Workers mostra **dois SWs**: o ativo (versão antiga) e um "waiting" (versão nova).
- Banner **"Nova versão disponível"** aparece no app.
- Clicar em "Atualizar" → app recarrega na versão nova.

**Se falhar:**
- Banner não aparece → `useServiceWorkerUpdate` não detectou o waiting. Conferir no console se `controllerchange` foi disparado.
- Reload não acontece → `SKIP_WAITING` não foi processado pelo SW. Conferir listener `message` no `sw.ts`.

---

### 4. Cache offline (Fase 3)

#### 4.1 — Precache populado 🟢 🖥️

**Passos:**
1. App ativo, SW registrado.
2. DevTools → Application → Cache Storage → expandir o cache do Serwist (nome começa com `serwist-` ou similar).

**Resultado esperado:** entradas para HTML shell, JS, CSS, fontes, ícones. Pelo menos:
- `/` ou `/index`
- `/~offline`
- Bundles JS principais
- `/manifest.webmanifest`
- Os ícones em `/icons/`

**Tamanho aceitável:** < 5 MB no total (precache + runtime — caso contrário, motoristas em 3G/4G sofrem no primeiro load).

**Se falhar:** verificar `__SW_MANIFEST` no build. Pode ser que `swSrc` esteja errado em `next.config.ts`.

#### 4.2 — App abre offline (modo avião) 🟢 📱

**Pré-condição:** app já visitou as rotas principais (`/`, `/trips`, `/profile`).

**Passos:**
1. Ativar **modo avião** no celular.
2. Fechar e reabrir o app instalado (ou recarregar via tunnel se ainda não instalado).
3. Navegar entre as rotas visitadas anteriormente.

**Resultado esperado:**
- App abre normalmente.
- Rotas visitadas renderizam (do cache).
- Banner preto "Sem conexão" aparece no topo.

**Se falhar:** SW pode não ter precacheado as rotas. Antes de testar offline, fazer `Clear site data` → recarregar online → navegar por todas as rotas → aí cortar conexão.

#### 4.3 — Página `/~offline` para rota nunca visitada 🟢 📱

**Pré-condição:** modo avião + app aberto.

**Passos:**
1. Navegar para uma rota que **nunca foi visitada nesta sessão de cache** (ex: `/trips/9999`).

**Resultado esperado:** página `/~offline` aparece com ícone WiFi-off, texto "Você está offline" e botão "Tentar novamente".

**Se falhar:** `fallbacks.entries` em `sw.ts` não está configurado, ou `/~offline` não foi precacheada (verificar Cache Storage).

#### 4.4 — Reconexão volta ao normal 🟢 📱

**Passos:**
1. Estando em `/~offline` ou em rota cacheada, **desativar modo avião**.
2. Tocar em "Tentar novamente" (na página offline) ou recarregar.

**Resultado esperado:**
- App volta a buscar da rede.
- Banner "Sem conexão" some.
- Próximas navegações funcionam normalmente.

---

### 5. Awareness online/offline (Fase 5)

#### 5.1 — Banner aparece ao perder conexão 🟢 📱

**Passos:**
1. App aberto, online.
2. Ativar modo avião.

**Resultado esperado:** barra preta surge no topo com "Sem conexão — alterações serão sincronizadas quando voltar online".

**Se falhar:** `useNetworkStatus` não está reagindo a `offline` — testar `navigator.onLine` no console.

#### 5.2 — Banner some ao voltar online 🟢 📱

**Passos:**
1. Com banner visível, desativar modo avião.

**Resultado esperado:** barra preta some imediatamente.

#### 5.3 — Banner aparece em rotas públicas 🟡 📱

**Pré-condição:** deslogado.

**Passos:**
1. Estar em `/login` (sem ter logado).
2. Ativar modo avião.

**Resultado esperado:** banner aparece (está no RootLayout, não no PrivateLayout).

---

### 6. Fila offline / sincronização (Fase 6)

> **Aplicável só quando ao menos uma feature de domínio estiver plugada a `enqueueMutation`.** Substituir nos testes abaixo a feature genérica por uma real (ex: "confirmar entrega da NF #12345").

#### 6.1 — Mutação offline é persistida 🟢 📱 🖥️

**Pré-condição:** feature usa `enqueueMutation`, motorista autenticado, app online.

**Passos:**
1. Ativar modo avião.
2. Disparar a ação que enfileira (ex: confirmar entrega).
3. DevTools → Application → IndexedDB → banco `adapta-driver-offline` → store `pendingMutations`.

**Resultado esperado:**
- UI confirma "registrado" / "pendente de sincronização" (depende da UX da feature).
- IndexedDB tem 1 entrada com `idempotencyKey` UUID, `endpoint`, `method`, `body`, `kind`, `attempts: 0`, `status: "pending"`.

**Se falhar:** `enqueueMutation` não foi chamada. Conferir o handler do botão.

#### 6.2 — Drenagem ao voltar online 🟢 📱 🖥️

**Pré-condição:** fila tem ao menos uma mutação (cenário 6.1).

**Passos:**
1. Estando offline com mutação na fila, **desativar modo avião**.
2. Aguardar alguns segundos.
3. Conferir DevTools → Network: deve aparecer a request real para o endpoint.
4. Conferir IndexedDB: store `pendingMutations` deve esvaziar.

**Resultado esperado:**
- Request real ao backend com header `Idempotency-Key: <uuid>`.
- Sucesso → entrada removida da fila.
- Falha de rede → entrada continua, `attempts` incrementa.

**Se falhar:**
- Drenagem não dispara → `OfflineQueueDrainer` não está montado. Conferir `(private)/layout.tsx`.
- Request não acontece → `drainQueue()` retornou cedo. Console.log nos checkpoints da função.

#### 6.3 — Drenagem ao reabrir app (fallback iOS) 🟢 📱

**Pré-condição:** fila tem mutação não drenada.

**Passos:**
1. Com mutação pendente offline, **fechar completamente o app instalado**.
2. Voltar online.
3. Reabrir o app pela tela inicial.

**Resultado esperado:**
- `OfflineQueueDrainer` chama `drainQueue()` no mount.
- Mutação é enviada ao backend.

#### 6.4 — Background Sync (Chromium) 🟡 📱

**Pré-condição:** Android Chrome, app instalado, mutação pendente.

**Passos:**
1. Com mutação pendente offline, fechar app.
2. DevTools → Application → Background Services → Background Sync → registrar `Record events`.
3. Voltar online (com app fechado).
4. Esperar alguns segundos.

**Resultado esperado:** `Background Sync` registra evento `adapta-drain-queue` disparado, e ao reabrir o app a mutação já está drenada.

**Se falhar:** Background Sync é best-effort do navegador — pode não disparar se a heurística do Chrome decidir. Se nunca disparar, considerar como degradação aceitável (o cenário 6.3 cobre).

#### 6.5 — Retry exponencial em falha 🟢 🖥️

**Pré-condição:** backend está retornando 500/timeout para o endpoint da fila.

**Passos:**
1. Forçar erro 5xx no backend (parar o serviço ou usar mock).
2. Enfileirar uma mutação.
3. Observar tentativas no Network — devem espaçar progressivamente (~1s, 2s, 4s, 8s...).

**Resultado esperado:** retries com backoff 1s → 2s → 4s → 8s → ... → 60s, parando em 8 tentativas (depois `status: "failed"`).

**Se falhar:** lógica de backoff em `offline-queue.ts:backoffMs()` está errada ou não está sendo respeitada no loop.

#### 6.6 — 409 Conflict trata como sucesso 🟢 🖥️

**Pré-condição:** backend implementa idempotência (D4 do NOTES) e responde 409 para `Idempotency-Key` já visto.

**Passos:**
1. Enfileirar uma mutação, deixar drenar e completar (200 OK).
2. Manualmente enfileirar outra com o mesmo `idempotencyKey` (editando o IDB), OU simular cenário de retry após timeout cliente-servidor.
3. Aguardar drain.

**Resultado esperado:** backend responde 409, cliente trata como sucesso (D7) e **remove da fila** sem reprocessar.

**Se falhar:** `drainQueue` não está tratando 409 → conferir a branch `if (status === 409)`.

#### 6.7 — Idempotência ponta a ponta 🟢

**Bloqueio atual (D4):** o `adapta-hub` precisa aceitar e desduplicar `Idempotency-Key`. Sem isso, retries podem **duplicar efeito**.

**Quando o backend implementar:**

**Passos:**
1. Enfileirar a mutação (ex: registrar entrega) com sucesso (200 OK).
2. Voltar a fila com mesma `idempotencyKey` (ou usar interceptor pra forçar retry).
3. Verificar no banco do backend que a entrega aparece **uma só vez**.

**Resultado esperado:** **zero duplicidade**, mesmo com retries.

**Se falhar:** o backend não está persistindo idempotency keys ou não está olhando o header. Abrir conversa com time do hub.

#### 6.8 — Logout limpa IndexedDB 🟢 🖥️

**Passos:**
1. Estar logado, IDB com dados (mutação pendente, cachedData, etc.).
2. Tocar em "Sair" no perfil.
3. DevTools → Application → IndexedDB.

**Resultado esperado:** banco `adapta-driver-offline` é **deletado** (some da lista).

**Se falhar:** `clearOfflineStorage()` não está sendo chamado no `AuthContext.clear()`.

---

### 7. Cenários integrados (smoke)

Esses são "happy paths" que combinam várias fases. Validam o app inteiro como PWA.

#### 7.1 — Operação completa offline 🟢 📱

**Cenário:** motorista entra em túnel sem sinal, executa operação, sai do túnel.

**Passos:**
1. App instalado, motorista logado, online.
2. Ativar modo avião.
3. Navegar para uma viagem (já cacheada).
4. Disparar a ação que enfileira (ex: confirmar entrega).
5. Banner "Sem conexão" deve estar visível durante todo o passo 4.
6. UI confirma "pendente de sincronização".
7. Desativar modo avião.
8. Esperar alguns segundos.

**Resultado esperado:**
- Cada passo offline funciona sem erros.
- Mutação é enfileirada offline.
- Volta online → mutação é drenada → backend tem o registro.

#### 7.2 — Reabertura após drop offline 🟢 📱

**Cenário:** motorista perde sinal no meio de uma operação, fecha o app, depois volta.

**Passos:**
1. Modo avião + app aberto + mutação enfileirada (cenário 6.1).
2. **Force-close** o app (swipe out na lista de apps recentes).
3. Voltar online.
4. Abrir app pelo ícone na tela inicial.

**Resultado esperado:** ao montar o `OfflineQueueDrainer`, a fila é drenada automaticamente.

#### 7.3 — Update durante uso 🟢 📱

**Cenário:** novo build é deployado enquanto motorista usa o app.

**Passos:**
1. App aberto, motorista usando normalmente.
2. No PC, rebuildar e reiniciar produção.
3. Esperar o motorista navegar ou recarregar.

**Resultado esperado:**
- Banner "Nova versão disponível" aparece.
- Motorista pode continuar usando a versão antiga (não bloqueia).
- Ao clicar "Atualizar" → reload → versão nova.

---

## O que não dá pra testar com mocks

Enquanto o app usa `mockTrips`, `mockOffers`, `mockDriverData`, etc., os cenários abaixo **não rodam de verdade**:

| Cenário | Por quê | O que destrava |
|---|---|---|
| Fila offline (6.1–6.7) | Nenhum botão usa `enqueueMutation` | Plugar a fila em ao menos uma feature (recomendado: "confirmar entrega" — `DocumentDetailScreen` Step 4) |
| Idempotência ponta a ponta (6.7) | Backend `adapta-hub` ignora `Idempotency-Key` | Backend implementa persistência de keys (D4 NOTES) |
| Cache de dados reais | Mocks são estáticos no bundle, não passam pela rede | API real responde via fetch/axios — runtime cache da Fase 3 entra em ação |
| Dados de motorista (CNH, GR, veículo) | Não existem no schema do backend | Schema novo ou outro módulo |
| Histórico de viagens offline | Aba desabilitada | Implementar endpoint de histórico + plugar |

---

## Checklist enxuto para uma sessão de QA

Para uma rodada completa, marcar mentalmente:

- [ ] Build em produção + tunnels + dispositivos prontos
- [ ] **Instalação** Android (2.1) + iOS (2.2)
- [ ] **SW ativo em prod** (3.1) e **inativo em dev** (3.2)
- [ ] **Prompt de update** após novo deploy (3.3)
- [ ] **App abre offline** (4.2)
- [ ] **Página `/~offline`** para rota nova (4.3)
- [ ] **Banner offline** aparece e some (5.1, 5.2)
- [ ] **Mutação offline** persiste e drena (6.1, 6.2)
- [ ] **Drenagem ao reabrir** (6.3)
- [ ] **Logout limpa IDB** (6.8)
- [ ] **Smoke integrado**: operação completa offline (7.1)
- [ ] Tudo isso em **ambos os dispositivos** alvo

Falha em qualquer 🟢 é blocker. Falha em 🟡 vai para `NOTES.md` ou backlog.

---

## Plano de "kill switch" (Fase 8)

Se um bug crítico de SW chegar a produção, motorista pode ficar **preso em versão antiga** porque o SW antigo serve cache antigo. Plano:

1. Subir um deploy com `sw.ts` mínimo:
   ```ts
   self.addEventListener("install", () => self.skipWaiting());
   self.addEventListener("activate", async () => {
     const regs = await self.registration.unregister();
     const cs = await caches.keys();
     await Promise.all(cs.map((c) => caches.delete(c)));
   });
   ```
2. Esse SW se auto-desregistra e apaga todo cache no primeiro fetch que o cliente fizer.
3. Próxima abertura do app pega versão limpa diretamente da rede.

Documentar isso no `NOTES.md` e ter o branch `kill-switch-sw` pronto para deploy emergencial.
