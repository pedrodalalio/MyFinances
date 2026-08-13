// Modelos da posição de renda fixa aceita pela importação. Servem como
// referência de layout: você preenche com os seus valores (ou entrega o modelo
// para gerar o arquivo a partir dos prints do banco) e importa.
//
// Os nomes de coluna aqui são os que o parser reconhece de cara — ele também
// aceita variações ("Título", "Principal", "Valor líquido"), mas o modelo
// entrega o caminho mais curto.

// Colunas na forma que o parser de planilha (parse-investment-spreadsheet)
// reconhece. Ele normaliza o cabeçalho sem acento e por palavra-chave, então
// variações funcionam — mas o modelo entrega o caminho mais curto.
const COLUMNS = [
  "Nome",
  "Data de aplicacao",
  "Valor aplicado",
  "Valor bruto",
  "Valor liquido",
  "Rentabilidade",
];

// As linhas de exemplo usam datas antigas de propósito: se o modelo for
// importado sem editar, ele não casa com nenhuma aplicação de verdade.
const EXAMPLE_ROWS = [
  ["EXEMPLO - apague esta linha", "15/01/2020", "1000,00", "1080,00", "1062,00", "103% CDI"],
  ["EXEMPLO - apague esta linha", "10/03/2021", "500,00", "560,00", "547,66", "119% CDI"],
];

export const STATEMENT_TEMPLATE_CSV = "modelo-rendimentos.csv";
export const STATEMENT_TEMPLATE_PDF = "modelo-rendimentos.pdf";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadStatementTemplateCsv(): void {
  const rows = [COLUMNS, ...EXAMPLE_ROWS].map((row) => row.join(";"));
  // BOM para o Excel em pt-BR abrir os acentos do cabeçalho corretamente.
  const content = `\uFEFF${rows.join("\r\n")}\r\n`;
  triggerDownload(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
    STATEMENT_TEMPLATE_CSV,
  );
}

// ————— PDF —————
// A ordem das colunas aqui NÃO é a mesma do CSV: o parser de PDF é posicional
// (lê a linha inteira com uma regex, porque o pdf-parse entrega a tabela como
// texto corrido), então o modelo precisa seguir a ordem do extrato de banco.
const PDF_COLUMNS = [
  "V. Bruto",
  "Taxa",
  "V. Aplicado",
  "IR",
  "IOF",
  "V. Líquido",
  "Emissão",
  "Vencimento",
  "Papel",
  "Emissor",
];

// Mesmos exemplos do CSV, reordenados para o layout do PDF
const PDF_EXAMPLE_ROWS = [
  ["1.080,00", "103,0 % CDI", "1.000,00", "0,00", "0,00", "1.062,00", "15/01/2020", "15/01/2022", "EXEMPLO apague esta linha", "Banco"],
  ["560,00", "119,0 % CDI", "500,00", "12,34", "0,00", "547,66", "10/03/2021", "10/03/2023", "EXEMPLO apague esta linha", "Banco"],
];

const FONT_SIZE = 8;
const LINE_HEIGHT = 14;
const MARGIN_LEFT = 24;
const FIRST_LINE_Y = 40;

// Larguras em caracteres, na ordem de PDF_COLUMNS
const COLUMN_WIDTHS = [12, 14, 12, 9, 8, 12, 12, 12, 27, 10];

function padCell(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width) : value.padEnd(width);
}

// O espaço à direita é aparado: a regex do parser ancora o emissor no fim da
// linha, e sobra de padding quebraria o casamento.
function toRow(cells: string[]): string {
  return cells
    .map((cell, index) => padCell(cell, COLUMN_WIDTHS[index]))
    .join(" ")
    .trimEnd();
}

export function statementTemplatePdfLines(): string[] {
  return [
    "Posicao de renda fixa - MODELO",
    "",
    toRow(PDF_COLUMNS),
    ...PDF_EXAMPLE_ROWS.map(toRow),
    "",
    "Uma linha por aplicacao, nesta mesma ordem de colunas.",
    "Datas dd/mm/aaaa e valores no formato 1.234,56.",
    "O casamento com o cadastro usa Emissao (+/- 1 dia) e V. Aplicado.",
  ];
}

// A lib de PDF entra por import dinâmico: ela só é baixada quando o botão é
// clicado, sem pesar no carregamento da página.
export async function downloadStatementTemplatePdf(): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  // Courier é monoespaçada: as colunas alinhadas no texto se mantêm alinhadas
  // na página, e o parser reencontra os campos na leitura.
  doc.setFont("courier", "normal");
  doc.setFontSize(FONT_SIZE);

  statementTemplatePdfLines().forEach((line, index) => {
    if (line) doc.text(line, MARGIN_LEFT, FIRST_LINE_Y + index * LINE_HEIGHT);
  });

  triggerDownload(doc.output("blob"), STATEMENT_TEMPLATE_PDF);
}
