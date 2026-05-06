<h1 align="center">💰 MyFinances</h1>

<p align="center">
  <strong>Sua vida financeira, finalmente sob controle.</strong>
</p>

<p align="center">
  Um sistema completo de finanças pessoais para acompanhar despesas, receitas, investimentos,<br />
  cartão de crédito e impostos — tudo organizado por mês, com gráficos e fechamento automático de saldo.
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img alt="Fastify" src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img alt="TailwindCSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

---

## 🎯 O que ele faz

### 📊 Dashboard que faz sentido
Visão consolidada do mês com **saldo atual**, **renda x despesas**, **distribuição por categoria** e gráficos de evolução. Em uma tela você sabe se o mês está no azul ou se o cartão escapou.

### 💸 Despesas e receitas inteligentes
Lançamentos por **categoria**, **método de pagamento** (PIX, débito, dinheiro, transferência) e **mês de competência**. Receitas avulsas + **perfis de salário recorrentes** com vigência (início e fim).

### 💳 Cartão de crédito com parcelas reais
Cadastrou uma compra parcelada em 12x? O sistema **gera as parcelas automaticamente** mês a mês — você vê exatamente quanto do cartão futuro já está comprometido.

### 📈 Carteira de investimentos
Suporte a **ações, FIIs, ETFs, cripto, Tesouro Direto, CDB, LCI/LCA, debêntures e poupança**.
Histórico de rendimento via **snapshots periódicos**, marcação de **vencimento**, **resgate** e gráficos de evolução do patrimônio.

### 🧾 Impostos brasileiros nativos
**MEI, IRPF, IPVA, IPTU, IRRF, ITR, ITCMD, COFINS, PIS, ICMS, ISS, IOF** — com frequência (mensal, trimestral, semestral, anual) e data de vencimento.

### 📥 Importação de extratos
Faça upload do extrato do banco e o sistema **detecta duplicatas**, **agrupa transações recorrentes** e te deixa **revisar antes de confirmar**. Nada entra na sua base sem o seu OK.

### 🔒 Fechamento de mês
Confirme o mês e o **saldo final é transferido automaticamente** para o mês seguinte. Histórico imutável, mês atual sempre limpo.

---

## 🛠️ Construído com

<table>
  <tr>
    <td valign="top" width="50%">
      <h4>🎨 Frontend</h4>
      <ul>
        <li><strong>React 19</strong> + <strong>Vite 7</strong></li>
        <li><strong>TypeScript</strong> em tudo</li>
        <li><strong>Tailwind CSS 4</strong> + <strong>shadcn/ui</strong> (Radix)</li>
        <li><strong>React Router 7</strong> com code splitting</li>
        <li><strong>React Hook Form</strong> + <strong>Zod</strong></li>
        <li><strong>Recharts</strong> para os gráficos</li>
        <li><strong>Axios</strong> para HTTP</li>
      </ul>
    </td>
    <td valign="top" width="50%">
      <h4>⚙️ Backend</h4>
      <ul>
        <li><strong>Fastify 5</strong> — HTTP rápido e tipado</li>
        <li><strong>Prisma 6</strong> + <strong>PostgreSQL 15</strong></li>
        <li><strong>JWT</strong> + <strong>refresh token</strong> via cookie httpOnly</li>
        <li><strong>Zod</strong> para validação de schemas</li>
        <li><strong>Multipart</strong> para upload de extratos</li>
        <li><strong>Vitest</strong> — unit + e2e</li>
        <li><strong>Docker Compose</strong> para o banco</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🏗️ Decisões de arquitetura

Algumas escolhas que valem destaque:

- **Camadas separadas** — `controllers` cuidam só de HTTP/validação, `services` carregam a regra de negócio, `repositories` isolam o Prisma. Trocar de ORM amanhã não quebra a aplicação.
- **Validação ponta a ponta com Zod** — o mesmo schema valida o `body` da request no backend e o formulário no frontend.
- **Snapshots de investimentos** — em vez de sobrescrever o rendimento, cada atualização gera um registro histórico, permitindo gráficos reais de evolução de patrimônio.
- **Fechamento mensal imutável** — meses confirmados viram histórico congelado, evitando edição acidental de dados passados.
- **Geração automática de parcelas** — uma única compra parcelada vira N registros vinculados, refletindo no caixa de cada mês futuro.
- **Importação com revisão obrigatória** — nenhuma transação importada entra direto: passa por uma camada de detecção de duplicatas e categorização antes de ser confirmada.

---

## 🚀 Rodando localmente

Quer testar no seu ambiente?

```bash
# 1. Clone o repositório
git clone https://github.com/PedroDalalio/MyFinances.git
cd MyFinances

# 2. Backend (em um terminal)
cd backend
cp .env.example .env
pnpm install
docker compose up -d
pnpm prisma migrate deploy
pnpm dev

# 3. Frontend (em outro terminal)
cd ../frontend
cp .env.example .env
pnpm install
pnpm dev
```

**Pré-requisitos:** Node ≥ 20, pnpm ≥ 10 e Docker.

---

<p align="center">
  Feito com <strong>☕ café</strong> e <strong>TypeScript</strong> por <a href="https://github.com/PedroDalalio"><strong>Pedro Dalalio</strong></a>
</p>

<p align="center">
  <sub>Se o projeto te ajudou ou inspirou, deixa uma ⭐ — significa muito!</sub>
</p>
