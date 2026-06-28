# Guia de validação manual — ETAPA 5 (Macros + Jornada) e ETAPA 6 (Pneus + Combustível + BI)

> Roteiro **pela tela**: o que abrir, o que clicar, o que **esperar**. Marque cada fluxo com ✅ / ❌.
> Achados/bugs vão na tabela do final. Linguagem de usuário — sem código.

**Onde testa cada coisa**
- **T5.1 Macros** → **app do motorista** (`adapta-checklist`, `:3002`).
- **T5.2 Jornada** → **não tem tela ainda** (é um relatório de backend). Validação ao final, via consulta (peça pro time técnico ou me chame pra rodar).
- **T6.1 Pneus / T6.2 Combustível / T6.3 BI** → **web da Frota (ADM)** (`integra-web-v2`, geralmente `:3001`) → menu **Gestão de Frota**.

---

## §0 — Antes de começar (pré-requisitos)

| # | Ação | Esperado |
|---|---|---|
| 1 | Subir os serviços: **api** (`:3333`), **hub** (`:3334`), **app checklist** (`:3002`), **web Frota** (`:3001`) | Todos no ar (cada um abre no navegador / responde) |
| 2 | No `adapta-api`, rodar `yarn prisma migrate status` | Deve dizer **"up to date"**. Se listar pendentes, rodar `yarn prisma migrate deploy` (NUNCA `reset`) |
| 3 | Garantir dados de pneu/combustível: rodar `yarn prisma:seed:fleet-demo` (pneus) e `yarn prisma:seed:fleet-costs` (combustível) | Conclui sem erro; cria pneus, eventos e lançamentos de combustível na empresa de demonstração |
| 4 | **Login do app (motorista):** `carlos.0001@frota.local` / `Motorista@123` | Entra no app. (3 erros de senha **bloqueiam** — se travar, me chame que desbloqueio) |
| 5 | **Login da web (Frota ADM):** sua conta de administrador na web da Frota, e **selecionar a empresa** de demonstração (a que tem a frota — TechSolutions) | Dashboard da Gestão de Frota abre com a empresa certa selecionada |

> Se o km/l (T6.2) ou o custo/km vierem **vazios/zerados**, normalmente é **falta de leitura de km** no período (não é bug): o km entra por checklist com odômetro ou pela **importação** (passo T6.2.3, que já cria o km). O passo 2 garante que a tabela de odômetro existe.

---

## §1 — T5.1 · Macros no app do motorista

Abra o app (`:3002`), logado como o motorista, e entre em **Macros** (atalho na home).

### 1.1 Estado inicial e seleção do veículo
| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir **Macros** | Tela abre sem erro; pede para escolher um veículo |
| 2 | Selecionar um veículo (busca por placa) | Mostra o **estado atual** do conjunto/veículo e os **botões de macro válidos** a partir desse estado |
| 3 | Reparar nos botões oferecidos no início | Só aparece o que é válido começar (ex.: **Recebimento do veículo**) — não aparecem macros fora de ordem |

**Resultado:** ✅ / ❌

### 1.2 Passar a sequência de macros
| # | Ação | Esperado |
|---|---|---|
| 1 | Tocar **Recebimento do veículo** | Macro registrada; o estado muda; agora aparece **Início de viagem** como próxima válida |
| 2 | Tocar **Início de viagem** | Registrada; passam a aparecer as macros "em viagem" (Parada, Refeição, Abastecimento, Pernoite, Engate, Desengate, **Chegada**) |
| 3 | Tocar **Parada** e depois **Refeição** | Cada uma registra e o app continua oferecendo as macros de viagem (intermediárias podem repetir) |
| 4 | Tocar **Chegada** → **Descarga** | Registram na ordem; depois de Descarga aparecem **Engate/Desengate/Fim de viagem** |
| 5 | Tocar **Fim de viagem** | Registrada; a viagem encerra e o ciclo volta a oferecer **Recebimento do veículo** |
| 6 | Conferir o **histórico** na própria tela | Lista as macros passadas na ordem, com horário (e localização, se permitida) |

**Resultado:** ✅ / ❌

### 1.3 Sequência inválida é barrada
| # | Ação | Esperado |
|---|---|---|
| 1 | Logo após Recebimento (sem Início de viagem), tentar uma macro fora de ordem (ex.: Descarga) | O app **não oferece** essa macro; se forçada, é **rejeitada** (não registra) |

**Resultado:** ✅ / ❌

### 1.4 Funciona offline
| # | Ação | Esperado |
|---|---|---|
| 1 | Ativar **modo avião** / desligar o Wi-Fi do aparelho | App continua usável |
| 2 | Passar 1–2 macros válidas offline | Registram com aviso de **pendente**; o estado avança localmente liberando as próximas macros |
| 3 | Religar a internet e aguardar alguns segundos | As macros pendentes **sobem sozinhas**; o "pendente" some (sem duplicar) |
| 4 | Recarregar a tela | As macros passadas offline **persistem** no histórico |

**Resultado:** ✅ / ❌

---

## §2 — T5.2 · Jornada a partir das macros (sem tela — validação por consulta)

> Não há tela de jornada ainda; é um **relatório de backend** que lê as macros que você passou em §1.
> Para validar, peça ao time técnico (ou me chame) para consultar a **jornada do motorista** no período
> em que você passou as macros.

| # | Ação | Esperado |
|---|---|---|
| 1 | Após passar a sequência §1.2 (com horários espaçados), consultar a jornada do motorista naquele dia | Mostra **início e fim da jornada**, tempo de **direção**, **pausas**, e separa **início de jornada ≠ início de viagem** |
| 2 | Passar macros com **mais de 5h30 de direção sem pausa** | A consulta aponta **violação de pausa** (5h30) |
| 3 | Iniciar uma nova jornada **com menos de 11h** desde a anterior | Aponta **violação de interjornada** (11h) |
| 4 | Conferir que o **tempo parado no destino** (entre Chegada/Descarga e o próximo Início de viagem) **não conta** como direção | A jornada não soma esse tempo como direção |

**Resultado:** ✅ / ❌  ·  _(precisa de consulta técnica — sem UI)_

---

## §3 — T6.1 · KPIs de Pneus (web da Frota)

Web da Frota → **Gestão de Frota** → **KPIs de Pneus** (`/dashboard/gestao-frota/pneus-kpis`).

### 3.1 Indicadores e filtros
| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir **KPIs de Pneus** | Tela abre; cards de resumo: **custo/km**, **km total**, **nº de pneus considerados** |
| 2 | Escolher um **período** (início/fim) | A tela recarrega os números para o período |
| 3 | Filtrar por **tipo de equipamento** = Tração, depois Reboque | Os números/ranking mudam conforme o tipo escolhido |

**Resultado:** ✅ / ❌

### 3.2 Ranking de marcas e performance por vida
| # | Ação | Esperado |
|---|---|---|
| 1 | Olhar o **ranking de marcas** (tabela/gráfico) | Marcas ordenadas por **custo/km** (menor = melhor); mostra km e custo por marca |
| 2 | Olhar **performance por vida** | Barras por **vida** (novo, 1ª, 2ª, 3ª recapagem) com **km médio** por pneu |

**Resultado:** ✅ / ❌

### 3.3 Linha do tempo de um pneu
| # | Ação | Esperado |
|---|---|---|
| 1 | Selecionar/buscar um **pneu** | Abre a **linha do tempo**: compra → instalação/rodízio → recapagem → inspeção, em ordem |
| 2 | Conferir os marcos | Cada marco mostra data, e (quando há) caminhão/placa, posição, km e sulco |

**Resultado:** ✅ / ❌

### 3.4 Estado vazio (período sem dados)
| # | Ação | Esperado |
|---|---|---|
| 1 | Escolher um período **antigo** sem pneus/eventos | Tela mostra "sem dados" sem quebrar; cards em zero |

**Resultado:** ✅ / ❌

---

## §4 — T6.2 · Combustível (km/l + importação) (web da Frota)

Web da Frota → **Gestão de Frota** → **BI de Combustível** (`/dashboard/gestao-frota/combustivel-bi`).

### 4.1 Eficiência km/l por placa
| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir **BI de Combustível** e escolher um **período** | Tabela por **placa**: litros, km rodado, **km/l**, custo, R$/km |
| 2 | Conferir uma placa que tem abastecimento E km no período | km/l aparece preenchido (litros das notas ÷ km rodado) |
| 3 | Olhar o **gráfico** de km/l por placa | Barras por placa (maior km/l = melhor) |
| 4 | Filtrar por **um veículo** | Tabela/gráfico restringem àquela placa |

> Se uma placa mostrar km/l **em branco**, é porque não há **leitura de km** suficiente no período (precisa de ≥2 leituras). Use a importação abaixo (que já traz o km) para ver o cálculo.

**Resultado:** ✅ / ❌

### 4.2 Importar abastecimento por arquivo (CSV)
Prepare um **CSV de teste** com cabeçalho e 2–3 linhas, ex.:
```
placa;data;litros;valor;km
<PLACA_REAL_1>;2026-06-10;120;780,00;50100
<PLACA_REAL_1>;2026-06-20;130;845,00;52600
<PLACA_REAL_2>;2026-06-15;90;585,00;33000
```
(use placas **reais** da frota; decimal com vírgula é aceito)

| # | Ação | Esperado |
|---|---|---|
| 1 | No card de **importação**, escolher o arquivo CSV e enviar | Mostra um **resumo**: quantos **importados / ignorados / erros** |
| 2 | Conferir o resumo | As linhas com placa válida → **importadas**; placa inexistente → aparece na lista de **erros** (com a linha/motivo) |
| 3 | Voltar à **eficiência km/l** no período do arquivo, filtrando a placa importada | Agora a placa mostra **litros, km rodado e km/l** calculados a partir do que foi importado |
| 4 | (opcional) Reenviar o **mesmo** arquivo | Não duplica de forma silenciosa / o resumo deixa claro o que entrou |

**Resultado:** ✅ / ❌

### 4.3 Arquivo inválido
| # | Ação | Esperado |
|---|---|---|
| 1 | Enviar um arquivo fora do formato (ex.: texto qualquer) | A tela não quebra; mostra erro/zero importados sem travar |

**Resultado:** ✅ / ❌

---

## §5 — T6.3 · Telas de BI (indicadores)

As telas de indicadores da Frota ficam no menu **Gestão de Frota**. As **novas** desta etapa são as
duas acima (§3 Pneus, §4 Combustível). As demais já existiam e devem abrir com dados:

| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir **Calendário de Disponibilidade** | Grade equipamento × dias, com status colorido |
| 2 | Abrir **Planos de Revisão** (Revisões) | Dashboard Em dia / Vencendo / Vencido + previsão da próxima |
| 3 | Abrir **Relatório de Custos** | Custo por veículo por categoria + **custo/km** no período |
| 4 | Abrir **KPIs de Pneus** e **BI de Combustível** | (já validados em §3 e §4) |
| 5 | Em cada tela, mudar o **período/veículo** | Os números reagem ao filtro; nenhuma tela quebra com filtro/sem dados |

**Resultado:** ✅ / ❌

---

## Golden Path (ponta a ponta)
1. App: motorista loga → passa a **sequência completa de macros** de uma viagem (Recebimento → … → Fim), inclusive 1 macro **offline** que sobe ao reconectar. *(T5.1)*
2. Consulta: a **jornada** do motorista reflete essas macros (direção, pausas, violações). *(T5.2)*
3. Web Frota: **KPIs de Pneus** mostram custo/km e a linha do tempo de um pneu. *(T6.1)*
4. Web Frota: **importar** um CSV de abastecimento → a placa passa a ter **km/l** no BI de Combustível. *(T6.2)*
5. Web Frota: passear pelas **telas de BI** (disponibilidade, revisão, custo, pneus, combustível) — todas com números reais e filtros funcionando. *(T6.3)*

---

## Achados / Bugs (preencher durante a validação)

| # | Tela | Título | Sintoma | Severidade | Status |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

> Severidade: 🔴 funcional · 🟡 texto/UX · ⚪ cosmético.

---

### Nota técnica (só para diagnóstico — não faz parte do roteiro de usuário)
- Macros (app): `GET/POST /driver/macros`, `GET /driver/macros/proximas`. Jornada: `GET /fleet/jornada?driverId&inicio&fim` (ADM, header de empresa).
- Pneus: `GET /tires/kpis`, `GET /tires/:id/timeline`. Combustível: `GET /fleet/fuel/efficiency`, `POST /fleet/fuel/import` (multipart CSV/XML). Custo/km depende da tabela de leituras de odômetro (migration `frotas_checklist_e_odometro`).
- Dados de demo: `prisma:seed:fleet-demo` (pneus), `prisma:seed:fleet-costs` (combustível), `prisma:seed:integra-demo` (frota/motoristas), `prisma:seed:driver-logins` (logins do app).
