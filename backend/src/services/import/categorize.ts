import { ImportTransactionType } from '@prisma/client'

interface CategorizeResult {
  type: ImportTransactionType
  category: string | null
  cleanDescription: string
}

// Regras de categorização - podem ser expandidas com o tempo
const rules: { patterns: RegExp[], type: ImportTransactionType, category: string }[] = [
  // Investimentos
  { patterns: [/tesouro direto/i, /tesouro selic/i, /tesouro ipca/i, /tesouro prefixado/i], type: 'INVESTMENT', category: 'Tesouro Direto' },
  { patterns: [/cdb/i, /lci/i, /lca/i, /debenture/i], type: 'INVESTMENT', category: 'Renda Fixa' },
  { patterns: [/b3.*compra/i, /compra.*acoes/i, /compra.*ações/i, /corretora/i, /rico/i, /nuinvest/i, /xp.*invest/i], type: 'INVESTMENT', category: 'Ações' },
  { patterns: [/fundo.*invest/i, /invest.*fundo/i], type: 'INVESTMENT', category: 'Fundos' },
  { patterns: [/cripto/i, /bitcoin/i, /btc/i, /ethereum/i, /eth/i, /binance/i, /mercado bitcoin/i], type: 'INVESTMENT', category: 'Cripto' },

  // Impostos/Taxas
  { patterns: [/\bmei\b/i, /das.*mei/i, /simples nacional/i], type: 'TAX', category: 'MEI' },
  { patterns: [/iptu/i], type: 'TAX', category: 'IPTU' },
  { patterns: [/ipva/i], type: 'TAX', category: 'IPVA' },
  { patterns: [/irpf/i, /imposto.*renda/i], type: 'TAX', category: 'IRPF' },
  { patterns: [/iof/i], type: 'TAX', category: 'IOF' },

  // Ignorar - transferências entre contas próprias
  { patterns: [/transf.*mesma titularidade/i, /transf.*entre contas/i, /aplicacao.*automatica/i, /aplicação.*automática/i, /resgate.*automatico/i], type: 'IGNORE', category: null },

  // Entradas
  { patterns: [/salario/i, /salário/i, /folha.*pagamento/i, /pgto.*salario/i], type: 'INCOME', category: 'Salário' },
  { patterns: [/freelance/i, /freela/i], type: 'INCOME', category: 'Freelance' },
  { patterns: [/reembolso/i, /estorno/i, /devolucao/i, /devolução/i], type: 'INCOME', category: 'Reembolso' },

  // Gastos comuns
  { patterns: [/supermercado/i, /mercado/i, /hortifruti/i, /padaria/i, /açougue/i], type: 'EXPENSE', category: 'Alimentação' },
  { patterns: [/restaurante/i, /lanchonete/i, /ifood/i, /uber.*eats/i, /rappi/i, /pizza/i], type: 'EXPENSE', category: 'Alimentação' },
  { patterns: [/farmacia/i, /farmácia/i, /drogaria/i, /droga.*raia/i], type: 'EXPENSE', category: 'Saúde' },
  { patterns: [/uber(?!.*eats)/i, /99.*taxi/i, /99pop/i, /cabify/i], type: 'EXPENSE', category: 'Transporte' },
  { patterns: [/combustivel/i, /combustível/i, /gasolina/i, /etanol/i, /posto/i, /shell/i, /ipiranga/i], type: 'EXPENSE', category: 'Transporte' },
  { patterns: [/netflix/i, /spotify/i, /disney/i, /hbo/i, /prime.*video/i, /amazon.*prime/i, /youtube.*premium/i, /deezer/i], type: 'EXPENSE', category: 'Assinaturas' },
  { patterns: [/aluguel/i, /condominio/i, /condomínio/i], type: 'EXPENSE', category: 'Moradia' },
  { patterns: [/luz/i, /energia/i, /celesc/i, /cemig/i, /cpfl/i, /enel/i, /eletro/i], type: 'EXPENSE', category: 'Moradia' },
  { patterns: [/agua/i, /água/i, /saneamento/i, /copasa/i, /sabesp/i], type: 'EXPENSE', category: 'Moradia' },
  { patterns: [/internet/i, /claro/i, /vivo/i, /tim/i, /oi\b/i, /telefone/i, /celular/i], type: 'EXPENSE', category: 'Telecom' },
]

export function categorizeTransaction(description: string, isCredit: boolean): CategorizeResult {
  const cleanDescription = cleanupDescription(description)

  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(description) || pattern.test(cleanDescription)) {
        return {
          type: rule.type,
          category: rule.category,
          cleanDescription,
        }
      }
    }
  }

  // Default: se é crédito, é entrada; se é débito, é gasto
  return {
    type: isCredit ? 'INCOME' : 'EXPENSE',
    category: null,
    cleanDescription,
  }
}

function cleanupDescription(description: string): string {
  let clean = description
    .replace(/\d{2}\/\d{2}$/g, '') // Remove data no final
    .replace(/\s{2,}/g, ' ')       // Múltiplos espaços
    .trim()

  // Capitalizar primeira letra
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
  }

  return clean
}
