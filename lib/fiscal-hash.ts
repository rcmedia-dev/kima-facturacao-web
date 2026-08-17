/**
 * Código Hash Fiscal (Art. 10º, alínea j — Decreto Presidencial nº 71/25).
 *
 * Gera um hash SHA-256 determinístico sobre o conteúdo fiscal do documento,
 * de forma a garantir autenticidade e integridade do documento emitido.
 * Funciona tanto no browser (Web Crypto) como no servidor Node.js.
 */

interface LinhaHash {
  descricao: string;
  quantidade: number;
  preco: number;
  taxaIVA: number;
  total: number;
}

export interface ConteudoHash {
  tipo: string;
  serie: string;
  numero: string;
  numeroCompleto: string;
  dataEmissao: Date | string;
  clienteNif?: string;
  fornecedorNif?: string;
  subtotal: number;
  totalIVA: number;
  total: number;
  formaPagamento?: string;
  linhas: LinhaHash[];
}

function normalizarNumero(v: number | string): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return (isNaN(n) ? 0 : n).toFixed(2);
}

/** Constrói a string canónica que alimenta o hash. */
export function construirConteudoHash(dados: ConteudoHash): string {
  const data = dados.dataEmissao ? new Date(dados.dataEmissao).toISOString() : "";
  const linhas = (dados.linhas || [])
    .map(
      (l) =>
        [l.descricao || "", normalizarNumero(l.quantidade), normalizarNumero(l.preco), String(l.taxaIVA), normalizarNumero(l.total)].join("|")
    )
    .join(";");

  return [
    dados.tipo || "",
    dados.serie || "",
    dados.numero || "",
    dados.numeroCompleto || "",
    data,
    dados.clienteNif || "",
    dados.fornecedorNif || "",
    normalizarNumero(dados.subtotal),
    normalizarNumero(dados.totalIVA),
    normalizarNumero(dados.total),
    dados.formaPagamento || "",
    linhas,
  ].join("#");
}

async function sha256(texto: string): Promise<string> {
  const data = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(buffer));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hash fiscal (SHA-256) em hexadecimal, com separadores para legibilidade. */
export async function gerarHashFiscal(dados: ConteudoHash): Promise<string> {
  const conteudo = construirConteudoHash(dados);
  const hex = await sha256(conteudo);
  return hex.toUpperCase();
}

/** Formata o hash em blocos legíveis (ex: AB12-CD34-EF56...). */
export function formatarHash(hash: string, bloco = 4, maxBlocos = 12): string {
  const limpo = hash.replace(/-/g, "");
  const blocos: string[] = [];
  for (let i = 0; i < limpo.length && blocos.length < maxBlocos; i += bloco) {
    blocos.push(limpo.slice(i, i + bloco));
  }
  return blocos.join("-");
}
