/**
 * Gerador de QR Code (ISO/IEC 18004) — implementação nativa, sem dependências.
 *
 * Suporta Modo Byte (8-bit), nível de correção de erros M (médio), versões 1–10.
 * Devolve uma matriz booleana (true = módulo escuro) que pode ser renderizada
 * directamente no jsPDF (via rect) ou em HTML/CSS.
 *
 * Motivo da implementação nativa: o projeto não inclui biblioteca de QR Code e a
 * especificação AGT exige o QR Code regulamentar nas facturas (Art. 10º, DP 71/25),
 * pelo que um encoder próprio, determinístico e offline é a opção mais segura.
 */

// ── Aritmética de Galois GF(256), polinómio primitivo 0x11D ─────────────
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function inicializarGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP_TABLE[i] = EXP_TABLE[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

function gfPow(a: number, n: number): number {
  if (a === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] * n) % 255];
}

function gfPolyMul(p: number[], q: number[]): number[] {
  const r = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      r[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return r;
}

function gerarPolinomioGenerator(grau: number): number[] {
  let g = [1];
  for (let i = 0; i < grau; i++) {
    g = gfPolyMul(g, [1, gfPow(2, i)]);
  }
  return g;
}

/** Códigos de correção Reed-Solomon para um bloco de dados. */
function rsEncode(dados: number[], eccLen: number): number[] {
  const gen = gerarPolinomioGenerator(eccLen);
  const res = new Array(dados.length + eccLen).fill(0);
  dados.forEach((b, i) => (res[i] = b));
  for (let i = 0; i < dados.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return res.slice(dados.length);
}

// ── Estrutura de blocos (nível M) — versões 1 a 10 (ISO/IEC 18004) ──────
interface BlocoInfo {
  totalCodewords: number;
  dataCodewords: number;
  eccPerBloco: number;
  b1Count: number; // nº de blocos do grupo 1
  b1Data: number; // codewords de dados por bloco do grupo 1
  b2Count: number; // nº de blocos do grupo 2
  b2Data: number; // codewords de dados por bloco do grupo 2
}

const BLOCOS_NIVEL_M: Record<number, BlocoInfo> = {
  1: { totalCodewords: 26, dataCodewords: 16, eccPerBloco: 10, b1Count: 1, b1Data: 16, b2Count: 0, b2Data: 0 },
  2: { totalCodewords: 44, dataCodewords: 28, eccPerBloco: 16, b1Count: 1, b1Data: 28, b2Count: 0, b2Data: 0 },
  3: { totalCodewords: 70, dataCodewords: 44, eccPerBloco: 26, b1Count: 1, b1Data: 44, b2Count: 0, b2Data: 0 },
  4: { totalCodewords: 100, dataCodewords: 64, eccPerBloco: 18, b1Count: 2, b1Data: 32, b2Count: 0, b2Data: 0 },
  5: { totalCodewords: 134, dataCodewords: 86, eccPerBloco: 24, b1Count: 2, b1Data: 43, b2Count: 0, b2Data: 0 },
  6: { totalCodewords: 172, dataCodewords: 108, eccPerBloco: 16, b1Count: 4, b1Data: 27, b2Count: 0, b2Data: 0 },
  7: { totalCodewords: 196, dataCodewords: 124, eccPerBloco: 18, b1Count: 4, b1Data: 31, b2Count: 0, b2Data: 0 },
  8: { totalCodewords: 242, dataCodewords: 154, eccPerBloco: 22, b1Count: 2, b1Data: 38, b2Count: 2, b2Data: 39 },
  9: { totalCodewords: 292, dataCodewords: 182, eccPerBloco: 22, b1Count: 3, b1Data: 36, b2Count: 2, b2Data: 37 },
  10: { totalCodewords: 346, dataCodewords: 216, eccPerBloco: 26, b1Count: 4, b1Data: 43, b2Count: 1, b2Data: 44 },
};

const POSICOES_ALINHAMENTO: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

// ── Buffer de bits ───────────────────────────────────────────────────────
class BitBuffer {
  bits: number[] = [];

  put(valor: number, comprimento: number) {
    for (let i = comprimento - 1; i >= 0; i--) {
      this.bits.push((valor >> i) & 1);
    }
  }

  get lengthInBits() {
    return this.bits.length;
  }

  getByte(i: number): number {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (this.bits[i * 8 + j] || 0);
    return b;
  }
}

// ── Padrões funcionais ───────────────────────────────────────────────────
function desenharFinder(
  modulo: (boolean | null)[][],
  functionCells: boolean[][],
  linha: number,
  coluna: number
) {
  const size = modulo.length;
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = linha + r;
      const cc = coluna + c;
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
      const escuro =
        (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      modulo[rr][cc] = escuro;
      functionCells[rr][cc] = true;
    }
  }
}

function desenharAlinhamento(
  modulo: (boolean | null)[][],
  functionCells: boolean[][],
  linha: number,
  coluna: number
) {
  const size = modulo.length;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const rr = linha + r;
      const cc = coluna + c;
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
      modulo[rr][cc] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      functionCells[rr][cc] = true;
    }
  }
}

/** 15 bits de informação de formato (nível + máscara), com BCH e máscara 0x5412. */
function bitsFormato(nivelBits: number, mascara: number): number {
  const data = (nivelBits << 3) | mascara;
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

/** 18 bits de informação de versão (necessária na versão ≥ 7). */
function bitsVersao(versao: number): number {
  let rem = versao << 12;
  for (let i = 17; i >= 12; i--) {
    if ((rem >> i) & 1) rem ^= 0x1f25 << (i - 12);
  }
  return (versao << 12) | rem;
}

function colocarFormato(modulo: (boolean | null)[][], formato: number) {
  const size = modulo.length;
  for (let i = 0; i < 15; i++) {
    const bit = (formato >> i) & 1;
    // Cópia 1 — canto superior esquerdo
    let r: number;
    let c: number;
    if (i < 6) {
      r = 8;
      c = i;
    } else if (i < 8) {
      r = 8;
      c = i + 1; // salta a coluna 6 (timing)
    } else if (i === 8) {
      r = 7;
      c = 8;
    } else {
      r = 14 - i;
      c = 8;
    }
    modulo[r][c] = bit === 1;
    // Cópia 2 — superior direito e inferior esquerdo
    if (i < 8) {
      r = size - 1 - i;
      c = 8;
    } else {
      r = 8;
      c = size - 15 + i;
    }
    modulo[r][c] = bit === 1;
  }
  modulo[size - 8][8] = true; // módulo escuro
}

function colocarVersao(modulo: (boolean | null)[][], versao: number) {
  const bits = bitsVersao(versao);
  const size = modulo.length;
  for (let i = 0; i < 18; i++) {
    const bit = (bits >> i) & 1;
    const a = Math.floor(i / 3);
    const b = i % 3;
    modulo[size - 11 + b][a] = bit === 1; // canto inferior esquerdo
    modulo[a][size - 11 + b] = bit === 1; // canto superior direito
  }
}

function colocarDados(modulo: (boolean | null)[][], dados: number[]) {
  const size = modulo.length;
  let bitIndex = 0;
  let ascendente = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // salta a coluna do padrão de timing
    for (let i = 0; i < size; i++) {
      const linha = ascendente ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const coluna = col - c;
        if (modulo[linha][coluna] !== null) continue;
        let bit = false;
        if (bitIndex < dados.length * 8) {
          bit = ((dados[bitIndex >> 3] >> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex++;
        }
        modulo[linha][coluna] = bit;
      }
    }
    ascendente = !ascendente;
  }
  // Células sobrantes (bits de resto das versões 2–6) ficam claras
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modulo[r][c] === null) modulo[r][c] = false;
    }
  }
}

function aplicarMascara(
  modulo: (boolean | null)[][],
  functionCells: boolean[][],
  mascara: number
) {
  const size = modulo.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (functionCells[r][c]) continue;
      let inverter = false;
      switch (mascara) {
        case 0:
          inverter = (r + c) % 2 === 0;
          break;
        case 1:
          inverter = r % 2 === 0;
          break;
        case 2:
          inverter = c % 3 === 0;
          break;
        case 3:
          inverter = (r + c) % 3 === 0;
          break;
        case 4:
          inverter = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
          break;
        case 5:
          inverter = (r * c) % 2 + (r * c) % 3 === 0;
          break;
        case 6:
          inverter = ((r * c) % 2 + (r * c) % 3) % 2 === 0;
          break;
        case 7:
          inverter = ((r + c) % 2 + (r * c) % 3) % 2 === 0;
          break;
      }
      if (inverter) modulo[r][c] = !modulo[r][c];
    }
  }
}

function penalidade(modulo: boolean[][]): number {
  const size = modulo.length;
  let score = 0;

  // N1 — execuções de 5+ módulos da mesma cor
  const penalizarLinha = (linha: boolean[]) => {
    let run = 1;
    for (let i = 1; i < linha.length; i++) {
      if (linha[i] === linha[i - 1]) run++;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);
  };
  for (let r = 0; r < size; r++) penalizarLinha(modulo[r]);
  for (let c = 0; c < size; c++) {
    const col: boolean[] = [];
    for (let r = 0; r < size; r++) col.push(modulo[r][c]);
    penalizarLinha(col);
  }

  // N2 — blocos 2×2 da mesma cor
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modulo[r][c];
      if (v === modulo[r][c + 1] && v === modulo[r + 1][c] && v === modulo[r + 1][c + 1]) {
        score += 3;
      }
    }
  }

  // N3 — padrão 1:1:3:1:1 com 4 claros antes ou depois
  const ehPadrao = (seq: boolean[], pos: number) =>
    !seq[pos] &&
    seq[pos + 1] &&
    !seq[pos + 2] &&
    seq[pos + 3] &&
    seq[pos + 4] &&
    !seq[pos + 5] &&
    seq[pos + 6];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 7; c++) {
      if (ehPadrao(modulo[r], c)) {
        const antes = c >= 4 && !modulo[r][c - 1] && !modulo[r][c - 2] && !modulo[r][c - 3] && !modulo[r][c - 4];
        const depois =
          c + 10 < size && !modulo[r][c + 7] && !modulo[r][c + 8] && !modulo[r][c + 9] && !modulo[r][c + 10];
        if (antes || depois) score += 40;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 7; r++) {
      const seq: boolean[] = [];
      for (let i = 0; i < 7; i++) seq.push(modulo[r + i][c]);
      if (ehPadrao(seq, 0)) {
        const antes = r >= 4 && !modulo[r - 1][c] && !modulo[r - 2][c] && !modulo[r - 3][c] && !modulo[r - 4][c];
        const depois =
          r + 10 < size && !modulo[r + 7][c] && !modulo[r + 8][c] && !modulo[r + 9][c] && !modulo[r + 10][c];
        if (antes || depois) score += 40;
      }
    }
  }

  // N4 — proporção de módulos escuros
  let escuros = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (modulo[r][c]) escuros++;
  }
  const percentual = (escuros * 100) / (size * size);
  score += Math.floor(Math.abs(percentual - 50) / 5) * 10;

  return score;
}

function construirMatriz(versao: number, codewords: number[], mascara: number): boolean[][] {
  const size = versao * 4 + 17;
  const modulo: (boolean | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null));
  const functionCells: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  // Padrões de localização
  desenharFinder(modulo, functionCells, 0, 0);
  desenharFinder(modulo, functionCells, 0, size - 7);
  desenharFinder(modulo, functionCells, size - 7, 0);

  // Padrões de timing
  for (let i = 8; i < size - 8; i++) {
    modulo[6][i] = i % 2 === 0;
    functionCells[6][i] = true;
    modulo[i][6] = i % 2 === 0;
    functionCells[i][6] = true;
  }

  // Padrões de alinhamento
  const posicoes = POSICOES_ALINHAMENTO[versao];
  for (const r of posicoes) {
    for (const c of posicoes) {
      if (
        (r === 6 && c === 6) ||
        (r === 6 && c === size - 7) ||
        (r === size - 7 && c === 6)
      ) {
        continue; // sobrepõe-se ao finder
      }
      desenharAlinhamento(modulo, functionCells, r, c);
    }
  }

  // Informação de versão (v ≥ 7)
  if (versao >= 7) colocarVersao(modulo, versao);

  // Dados
  colocarDados(modulo, codewords);

  // Máscara
  aplicarMascara(modulo, functionCells, mascara);

  // Formato
  const nivelBits = 0; // 00 = nível M
  colocarFormato(modulo, bitsFormato(nivelBits, mascara));

  return modulo.map((linha) => linha.map((v) => v === true));
}

/**
 * Gera a matriz do QR Code para um texto.
 * @param texto Conteúdo a codificar (UTF-8, modo byte).
 * @returns Matriz `size × size` de booleanos (true = módulo escuro).
 * @throws Se o conteúdo exceder a capacidade máxima (≈213 bytes).
 */
export function gerarMatrizQR(texto: string): boolean[][] {
  if (!texto) throw new Error('Conteúdo do QR Code não pode estar vazio');

  const bytes = new TextEncoder().encode(texto);

  // Seleciona a versão mínima com capacidade suficiente (nível M)
  let versao = 0;
  for (let v = 1; v <= 10; v++) {
    // Overhead do modo byte: 4 bits de modo + indicador de comprimento (8 ou 16 bits) + terminator
    const capacidade = BLOCOS_NIVEL_M[v].dataCodewords - (v < 10 ? 2 : 3);
    if (bytes.length <= capacidade) {
      versao = v;
      break;
    }
  }
  if (!versao) {
    throw new Error(
      `Conteúdo demasiado longo para QR Code (máximo ≈213 bytes; recebidos ${bytes.length})`
    );
  }

  // 1) Codificação dos dados
  const buffer = new BitBuffer();
  buffer.put(4, 4); // Modo byte (0100)
  buffer.put(bytes.length, versao < 10 ? 8 : 16); // Indicador de comprimento
  bytes.forEach((b) => buffer.put(b, 8));

  const capacidadeBits = BLOCOS_NIVEL_M[versao].dataCodewords * 8;

  // Terminator (até 4 zeros)
  buffer.put(0, Math.min(4, capacidadeBits - buffer.lengthInBits));

  // Alinhamento ao byte
  while (buffer.lengthInBits % 8 !== 0) buffer.put(0, 1);

  // Bytes de preenchimento alternados (0xEC, 0x11)
  const pad = [0xec, 0x11];
  let pi = 0;
  while (buffer.lengthInBits < capacidadeBits) {
    buffer.put(pad[pi % 2], 8);
    pi++;
  }

  // 2) Blocos + Reed-Solomon + interleave
  const info = BLOCOS_NIVEL_M[versao];
  const dados = new Array<number>(info.dataCodewords);
  for (let i = 0; i < info.dataCodewords; i++) dados[i] = buffer.getByte(i);

  const blocos: number[][] = [];
  for (let i = 0; i < info.b1Count; i++) {
    blocos.push(dados.slice(i * info.b1Data, (i + 1) * info.b1Data));
  }
  const offset = info.b1Count * info.b1Data;
  for (let i = 0; i < info.b2Count; i++) {
    blocos.push(dados.slice(offset + i * info.b2Data, offset + (i + 1) * info.b2Data));
  }

  const eccBlocos = blocos.map((b) => rsEncode(b, info.eccPerBloco));

  const interleaved: number[] = [];
  const maxData = Math.max(...blocos.map((b) => b.length));
  for (let i = 0; i < maxData; i++) {
    for (const b of blocos) if (i < b.length) interleaved.push(b[i]);
  }
  const maxEcc = Math.max(...eccBlocos.map((b) => b.length));
  for (let i = 0; i < maxEcc; i++) {
    for (const b of eccBlocos) if (i < b.length) interleaved.push(b[i]);
  }

  // 3) Escolha da máscara com menor penalidade
  let melhor: { mascara: number; score: number; matriz: boolean[][] } | null = null;
  for (let mascara = 0; mascara < 8; mascara++) {
    const candidata = construirMatriz(versao, interleaved, mascara);
    const score = penalidade(candidata);
    if (!melhor || score < melhor.score) {
      melhor = { mascara, score, matriz: candidata };
    }
  }

  return melhor!.matriz;
}

/** Devolve o tamanho (em módulos) do QR Code gerado. */
export function tamanhoQR(matriz: boolean[][]): number {
  return matriz.length;
}