# Guia de validação manual — ETAPA 7 (Sinistro + Acerto) e ETAPA 8 (Faturamento + Conjunto + Chat)

> Roteiro **pela tela**: o que abrir, o que clicar, o que **esperar**. Marque cada fluxo com ✅ / ❌.
> Achados/bugs vão na tabela do final. Linguagem de usuário — sem código.

**Onde testa cada coisa**
- **App do motorista** (`adapta-checklist`, `:3002`): **gastos do acerto** (T7.2) e **checklist do conjunto** (T8.2).
- **Web da Frota (ADM)** (`integra-web-v2`, geralmente `:3001`) → menu **Gestão de Frota**: **Sinistros** (T7.1), **Acerto de Contas** (T7.2 ADM), **Faturamento** (T8.1), **Caixa de Solicitações** (T8.3).

> ⚠️ **Leia o §0.** Hoje o ambiente está **sem** sinistro, **sem** conjunto montado e **sem** viagem com
> receita — então **Sinistros (T7.1)**, **Conjunto (T8.2)** e **Faturamento (T8.1)** abrem **vazias** até
> você (ou eu) preparar um dado de teste. Cada seção marca isso e tem um teste de "estado vazio".

---

## §0 — Antes de começar (pré-requisitos)

| # | Ação | Esperado |
|---|---|---|
| 1 | Subir **api** (`:3333`), **hub** (`:3334`), **app** (`:3002`), **web Frota** (`:3001`) | Todos no ar |
| 2 | `yarn prisma migrate status` no `adapta-api` | **"up to date"**; se faltar, `yarn prisma migrate deploy` (NUNCA `reset`) |
| 3 | **Login app (motorista):** `carlos.0001@frota.local` / `Motorista@123` | Entra. (3 erros bloqueiam — me chame que desbloqueio) |
| 4 | **Login web (Frota ADM):** sua conta de admin + **selecionar a empresa** de demonstração (TechSolutions) | Dashboard de Gestão de Frota abre na empresa certa |
| 5 | **Dados de teste** (pra não testar no vazio): ver a tabela abaixo | — |

**Dados de teste necessários por seção (peça ao time técnico ou me chame para criar):**

| Seção | Precisa de | Sem isso… |
|---|---|---|
| §1 Sinistro (T7.1) | ao menos **1 sinistro** registrado (criado pelo fluxo de GR) | a lista abre **vazia** — dá pra validar só o "estado vazio" |
| §2 Acerto (T7.2) | **gastos** do motorista (você cria no app no §2.A) | self-service: o próprio teste cria os dados |
| §3 Faturamento (T8.1) | **viagens com valor de frete** no período | a grade mostra tudo **"disponível"/zerado** |
| §4 Conjunto (T8.2) | **1 conjunto (cavalo+carreta)** montado para um veículo do motorista | a tela não acha conjunto |
| §5 Solicitações (T8.3) | nada (há **57 setores**); você cria a solicitação no teste | self-service |

---

## §1 — T7.1 · Sinistros (visão da Frota) — web

Web da Frota → **Gestão de Frota** → **Sinistros (Frota)** (`/dashboard/gestao-frota/sinistros-frota`).

### 1.0 Estado vazio (se ainda não há sinistro)
| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir **Sinistros (Frota)** sem nenhum sinistro | Tela abre sem quebrar; lista vazia / "nenhum sinistro"; filtros não dão erro |

**Resultado:** ✅ / ❌

### 1.1 Lista e detalhe (com ao menos 1 sinistro)
| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir a tela | Lista os sinistros (placa, status, data) — **os mesmos do GR** (um por placa/evento) |
| 2 | Filtrar por **status** e por **tipo** | A lista filtra de verdade |
| 3 | Abrir um sinistro (detalhe) | Mostra os dados do sinistro; deixa claro que é o **mesmo registro do GR** (sem duplicar) |

**Resultado:** ✅ / ❌

### 1.2 Relato do motorista/Frota (motivo, pista, horário)
| # | Ação | Esperado |
|---|---|---|
| 1 | No sinistro, abrir **Relato** | Abre formulário: **motivo**, **descrição do acontecimento**, **condição da pista** (Seca/Molhada/Outra), **horário** |
| 2 | Preencher e **salvar** | Toast de sucesso; o sinistro passa a marcar **Relato: preenchido** |
| 3 | Recarregar a tela e reabrir | O relato **persiste** (motivo/pista/horário gravados) |
| 4 | Conferir no GR (se acessível) que é o **mesmo** sinistro | Não criou um sinistro novo; é o registro compartilhado |

**Resultado:** ✅ / ❌

---

## §2 — T7.2 · Acerto de contas do motorista

### §2.A — App do motorista: lançar gastos e ver saldo
App (`:3002`) → **Gastos / Acerto** (atalho na home).

#### 2.A.1 Lançar um gasto com comprovante
| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir **Gastos** → aba **Lançar gasto** | Tela com tipo, valor, data (hoje), viagem opcional, foto e observação |
| 2 | Escolher tipo **Com comprovante**, valor (R$), tirar/anexar **foto** | Mostra que esse tipo **desconta** se ficar sem comprovante; com a foto, fica **com comprovante** |
| 3 | **Enviar** | Confirmação informando se descontou ou não; o gasto entra no acerto |
| 4 | Lançar um **Diária** | Marca **"não desconta"** |
| 5 | Lançar um **Ajudante** | Entra como gasto |

**Resultado:** ✅ / ❌

#### 2.A.2 Saldo por viagem
| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir a aba **Acerto / Saldo** | Card de **saldo** (a receber/a pagar) + totais "desconta" × "não desconta", agrupados **por viagem** |
| 2 | Conferir cada gasto | Badge "desconta"/"não desconta" coerente com o tipo (diária não desconta; com-comprovante sem foto desconta) |

**Resultado:** ✅ / ❌

#### 2.A.3 Offline
| # | Ação | Esperado |
|---|---|---|
| 1 | Em modo avião, lançar um gasto com foto | Entra como **pendente**; reflete no saldo localmente |
| 2 | Religar a internet | Sobe sozinho (foto + gasto); deixa de ser pendente, sem duplicar |

**Resultado:** ✅ / ❌

### §2.B — Web da Frota: fechar acerto e gerar PDF
Web → **Gestão de Frota** → **Acerto de Contas** (`/dashboard/gestao-frota/acerto-motorista`).

| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir **Acerto de Contas** | Lista de motoristas/acertos com saldo |
| 2 | Abrir o detalhe de um motorista | Mostra o que ele gastou **por viagem**, por tipo (diárias não descontam, ajudantes, com-comprovante) e o **saldo** |
| 3 | Clicar **Fechar acerto** | Abre modal: seleciona motorista + **período (default 21→20)** + saldo anterior; pede **confirmação** |
| 4 | Confirmar o fechamento | Toast de sucesso; o acerto vira **Fechado** com os totais |
| 5 | Clicar **Baixar PDF** | Abre/baixa o **PDF do acerto** com período, lista de gastos e o resumo (saldo anterior + créditos − descontos = saldo final) |

**Resultado:** ✅ / ❌

---

## §3 — T8.1 · Faturamento da Frota (web)

Web → **Gestão de Frota** → **Faturamento da Frota** (`/dashboard/gestao-frota/faturamento`).

> Precisa de **viagens com valor de frete** no período. Sem isso, a grade mostra "disponível"/zero
> (válido como estado vazio, mas não dá pra ver a composição).

### 3.1 Grade placa × dia
| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir **Faturamento** e escolher um **período** | Grade de **placas × dias** |
| 2 | Olhar as células | Dia com receita → mostra **R$**; dia **em viagem sem receita** → mostra o **ID da viagem** + R$ 0; dia **sem viagem** → "disponível" |
| 3 | Conferir os **totais** por placa e o total geral | Somam as receitas do período |
| 4 | Filtrar por **um veículo** | A grade restringe à placa |

**Resultado:** ✅ / ❌

### 3.2 Composição do dia
| # | Ação | Esperado |
|---|---|---|
| 1 | Clicar numa célula com viagem | Abre modal com a **composição**: viagens, **rota** (origem→destino), **frete**, **pedágio**, e **CT-es** (número/série/valor) |
| 2 | Conferir os totais do dia | **Frete do dia** e **pedágio do dia** batem com as viagens listadas |

**Resultado:** ✅ / ❌

---

## §4 — T8.2 · Checklist do conjunto (cavalo+carreta) no app

App (`:3002`) → **Conjunto** (atalho na home).

> Precisa de **1 conjunto (cavalo+carreta)** montado para o veículo. Sem conjunto, a tela avisa que
> não encontrou conjunto.

### 4.1 Ver o status de liberação
| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir **Conjunto** | Mostra o conjunto (cavalo + carreta) e um badge: **Vistoria válida** (verde) ou **Sem vistoria válida** (vermelho) |
| 2 | Olhar o card **Checklist da gerenciadora** | Aparece o status (Aprovado/Reprovado/Pendente/Vencido) **somente leitura** — sem botão de editar |

**Resultado:** ✅ / ❌

### 4.2 Fazer a vistoria manual do conjunto
| # | Ação | Esperado |
|---|---|---|
| 1 | Iniciar a **vistoria manual** | Lista os itens do conjunto, cada um com **Conforme / Não conforme / N/A** |
| 2 | Marcar um item como **Não conforme** | Aparece campo de **observação** para esse item |
| 3 | Responder **todos** os itens | O botão de confirmar só habilita com tudo respondido (contador N/total) |
| 4 | **Confirmar** | Grava a vistoria; o conjunto passa a **Vistoria válida**; (é gravado na vistoria de conjunto que o **GR** enxerga) |
| 5 | Recarregar | O status **persiste** como válido |

**Resultado:** ✅ / ❌

### 4.3 Offline
| # | Ação | Esperado |
|---|---|---|
| 1 | Em modo avião, fazer e **confirmar** a vistoria | Aviso "será enviado ao reconectar"; o conjunto fica **válido localmente** |
| 2 | Religar a internet | A vistoria sobe sozinha (sem duplicar) |

**Resultado:** ✅ / ❌

---

## §5 — T8.3 · Caixa de Solicitações (web)

Web → **Gestão de Frota** → **Caixa de Solicitações** (`/dashboard/gestao-frota/solicitacoes`).

### 5.1 Abrir uma solicitação roteada ao setor
| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir **Caixa de Solicitações** | Lista (vazia ou com solicitações); filtro por **setor** |
| 2 | Clicar **Nova solicitação** | Modal: **assunto**, **setor de destino**, **mensagem** |
| 3 | Escolher um **setor**, preencher e **enviar** | Toast de sucesso; a solicitação aparece na **caixa do setor escolhido** |
| 4 | Filtrar a caixa por **esse setor** | A solicitação criada aparece ali (chegou pro setor responsável) |

**Resultado:** ✅ / ❌

### 5.2 Mudar o status
| # | Ação | Esperado |
|---|---|---|
| 1 | Numa solicitação, mudar o status (ex.: **Em andamento** → **Resolvida**) | O status atualiza (toast); recarregar mantém |

**Resultado:** ✅ / ❌

---

## Golden Path (ponta a ponta)
1. App: motorista lança **gastos** (com foto, 1 offline) e vê o **saldo** por viagem. *(T7.2 app)*
2. Web: a Frota **fecha o acerto** do motorista (21→20) e **baixa o PDF**. *(T7.2 web)*
3. Web: registra o **relato** de um **sinistro** (motivo/pista/horário) — mesmo registro do GR. *(T7.1)*
4. App: faz a **vistoria manual do conjunto** → fica **liberado**. *(T8.2)*
5. Web: **Faturamento** mostra receita por placa/dia e a **composição** (viagens/CT-es). *(T8.1)*
6. Web: abre uma **solicitação** que chega ao **setor** certo. *(T8.3)*

---

## Achados / Bugs (preencher durante a validação)

| # | Tela | Título | Sintoma | Severidade | Status |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

> Severidade: 🔴 funcional · 🟡 texto/UX · ⚪ cosmético.

---

### Nota técnica (só para diagnóstico — não faz parte do roteiro de usuário)
- **T7.1**: `GET /fleet/sinistros`, `GET /fleet/sinistros/:id`, `PATCH /fleet/sinistros/:id/relato` (reusa o Sinistro do GR).
- **T7.2**: app `POST/GET /driver/expenses`, `GET /driver/settlement/atual`; ADM `GET /fleet/settlements`, `POST /fleet/settlements/fechar`, `GET /fleet/settlements/:id/pdf`.
- **T8.1**: `GET /fleet/faturamento`, `GET /fleet/faturamento/dia` (receita lida de `Trip.freightValue/tollValue`, atrás de `FleetRevenueService` — fácil de trocar a origem).
- **T8.2**: app `GET /driver/vistoria-conjunto`, `POST /driver/vistoria-conjunto/confirmar` (grava na `VistoriaConjunto` do GR); precisa de um `VehicleSet` (cavalo+carreta).
- **T8.3**: `POST /chat/solicitacoes`, `GET /chat/solicitacoes?setor`, `PATCH /chat/solicitacoes/:id/status` (setor = `BusinessUnit`).
- **Estado atual do banco**: sinistros 0 · vehicle_sets 0 · trips com frete 0 · setores 57 · gastos 2. Os 3 primeiros precisam de dado de teste para validação completa.
