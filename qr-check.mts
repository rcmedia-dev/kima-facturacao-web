import { gerarMatrizQR, tamanhoQR } from './lib/qrcode.ts';

function verificarFinder(matriz: boolean[][], r: number, c: number) {
  // finder 7x7: dark border, light ring, dark 3x3 center
  const esq = matriz[r][c];
  if (esq !== true) throw new Error('finder top-left corner must be dark');
  // center should be dark
  if (matriz[r + 3][c + 3] !== true) throw new Error('finder center must be dark');
  // ring between border and center should be light
  if (matriz[r + 1][c + 1] !== false) throw new Error('finder ring must be light');
}

// 1) Payload curto → versão 1 (21x21)
const m1 = gerarMatrizQR('AGT|500000000|Fatura|A|000001|A/000001|2026-08-18|100.00|14.00|114.00|HASH123');
const s1 = tamanhoQR(m1);
console.log('Tamanho curto:', s1);
if (s1 !== 21 && s1 !== 25 && s1 !== 29 && s1 % 4 !== 1) {
  throw new Error('Tamanho inválido para QR: ' + s1);
}
verificarFinder(m1, 0, 0);
verificarFinder(m1, 0, s1 - 7);
verificarFinder(m1, s1 - 7, 0);
// módulo escuro
if (m1[s1 - 8][8] !== true) throw new Error('dark module missing');

// 2) Determinismo
const m2 = gerarMatrizQR('AGT|500000000|Fatura|A|000001|A/000001|2026-08-18|100.00|14.00|114.00|HASH123');
if (JSON.stringify(m1) !== JSON.stringify(m2)) throw new Error('QR não é determinístico');

// 3) Payload mais longo → versão maior
const longPayload = Array.from({ length: 160 }, (_, i) => i % 10).join('');
const m3 = gerarMatrizQR(longPayload);
console.log('Tamanho longo:', tamanhoQR(m3));
if (tamanhoQR(m3) <= s1) throw new Error('Payload maior deveria gerar QR maior');

// 4) Timers: linha 6 e coluna 6, posições 8..size-9
const size = s1;
for (let i = 8; i < size - 8; i++) {
  if (m1[6][i] !== (i % 2 === 0)) throw new Error('timing row errado em ' + i);
  if (m1[i][6] !== (i % 2 === 0)) throw new Error('timing col errado em ' + i);
}

console.log('QR Code: todos os testes estruturais passaram ✓');
