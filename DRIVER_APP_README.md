# App do Motorista - Documentação

## 📱 Visão Geral

App mobile-first desenvolvido para motoristas de caminhão, focado em usabilidade e interface touch-friendly.

## 🚀 Instalação

1. Instale as dependências necessárias:

```bash
npm install
# ou
yarn install
```

As seguintes dependências foram adicionadas ao `package.json`:

- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-label`
- `@radix-ui/react-separator`
- `@radix-ui/react-switch`
- `@radix-ui/react-tabs`

## 📂 Estrutura

### Componentes UI

Todos os componentes UI foram criados em `src/components/ui/`:

- `button.tsx`
- `card.tsx`
- `badge.tsx`
- `input.tsx`
- `tabs.tsx`
- `switch.tsx`
- `label.tsx`
- `avatar.tsx`
- `separator.tsx`
- `skeleton.tsx`
- `alert-dialog.tsx`

### Componente Principal

- `src/components/DriverApp.tsx` - Componente principal com todas as telas e navegação

### Página de Exemplo

- `src/app/driver/page.tsx` - Página que renderiza o DriverApp

## 🎯 Funcionalidades

### 1. Tela de Login

- Input para CPF ou Telefone
- Input para Senha
- Botão "Entrar" grande e touch-friendly
- Links para "Esqueci minha senha" e "Primeiro Acesso"

### 2. Tela Home (Dashboard)

- Header com saudação e status do motorista
- Card de resumo financeiro (Saldo a Receber e Ganhos do Mês)
- Card flutuante de viagem atual (se houver)
- Atalhos rápidos para "Meus Veículos" e "Chat com a Base"

### 3. Tela "Minhas Viagens"

- Tabs para "Atuais" e "Histórico"
- Lista de cards com informações da viagem
- Badges de status coloridos
- Botão "Ver Detalhes" em cada card

### 4. Tela "Detalhes da Viagem"

- Header com rota e data
- Botão para abrir no Maps/Waze
- Timeline vertical com 4 etapas:
  1. Chegada na Origem
  2. Coleta
  3. Envio de Documentos (com upload de foto)
  4. Entrega
- Botão "Reportar Ocorrência" (Pânico)

### 5. Tela "Viagens Disponíveis" (Ofertas)

- Lista de ofertas de carga (Spot)
- Informações: Valor, KM, Tipo de Veículo, Rota
- Botões "Aceitar Carga" e "Contra-proposta"

### 6. Tela de Configurações

- Foto do perfil
- Meus Dados (CPF, CNH, Status do GR, Telefone)
- Meu Veículo (Placa, Modelo, RNTRC)
- Switch para Modo Noturno
- Botão "Sair" com confirmação

## 🎨 Design Mobile-First

### Princípios Aplicados

- **Touch Targets**: Todos os botões têm no mínimo 44px de altura
- **Espaçamento**: Uso de `p-4` ou `p-6` para garantir respiro
- **Tipografia**: Títulos grandes, textos com bom contraste
- **Feedback Visual**: Spinners e toasts para ações
- **Bottom Navigation**: Menu inferior fixo com 4 abas

### Cores

- Primary: `#ed6842` (configurado em `globals.css`)
- Badges: Success (verde), Warning (amarelo), Info (azul), Destructive (vermelho)

## 📊 Dados Mockados

O app utiliza dados mockados definidos em `DriverApp.tsx`:

- **Motorista**: João Silva com dados completos
- **Viagens**: 1 viagem em andamento + 2 no histórico
- **Ofertas**: 3 ofertas disponíveis

## 🔧 Como Usar

1. Acesse a rota `/driver` no navegador
2. Faça login (qualquer CPF/senha funciona no mock)
3. Navegue pelas abas inferiores:
   - **Home**: Dashboard principal
   - **Viagens**: Minhas viagens atuais e histórico
   - **Ofertas**: Cargas disponíveis
   - **Perfil**: Configurações e dados do motorista

## 📱 Visualização Desktop

O app está configurado para simular um dispositivo mobile no desktop:

- Container com `max-w-md` (largura máxima de 448px)
- Centralizado com bordas laterais
- Bottom navigation bar fixa na parte inferior

## 🛠️ Próximos Passos

1. Conectar com API real
2. Implementar autenticação real
3. Adicionar integração com Maps/Waze
4. Implementar upload real de fotos
5. Adicionar notificações push
6. Implementar modo escuro completo

## 📝 Notas

- O app está 100% funcional com dados mockados
- Todos os componentes seguem o design system do `integra-web-v2`
- A navegação é baseada em estado local (useState)
- Para produção, será necessário implementar roteamento com Next.js Router
