# PWA — Adapta Driver

Diretório de planejamento, acompanhamento e registro da transformação do `adapta-driver` em Progressive Web App.

## Índice

- **[ROADMAP.md](./ROADMAP.md)** — plano fragmentado em fases, com checklist de tarefas. **É aqui que se marca o que já foi feito.**
- **[CHANGELOG.md](./CHANGELOG.md)** — registro cronológico de mudanças aplicadas (uma entrada por sessão de trabalho ou PR).
- **[NOTES.md](./NOTES.md)** — pontos de atenção, decisões arquiteturais, problemas encontrados e workarounds.
- **[TESTING.md](./TESTING.md)** — roteiro de validação manual PWA + offline para QA pós-integração com APIs reais.

## Por que PWA?

1. **Instalável sem loja** — motoristas adicionam à tela inicial direto pelo navegador; abre em modo standalone (sem URL bar), com ícone próprio e splash screen.
2. **Habilita offline real** — Service Worker + IndexedDB permitem cache de assets, cache de respostas da API e fila de sincronização para quando o caminhão estiver sem sinal.
3. **UX mobile nativa** — push notifications (Android sempre; iOS ≥16.4), acesso a câmera e geolocalização (que já são usados), e percepção de "app" pelo usuário.
4. **Custo baixo de manutenção** — uma única base de código (Next.js) atende web e "app", sem React Native nem build de loja.

## O que PWA NÃO resolve sozinho

- **Lógica offline propriamente dita** (cache strategy por rota, fila de uploads, conflitos de sincronização) — é trabalho à parte, viabilizado pelo Service Worker mas não automático.
- **Limites do iOS** — sem Background Sync confiável, sem persistência garantida (storage pode ser apagado), push notif exige iOS ≥16.4 e o app instalado.
- **Atualização** — uma vez instalado, o usuário pode ficar com versão antiga até o Service Worker rodar a checagem; precisa de UX explícita de "atualizar".

## Stack alvo

- **Next.js 16** (App Router) + React 19
- **`@serwist/next`** como camada de Service Worker (sucessor recomendado do `next-pwa`, que está defasado para Next 15+)
- **IndexedDB** via `idb-keyval` ou `Dexie` (a definir na Fase 6)
- Hospedagem com HTTPS (obrigatório para Service Worker fora de `localhost`)

## Como usar este diretório

1. Trabalhar sempre uma fase do **ROADMAP** por vez; não pular fases.
2. Ao concluir uma tarefa, marcar `[x]` no roadmap **e** criar uma entrada em **CHANGELOG**.
3. Qualquer surpresa, decisão tomada ou bloqueio vai para **NOTES** — sem isso a próxima sessão perde contexto.
