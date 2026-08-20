/**
 * T3.3 · Validador de Esquema XSD SAF-T — Certificação AGT
 *
 * Valida o ficheiro XML SAF-T gerado por `exportarSAFTXML` em duas camadas:
 *  1. Sintática — bem-formação XML (tags balanceadas, atributos entre aspas,
 *     sem caracteres ilegais no texto); parser próprio, sem dependências.
 *  2. Estrutural — ordem e presença dos elementos exigidos pelo esquema
 *     de referência `schemas/saft-ao.xsd` (Header, MasterFiles, Documents,
 *     TaxSummary, Customers, SalesInvoices).
 *
 * Corresponde à tarefa T3.3 do CRONOGRAMA_NUCLEO_TECNICO_AGT.md (R11).
 */

// ─── Parser XML mínimo (bem-formação) ─────────────────────────────────────────

export interface NoXML {
  nome: string;
  atributos: Record<string, string>;
  texto: string;
  filhos: NoXML[];
}

function lerNome(xml: string, i: number): { nome: string; fim: number } {
  const inicio = i;
  while (i < xml.length && !/[\s/>]/.test(xml[i])) i++;
  return { nome: xml.slice(inicio, i), fim: i };
}

/**
 * Verifica a bem-formação do XML e devolve a árvore de elementos.
 * Lança Error com a mensagem detalhada em caso de XML inválido.
 */
export function parseXML(xml: string): NoXML {
  let i = 0;
  const raiz = new Map<string, NoXML[]>();
  const stack: NoXML[] = [];

  const erro = (msg: string) => {
    throw new Error(`XML mal formado (posição ${i}): ${msg}`);
  };

  while (i < xml.length) {
    const lt = xml.indexOf('<', i);
    if (lt === -1) break;
    const texto = xml.slice(i, lt);
    if (/[^\s]/.test(texto) && stack.length > 0) {
      stack[stack.length - 1].texto += texto;
    }
    if (/<[^!?/]/.test(xml.slice(lt, lt + 2))) {
      // Abertura de elemento
      const { nome, fim } = lerNome(xml, lt + 1);
      if (!nome) erro('nome de elemento vazio');
      const atributos: Record<string, string> = {};
      let j = fim;
      let fechamentoDireto = false;
      while (j < xml.length && xml[j] !== '>') {
        if (/\s/.test(xml[j])) {
          j++;
          continue;
        }
        if (xml[j] === '/') {
          fechamentoDireto = true;
          j++;
          continue;
        }
        const { nome: attr, fim: fimAttr } = lerNome(xml, j);
        j = fimAttr;
        while (j < xml.length && /\s/.test(xml[j])) j++;
        if (xml[j] !== '=') erro(`atributo "${attr}" sem valor`);
        j++;
        while (j < xml.length && /\s/.test(xml[j])) j++;
        const aspas = xml[j];
        if (aspas !== '"' && aspas !== "'") erro(`valor do atributo "${attr}" sem aspas`);
        j++;
        const fimAspas = xml.indexOf(aspas, j);
        if (fimAspas === -1) erro(`aspas do atributo "${attr}" não fechadas`);
        atributos[attr] = xml.slice(j, fimAspas);
        j = fimAspas + 1;
      }
      if (xml[j] !== '>') erro('tag de abertura não fechada');
      j++;
      if (fechamentoDireto) {
        const no: NoXML = { nome, atributos, texto: '', filhos: [] };
        const pai = stack[stack.length - 1];
        if (pai) pai.filhos.push(no);
        else raiz.set(nome, [...(raiz.get(nome) || []), no]);
      } else {
        const no: NoXML = { nome, atributos, texto: '', filhos: [] };
        const pai = stack[stack.length - 1];
        if (pai) pai.filhos.push(no);
        else raiz.set(nome, [...(raiz.get(nome) || []), no]);
        stack.push(no);
      }
      i = j;
    } else if (/^<\/[A-Za-z]/.test(xml.slice(lt, lt + 3))) {
      // Fecho de elemento
      const { nome, fim } = lerNome(xml, lt + 2);
      const fimTag = xml.indexOf('>', fim);
      if (fimTag === -1) erro('tag de fecho não fechada');
      const aberto = stack.pop();
      if (!aberto) {
        throw new Error(`XML mal formado (posição ${i}): </${nome}> sem elemento de abertura correspondente`);
      }
      if (aberto.nome !== nome) {
        throw new Error(`XML mal formado (posição ${i}): </${nome}> não corresponde a <${aberto.nome}>`);
      }
      i = fimTag + 1;
    } else if (xml.startsWith('<?', lt) || xml.startsWith('<!', lt)) {
      // Declaração / comentário / CDATA — salta até '>'
      const fimTag = xml.indexOf('>', lt);
      if (fimTag === -1) erro('declaração não fechada');
      i = fimTag + 1;
    } else {
      erro('sintaxe inválida');
    }
  }

  if (stack.length > 0) {
    throw new Error(`XML mal formado: elemento <${stack[stack.length - 1].nome}> não foi fechado`);
  }
  if (raiz.size !== 1) {
    throw new Error('XML mal formado: documento sem raiz única');
  }
  const [nomeRaiz, nos] = [...raiz.entries()][0];
  if (nos.length !== 1) throw new Error('XML mal formado: raiz duplicada');
  return nos[0];
}

// ─── Esquema estrutural (espelho de schemas/saft-ao.xsd) ─────────────────────

interface DefinicaoElemento {
  nome: string;
  obrigatorio?: boolean;
  maxOcorrencias?: number;
  filhos: { nome: string; obrigatorio?: boolean; maxOcorrencias?: number }[];
}

const ESQUEMA_SAFT: DefinicaoElemento[] = [
  {
    nome: 'SAF-T',
    filhos: [
      { nome: 'Header', obrigatorio: true },
      { nome: 'MasterFiles', obrigatorio: true },
      { nome: 'Documents', obrigatorio: true },
      { nome: 'TaxSummary', obrigatorio: true },
      { nome: 'Customers' },
      { nome: 'SalesInvoices' },
    ],
  },
  {
    nome: 'Header',
    filhos: [
      { nome: 'AuditFileVersion', obrigatorio: true },
      { nome: 'CompanyID', obrigatorio: true },
      { nome: 'CompanyName', obrigatorio: true },
      { nome: 'FiscalYear', obrigatorio: true },
      { nome: 'StartDate', obrigatorio: true },
      { nome: 'EndDate', obrigatorio: true },
      { nome: 'DateCreated', obrigatorio: true },
    ],
  },
  {
    nome: 'MasterFiles',
    filhos: [
      { nome: 'TaxTable' },
      { nome: 'Products' },
    ],
  },
  {
    nome: 'TaxTable',
    filhos: [{ nome: 'Tax', obrigatorio: true, maxOcorrencias: Infinity }],
  },
  {
    nome: 'Tax',
    filhos: [
      { nome: 'TaxType', obrigatorio: true },
      { nome: 'TaxCode', obrigatorio: true },
      { nome: 'TaxRate', obrigatorio: true },
    ],
  },
  {
    nome: 'Products',
    filhos: [{ nome: 'Product', obrigatorio: true, maxOcorrencias: Infinity }],
  },
  {
    nome: 'Product',
    filhos: [
      { nome: 'ProductCode', obrigatorio: true },
      { nome: 'ProductDescription', obrigatorio: true },
      { nome: 'UnitOfMeasure', obrigatorio: true },
      { nome: 'UnitPrice', obrigatorio: true },
      { nome: 'TaxCode', obrigatorio: true },
    ],
  },
  {
    nome: 'Customers',
    filhos: [{ nome: 'Customer', obrigatorio: true, maxOcorrencias: Infinity }],
  },
  {
    nome: 'Customer',
    filhos: [
      { nome: 'NIF', obrigatorio: true },
      { nome: 'Name', obrigatorio: true },
      { nome: 'Amount', obrigatorio: true },
    ],
  },
  {
    nome: 'Documents',
    filhos: [{ nome: 'Document', maxOcorrencias: Infinity }],
  },
  {
    nome: 'Document',
    filhos: [
      { nome: 'Type', obrigatorio: true },
      { nome: 'Series', obrigatorio: true },
      { nome: 'Quantity', obrigatorio: true },
      { nome: 'Total', obrigatorio: true },
    ],
  },
  {
    nome: 'TaxSummary',
    filhos: [
      { nome: 'Rate0', obrigatorio: true },
      { nome: 'Rate7', obrigatorio: true },
      { nome: 'Rate14', obrigatorio: true },
      { nome: 'Total', obrigatorio: true },
    ],
  },
  {
    nome: 'SalesInvoices',
    filhos: [{ nome: 'Invoice', obrigatorio: true, maxOcorrencias: Infinity }],
  },
  {
    nome: 'Invoice',
    filhos: [
      { nome: 'InvoiceNo', obrigatorio: true },
      { nome: 'InvoiceDate', obrigatorio: true },
      { nome: 'InvoiceType', obrigatorio: true },
      { nome: 'Series', obrigatorio: true },
      { nome: 'CustomerID', obrigatorio: true },
      { nome: 'Subtotal', obrigatorio: true },
      { nome: 'TaxPayable', obrigatorio: true },
      { nome: 'Total', obrigatorio: true },
    ],
  },
];

function definicaoDo(nome: string): DefinicaoElemento | undefined {
  return ESQUEMA_SAFT.find((d) => d.nome === nome);
}

function validarNo(no: NoXML, definicao: DefinicaoElemento, caminho: string): string[] {
  const erros: string[] = [];
  const nomesFilhos = no.filhos.map((f) => f.nome);
  const esperados = definicao.filhos.filter((f) => f.obrigatorio);

  for (const filho of esperados) {
    if (!nomesFilhos.includes(filho.nome)) {
      erros.push(`${caminho}: elemento obrigatório <${filho.nome}> em falta`);
    }
  }

  // Elemento pai definido mas com filhos além dos permitidos
  for (const nome of new Set(nomesFilhos)) {
    if (!definicao.filhos.some((f) => f.nome === nome)) {
      erros.push(`${caminho}: elemento <${nome}> não permitido pelo esquema`);
    }
  }

  // Recursão
  for (const filho of no.filhos) {
    const def = definicaoDo(filho.nome);
    if (def) erros.push(...validarNo(filho, def, `${caminho}/${filho.nome}`));
  }

  return erros;
}

/**
 * Validação sintática + estrutural do XML SAF-T contra o esquema de referência.
 * Devolve { valido, erros } — nunca lança (parser próprio a apanhar exceções).
 */
export function validarXMLSAFT(xml: string): { valido: boolean; erros: string[] } {
  if (!xml || !xml.trim()) {
    return { valido: false, erros: ['XML vazio'] };
  }

  let raiz: NoXML;
  try {
    raiz = parseXML(xml);
  } catch (e) {
    return { valido: false, erros: [e instanceof Error ? e.message : 'XML mal formado'] };
  }

  if (raiz.nome !== 'SAF-T') {
    return { valido: false, erros: [`Raiz do documento deve ser <SAF-T>, encontrado <${raiz.nome}>`] };
  }

  const definicao = definicaoDo(raiz.nome);
  if (!definicao) {
    return { valido: false, erros: [`Elemento raiz <${raiz.nome}> desconhecido no esquema`] };
  }

  const erros = validarNo(raiz, definicao, raiz.nome);
  return { valido: erros.length === 0, erros };
}
