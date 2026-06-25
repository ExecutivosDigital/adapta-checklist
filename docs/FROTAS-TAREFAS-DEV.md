# Frotas — Tarefas de desenvolvimento

> Lista de tarefas pra desenvolver o módulo de Frotas, **em etapas**. Cada tarefa é
> auto-contida — dá pra pegar uma por vez (inclusive colar num Claude Code) e implementar.
> Faça **na ordem das etapas**; dentro de uma etapa, as tarefas podem ir em paralelo.

## Contexto (onde mexe)

- **App do motorista:** `adapta-checklist` (PWA Next.js — já existe, hoje rodando com dados de demonstração).
- **Backend:** `adapta-api` (NestJS + Prisma + Postgres). API em `:3333`.
- **Front web da Frota (ADM):** `integra-web-v2` → `src/app/(private)/dashboard/gestao-frota/*`.
- **Identidade/login do motorista:** `adapta-hub` (`:3334`) emite o token; o monolito valida.

## Regras

- **Banco/migrations:** rodar `prisma migrate dev` **só no banco local**; nunca em produção. Schema +
  migration no mesmo commit.
- **Testes:** `adapta-api` usa vitest (`yarn test:unit`); deixe verde o que tocar.
- **Cada tarefa tem “Pronto quando”** — use como critério de aceite.

---

## ETAPA 1 — Colocar o app de checklist no ar (de verdade)

### T1.1 — Login do motorista (real)

O motorista loga no app (e-mail/senha) pelo Hub. Hoje, quando um **contato** de um motorista é criado
no backend principal (`adapta-api`), o **parceiro** é replicado pro Hub, mas o **contato (com senha) não**
— então o login falha.

- Criar no Hub (`adapta-hub`) um endpoint interno `POST /contacts/internal` que recebe e grava o contato
  (nome, e-mail, **hash de senha**, vínculo ao parceiro).
- No `adapta-api`, ao criar/editar um contato de motorista, **chamar esse endpoint do Hub** (espelhar o
  que já é feito pra replicar o parceiro).
- **Pronto quando:** criar um motorista + contato no backend e conseguir **logar no app** com esse e-mail/senha.

### T1.2 — Ligar o app no backend (tirar o modo demonstração)

O app hoje usa dados de exemplo. Apontar pros endpoints reais que já existem:
`/driver/fleet-checklists` (listar/criar/preencher/concluir), `/driver/fleet-checklists/templates`,
`/driver/fleet-checklists/vehicles`, `/driver/fleet-checklists/a-fazer`.

- Desligar o modo demonstração (variável de ambiente `NEXT_PUBLIC_MOCK_DATA`) e validar cada chamada.
- **Pronto quando:** logado, o motorista cria um checklist, preenche e conclui **com dados reais**; e um
  item “bloqueante” reprovado deixa o **veículo indisponível** (status muda).

### T1.3 — Foto por item no checklist

No preenchimento, permitir **anexar foto** em cada item (especialmente nos “Não Conforme”).

- Usar a câmera; subir a imagem pelo endpoint de arquivos do backend; guardar a URL no item.
- Funcionar **offline**: a foto entra na fila e sobe quando reconecta.
- **Pronto quando:** tira foto offline, reconecta, e a foto aparece no checklist no backend.

### T1.4 — Busca “esperta” de veículo/motorista

Nas buscas (placa/nome), ignorar acento, traço e maiúscula/minúscula (“se eu digito P, traz tudo que tem P”).

- **Pronto quando:** buscar “mgy” acha “MGY-3388”; buscar “joao” acha “João”.

---

## ETAPA 2 — Disponibilidade da frota

### T2.1 — Estados e travamento de veículo

- Adicionar os estados **BLOQUEADO** e **ACIDENTE** ao veículo (hoje só tem Disponível/Em viagem/Manutenção/Inativo).
- Criar o conceito de **travar veículo por período** (motivo + data/hora início/fim; o motivo pode ser
  “manutenção”, “acidente”, “documentação”, “viagem por terceiros” etc.).
- Tela na web (`gestao-frota`) pra **travar/liberar** um veículo.
- **Pronto quando:** travar um veículo o tira da lista de disponíveis e mostra o motivo/período.

### T2.2 — Calendário/grade de disponibilidade

Tela em grade (estilo planilha, dias na vertical) mostrando, por equipamento e dia, o status (disponível,
em viagem, manutenção, bloqueado).

- Filtros: período (data início/fim), equipamento de tração ou reboque, tipo de equipamento, motorista, ID de viagem.
- Indicador mensal de disponibilidade (quanto tempo disponível-em-viagem × disponível-em-manutenção × indisponível).
- **Pronto quando:** dá pra ver o mês de um caminhão e os dias que ele esteve em cada estado.

### T2.3 — Disponibilidade para a Programação

- Endpoint que entrega “o que está disponível hoje / nos próximos dias” (por cavalo, reboque, tipo).
- Tela onde a Frota vê os veículos livres **antes de criar a viagem**, com a opção de **criar a viagem a
  partir dali**.
- **Pronto quando:** a Programação enxerga a disponibilidade sem planilha manual.

---

## ETAPA 3 — App da Frota (ADM) com dados reais

### T3.1 — Telas da Frota no real

O app já tem a área da Frota (abas Chegadas, A fazer, Disponibilidade, Gerenciadora, Templates), hoje com
dados de exemplo. Ligar cada uma:

- **Chegadas:** motoristas que chegaram → abrir o checklist do veículo pra **fazer junto**.
- **A fazer:** lista dos “a fazer” lançados pelos motoristas → **aprovar/rejeitar** (vira ordem de serviço).
- **Templates:** criar/editar **modelos de checklist** (nome, tipo, itens, marcar itens bloqueantes).
- **Disponibilidade:** consome a Etapa 2.
- **Pronto quando:** cada aba opera com dados reais (sem mock).

### T3.2 — Calendário de aderência + alerta de calibragem

- Tela mostrando, por motorista/veículo, os dias que o **checklist diário** foi feito ou não (estilo calendário).
- **Alerta de calibragem de pneu**: avisar quando passou da periodicidade (configurável, padrão **10 dias**)
  desde a última, pro motorista e pra Frota.
- **Pronto quando:** dá pra ver “fez 18 de 22 dias” e o sistema avisa calibragem vencida.

---

## ETAPA 4 — Manutenção, odômetro, revisão e custos

### T4.1 — Odômetro do veículo (várias fontes)

O veículo já tem um campo de km atual, alimentado pelo checklist. Estender:

- Atualizar o km também pelos lançamentos de **abastecimento** e de **ordem de serviço**.
- Sempre usar o **maior/mais recente** e registrar de onde veio.
- **Pronto quando:** lançar abastecimento com km maior atualiza o odômetro do veículo.

### T4.2 — Manutenção como quadro (Kanban)

- Transformar a manutenção em um **quadro arrastável**: “a fazer / fazendo / feito”.
- **Manutenções pendentes recorrentes:** o que não foi feito **fica pendente na placa** e **reaparece** toda
  vez que abrir uma nova OS daquele veículo (com a opção “faço agora / deixo pra depois”).
- **Follow-up de quebra na estrada:** card com previsão de solução (em até 24h), visível também pra Comercial/Programação.
- **Pronto quando:** abrir nova OS de um veículo traz as pendências anteriores não baixadas.

### T4.3 — Planos de revisão + relatório

- **Plano de revisão** por **km**, por **tempo** ou por **nº de viagens** (o que vier primeiro). Ex.: óleo a cada
  6 meses **ou** a cada X km.
- **Dashboard** com alerta: em dia / vencido / vencendo nos próximos 2.000 km.
- **Relatório de revisão**: revisão realizada (km, data, fornecedor, nº OS, nº NF, custo) + **previsão da próxima**
  (com base na média de km rodado, e por tempo quando o caminhão roda pouco).
- **Pronto quando:** dá pra cadastrar um plano e ver a previsão da próxima revisão por veículo.

### T4.4 — Relatório de custo de manutenção

- Custo por veículo dividido em: combustível, pneus, preventiva, corretiva, guincho, funilaria, adesivagem, acessórios.
- **Custo geral** e **custo por km**.
- **Pronto quando:** dá pra ver o custo de um caminhão por categoria e por km no período.

---

## ETAPA 5 — Jornada (via macros no app)

### T5.1 — Macros no app do motorista

- Criar o registro de **macro** (veículo, motorista, tipo da macro, hora, localização opcional) e a
  **sequência permitida** (recebimento do veículo → início de viagem → parada/refeição/abastecimento/pernoite →
  chegada → descarga → engate/desengate → fim). A sequência completa está na planilha `1.1 MACROS SEQUENCIADAS`.
- No app: o motorista **passa a macro** (botões; só aparecem as válidas a partir do estado atual). Funciona offline.
- **Pronto quando:** o motorista consegue passar a sequência de macros de uma viagem no app.

### T5.2 — Jornada a partir das macros

- Calcular a jornada (Lei 13.103: 5h30 sem pausa / 11h entre jornadas / 10h/dia) usando as **macros** como
  fonte de início/pausa/fim.
- Tratar: início de jornada ≠ início de viagem; troca de motorista no mesmo caminhão; tempo parado no destino.
- **Pronto quando:** a jornada do motorista bate com as macros que ele passou.

---

## ETAPA 6 — Relatórios, pneus e combustível

### T6.1 — KPIs de pneus

- **Custo por km** do pneu; **melhor marca/modelo por tipo de equipamento** (tração × reboque); performance por
  vida (1ª/2ª/3ª recapagem).
- **Linha do tempo do pneu**: compra (vida 0) → recapagens (marcos) → quais viagens/qual caminhão entre os marcos.
- **Pronto quando:** dá pra comparar marcas de pneu por custo/km e ver a vida de um pneu específico.

### T6.2 — Combustível

- **Eficiência km/l** por placa (usando o odômetro + litros das notas).
- **Importar** abastecimento por arquivo dos fornecedores (CTF / HitFrota — PDF/XML).
- **Pronto quando:** importar um arquivo lança os abastecimentos e calcula o km/l da placa.

### T6.3 — Telas de relatório (BI)

- Telas só de indicadores (estilo planilha/gráfico) para: disponibilidade, revisão, pneus, custo de manutenção,
  combustível e faturamento.
- **Pronto quando:** cada relatório mostra os números reais e dá pra filtrar por período/veículo.

---

## ETAPA 7 — Sinistro e acerto de contas do motorista

### T7.1 — Sinistro (visão da Frota)

- A tela de sinistros da Frota deve usar o **mesmo sinistro** que o GR usa (um sinistro por evento/placa — não
  criar dois). Acrescentar **motivo** e **descrição do acontecimento** (pista molhada/seca, horário) pelo motorista.
- **Pronto quando:** lançar um sinistro aparece tanto pra Frota quanto pro GR, sem duplicar.

### T7.2 — Acerto de contas do motorista

- O motorista tem **cartão Extratta**; lança gastos ao longo da viagem (foto) e acerta quando chega.
- Mostrar **o que gastou por viagem**; tipos: **diárias** (não descontam), **ajudantes**, e gastos que **exigem
  comprovante** (sem canhoto → desconta). Controlar **saldo do motorista** (fechamento 21→20).
- **Gerar PDF** do acerto. Tela no app/web da Frota com as **chegadas** pra seguir o fluxo de acerto.
- **Pronto quando:** dá pra fechar o acerto de um motorista e gerar o PDF.

---

## ETAPA 8 — Faturamento, conjunto (GR) e comunicação

### T8.1 — Faturamento da Frota

- Mostrar a **receita da Frota** por **placa**, por **viagem** e por **dia**, em **calendário** (grade).
- Regras: dia **em viagem sem receita** → mostra o ID e receita zerada; dia **sem viagem** → disponível;
  **diária** entra somada à viagem no dia em que foi emitida.
- Ao clicar num valor, ver **quais viagens/rotas/CT-es** compõem. Totais (frete do dia, pedágio).
- _(Implementar a origem da receita atrás de um service isolado, pra ser fácil trocar a forma de cálculo depois.)_
- **Pronto quando:** dá pra ver quanto cada placa faturou por dia e abrir a composição.

### T8.2 — Checklist do conjunto cavalo+carreta (GR) no app

- No app, **exibir** se o conjunto (cavalo + carreta) tem vistoria válida; e permitir **capturar** a vistoria
  **manual** do conjunto (item a item), gravando na vistoria de conjunto que o GR usa.
- Mostrar também o status do checklist da **gerenciadora** (esse é registrado no GR; o app só exibe).
- **Pronto quando:** o motorista vê o status de liberação do conjunto e consegue fazer a vistoria manual.

### T8.3 — Chat / caixa de solicitações interna

- Canal de comunicação dentro do sistema (substitui e-mail/WhatsApp): solicitações caem pra equipe certa.
- **Pronto quando:** dá pra abrir uma solicitação e ela chega pro setor responsável.

---

> **Sugestão de ordem:** Etapas 1 → 2 → 3 dão um app de checklist + disponibilidade funcionando ponta a ponta.
> As 4–6 são as evoluções (manutenção, jornada, relatórios). As 7–8 dependem mais de outras áreas (GR/Financeiro),
> então ficam por último.
