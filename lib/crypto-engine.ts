/**
 * Motor Criptográfico — FASE 1 · Segurança, Criptografia & Imutabilidade (AGT)
 *
 * Corresponde às tarefas T1.1, T1.2 e T1.3 do Cronograma de Certificação AGT:
 *  - T1.1 · Hash Encadeado SHA-256 (R12/R13) — cada documento inclui o hash
 *          do documento anterior da mesma série (chaining → imutabilidade).
 *  - T1.2 · Assinatura Digital JWS (R9) — assinatura RS256 (RSA PKCS#1 v1.5
 *          + SHA-256) do conteúdo fiscal com a chave privada da empresa.
 *  - T1.3 · QR Code Regulamentar (R8) — construção do payload de validação
 *          (NIF, data, totais, IVA, hash, certificação) para o QR impresso.
 *
 * Funciona no servidor (Node.js) e no browser (Web Crypto API).
 */

import { construirConteudoHash, formatarHash } from './fiscal-hash';
import { SOFTWARE_NOME, SOFTWARE_CERTIFICACAO_AGT } from './constants';

// ─── Utilidades base64url / PEM ─────────────────────────────────────────────

function bytesParaBase64(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function base64ParaBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64UrlEncodeString(texto: string): string {
  return bytesParaBase64(new TextEncoder().encode(texto))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlEncodeBuffer(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return bytesParaBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(texto: string): string {
  const b64 =
    texto.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (texto.length % 4)) % 4);
  return new TextDecoder().decode(base64ParaBytes(b64));
}

function base64UrlDecodeBuffer(texto: string): ArrayBuffer {
  const b64 =
    texto.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (texto.length % 4)) % 4);
  return base64ParaBytes(b64).buffer as ArrayBuffer;
}

function pemParaBuffer(pem: string, tipo: 'PRIVATE KEY' | 'PUBLIC KEY'): ArrayBuffer {
  const b64 = pem
    .replace(new RegExp(`-----BEGIN ${tipo}-----`, 'g'), '')
    .replace(new RegExp(`-----END ${tipo}-----`, 'g'), '')
    .replace(/\s+/g, '');
  return base64ParaBytes(b64).buffer as ArrayBuffer;
}

function bufferParaPem(buffer: ArrayBuffer, tipo: 'PRIVATE KEY' | 'PUBLIC KEY'): string {
  const b64 = base64UrlEncodeBuffer(new Uint8Array(buffer))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const linhas = b64.match(/.{1,64}/g)?.join('\n') || b64;
  return `-----BEGIN ${tipo}-----\n${linhas}\n-----END ${tipo}-----`;
}

// ─── T1.1 · Hash Encadeado SHA-256 ──────────────────────────────────────────

async function sha256Hex(texto: string): Promise<string> {
  const data = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(buffer));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ConteudoHashEncadeado {
  tipo: string;
  serie: string;
  numero: string | number;
  numeroCompleto: string;
  dataEmissao: Date | string;
  clienteNif?: string;
  fornecedorNif?: string;
  subtotal: number;
  totalIVA: number;
  total: number;
  formaPagamento?: string;
  linhas: { descricao: string; quantidade: number; preco: number; taxaIVA: number; total: number }[];
}

/**
 * Conteúdo canónico do hash com o hash anterior da série (chaining).
 * Formato: `[conteúdo fiscal do documento]#HASH_ANTERIOR#[hash anterior ou vazio]`
 */
export function construirConteudoHashEncadeado(
  dados: ConteudoHashEncadeado,
  hashAnterior?: string | null
): string {
  const conteudoFiscal = construirConteudoHash({
    tipo: dados.tipo,
    serie: dados.serie,
    numero: String(dados.numero),
    numeroCompleto: dados.numeroCompleto,
    dataEmissao: dados.dataEmissao,
    clienteNif: dados.clienteNif,
    fornecedorNif: dados.fornecedorNif,
    subtotal: dados.subtotal,
    totalIVA: dados.totalIVA,
    total: dados.total,
    formaPagamento: dados.formaPagamento,
    linhas: dados.linhas,
  });
  return `${conteudoFiscal}#HASH_ANTERIOR#${(hashAnterior || '').toUpperCase()}`;
}

/**
 * Gera o hash encadeado (SHA-256) do documento, incluindo o hash do documento
 * anterior da mesma série. Emitir sem `hashAnterior` (primeiro documento) usa
 * a cadeia vazia, mantendo compatibilidade com o hash fiscal simples.
 */
export async function gerarHashEncadeado(
  dados: ConteudoHashEncadeado,
  hashAnterior?: string | null
): Promise<{ hash: string; hashAnterior: string | null }> {
  const conteudo = construirConteudoHashEncadeado(dados, hashAnterior);
  const hex = await sha256Hex(conteudo);
  return {
    hash: hex.toUpperCase(),
    hashAnterior: hashAnterior || null,
  };
}

export { formatarHash };

// ─── T1.2 · Assinatura Digital JWS (RS256) ──────────────────────────────────

const JWS_ALG = 'RS256';

/** Par de chaves RSA-2048 (PKCS#8/SPKI, PEM) para assinatura dos documentos. */
export async function gerarParDeChavesRSA(): Promise<{
  privateKeyPEM: string;
  publicKeyPEM: string;
}> {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );

  const pub = await crypto.subtle.exportKey('spki', publicKey);
  const priv = await crypto.subtle.exportKey('pkcs8', privateKey);

  return {
    privateKeyPEM: bufferParaPem(priv, 'PRIVATE KEY'),
    publicKeyPEM: bufferParaPem(pub, 'PUBLIC KEY'),
  };
}

async function importarChavePrivada(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    pemParaBuffer(pem, 'PRIVATE KEY'),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function importarChavePublica(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    pemParaBuffer(pem, 'PUBLIC KEY'),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

export interface PayloadAssinaturaJWS {
  hash: string; // Hash encadeado (SHA-256) do documento
  hashAnterior?: string | null;
  numeroCompleto: string;
  dataEmissao: Date | string;
  nifEmpresa: string;
  software?: string;
}

/**
 * Assina o conteúdo fiscal do documento (JWS compacto, alg RS256).
 * Formato: `header.payload.assinatura` (base64url).
 */
export async function assinarDocumentoJWS(
  payload: PayloadAssinaturaJWS,
  chavePrivadaPEM: string
): Promise<string> {
  const header = { alg: JWS_ALG, typ: 'JWS' };
  const corpo = {
    hash: payload.hash,
    hash_anterior: payload.hashAnterior || '',
    documento: payload.numeroCompleto,
    emitido_em:
      typeof payload.dataEmissao === 'string' ? payload.dataEmissao : payload.dataEmissao.toISOString(),
    nif: payload.nifEmpresa,
    software: payload.software || SOFTWARE_NOME,
  };

  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(corpo));
  const input = `${headerB64}.${payloadB64}`;

  const privateKey = await importarChavePrivada(chavePrivadaPEM);
  const assinatura = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(input)
  );

  return `${input}.${base64UrlEncodeBuffer(assinatura)}`;
}

/** Verifica a assinatura JWS com a chave pública da empresa. */
export async function verificarAssinaturaJWS(
  jws: string,
  chavePublicaPEM: string
): Promise<boolean> {
  const partes = jws.split('.');
  if (partes.length !== 3) return false;

  const [headerB64, payloadB64, assinaturaB64] = partes;
  if (!headerB64 || !payloadB64 || !assinaturaB64) return false;

  try {
    const publicKey = await importarChavePublica(chavePublicaPEM);
    return await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      publicKey,
      base64UrlDecodeBuffer(assinaturaB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );
  } catch {
    return false;
  }
}

/** Descodifica o payload de uma JWS (JSON). */
export function descodificarPayloadJWS<T = Record<string, unknown>>(jws: string): T | null {
  const partes = jws.split('.');
  if (partes.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(partes[1])) as T;
  } catch {
    return null;
  }
}

/** Resumo legível da assinatura para impressão no PDF (nunca expõe a chave). */
export function resumoAssinaturaJWS(jws: string): string {
  const partes = jws.split('.');
  const sig = partes[2] || '';
  if (sig.length <= 12) return sig;
  return `${sig.slice(0, 10)}…${sig.slice(-6)}`;
}

// ─── T1.3 · QR Code Regulamentar AGT ────────────────────────────────────────

export interface DadosPayloadQR {
  tipo: string;
  serie: string;
  numero: string | number;
  numeroCompleto: string;
  dataEmissao: Date | string;
  nifEmpresa: string;
  nifCliente?: string;
  subtotal: number;
  totalIVA: number;
  total: number;
  hash: string;
  numeroCertificacao?: string;
  formaPagamento?: string;
}

function normalizarValor(v: number): string {
  const n = isNaN(v) ? 0 : v;
  return n.toFixed(2);
}

/**
 * Payload do QR Code regulamentar (Art. 10º — DP 71/25).
 *
 * Formato (separador `|`, prefixo `AGT`):
 * `AGT|NIF_EMPRESA|TIPO|SERIE|NUMERO|NUMERO_COMPLETO|DATA_ISO|SUBTOTAL|IVA|TOTAL|HASH|CERTIFICACAO|NIF_CLIENTE|FORMA_PAGAMENTO`
 *
 * Nota: o layout oficial de validação AGT deve ser confirmado no Portal do
 * Software Certificado (https://agt.minfin.gov.ao) durante a credenciação;
 * este formato cobre todos os campos de rastreabilidade exigidos pelo Decreto.
 */
export function construirPayloadQR(dados: DadosPayloadQR): string {
  const data =
    typeof dados.dataEmissao === 'string'
      ? dados.dataEmissao
      : dados.dataEmissao.toISOString();

  return [
    'AGT',
    dados.nifEmpresa || '',
    dados.tipo || '',
    dados.serie || '',
    String(dados.numero ?? ''),
    dados.numeroCompleto || '',
    data,
    normalizarValor(dados.subtotal),
    normalizarValor(dados.totalIVA),
    normalizarValor(dados.total),
    (dados.hash || '').toUpperCase(),
    dados.numeroCertificacao || '',
    dados.nifCliente || '',
    dados.formaPagamento || '',
  ].join('|');
}

/** Constrói o payload de um documento a partir da fatura, para reutilização no PDF. */
export function construirPayloadQRDeFatura(
  fatura: {
    tipo: string;
    serie: string;
    numero: string | number;
    numeroCompleto?: string;
    dataEmissao: Date | string;
    hash?: string;
    hashAnterior?: string | null;
    subtotal: number;
    totalIVA: number;
    total: number;
    formaPagamento?: string;
  },
  empresa: { nif: string; softwareCertificacaoNumero?: string | null },
  clienteNif?: string
): string {
  return construirPayloadQR({
    tipo: fatura.tipo,
    serie: fatura.serie,
    numero: fatura.numero,
    numeroCompleto:
      fatura.numeroCompleto || `${fatura.serie}/${String(fatura.numero).padStart(6, '0')}`,
    dataEmissao: fatura.dataEmissao,
    nifEmpresa: empresa.nif,
    nifCliente: clienteNif,
    subtotal: fatura.subtotal,
    totalIVA: fatura.totalIVA,
    total: fatura.total,
    hash: fatura.hash || '',
    numeroCertificacao: empresa.softwareCertificacaoNumero || SOFTWARE_CERTIFICACAO_AGT,
    formaPagamento: fatura.formaPagamento,
  });
}