// O @types/pdf-parse só tipa o entrypoint principal. Importamos o lib interno
// (pdf-parse/lib/pdf-parse.js) para evitar o código de debug do index.js, então
// reusamos a tipagem do pacote principal aqui.
declare module "pdf-parse/lib/pdf-parse.js" {
  import pdf from "pdf-parse"
  export default pdf
}
