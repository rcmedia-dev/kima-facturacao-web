/**
 * 🧪 TESTE COMPLETO — Todas as Fases do Núcleo AGT num Só Comando
 *
 *  Executa, em sequência:
 *   1. `npm run test:agt`                → T5.1 (integridade) + T5.2 (auditoria R1–R15/F1–F7)
 *   2. `npm run agt:credenciacao`        → T5.3 (pacote de submissão para credenciação)
 *
 *  E depois verifica os artefactos gerados:
 *   - output/fase5/relatorio-fase5.json   (relatório da suíte)
 *   - output/credenciacao/SAFT-AMOSTRA.xml (Fase 3 — SAF-T exemplo)
 *   - output/credenciacao/CHAVE_PUBLICA.pem (Fase 1 — chave RSA para JWS)
 *   - output/credenciacao/MANIFESTO.json   (Fase 5.3)
 *
 *  Uso:
 *   npm run test:tudo
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function rodarComando(rotulo: string, comando: string): void {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`▶ ${rotulo}`);
  console.log(`$ ${comando}`);
  console.log(`${"=".repeat(72)}`);
  execSync(comando, { cwd: ROOT, stdio: "inherit" });
}

function verificarFicheiro(nome: string, descricao: string): boolean {
  const caminho = join(ROOT, nome);
  if (!existsSync(caminho)) {
    console.log(`  ❌ ${descricao} — ficheiro AUSENTE: ${nome}`);
    return false;
  }
  const tam = statSync(caminho).size;
  if (tam === 0) {
    console.log(`  ❌ ${descricao} — ficheiro VAZIO: ${nome}`);
    return false;
  }
  console.log(`  ✅ ${descricao} — ${nome} (${tam} bytes)`);
  return true;
}

function main() {
  const passos: { fase: string; caminho: string; descricao: string }[] = [
    { fase: "Fase 1/5", caminho: "output/fase5/relatorio-fase5.json", descricao: "Relatório de integridade + auditoria" },
    { fase: "Fase 3",   caminho: "output/credenciacao/SAFT-AMOSTRA.xml", descricao: "SAF-T (AO) de exemplo" },
    { fase: "Fase 1",   caminho: "output/credenciacao/CHAVE_PUBLICA.pem", descricao: "Chave pública RSA para JWS" },
    { fase: "Fase 5.3", caminho: "output/credenciacao/MANIFESTO.json", descricao: "Manifesto da submissão" },
    { fase: "Fase 5.3", caminho: "output/credenciacao/CHECKLIST_CREDENCIACAO.txt", descricao: "Checklist do processo" },
  ];

  console.log("🧪 TESTE COMPLETO DE TODAS AS FASES DO NÚCLEO AGT\n");

  // 1) Suíte de integridade + auditoria
  rodarComando("T5.1/T5.2 · Suíte de Integridade + Auditoria AGT", "npm run test:agt");

  // 2) Pacote de credenciação (T5.3)
  rodarComando("T5.3 · Geração do Pacote de Submissão para Credenciação", "npm run agt:credenciacao");

  // 2) Verificação dos artefactos
  console.log(`\n${"=".repeat(72)}`);
  console.log("🔍 VERIFICAÇÃO DE ARTEFACTOS GERADOS");
  console.log(`${"=".repeat(72)}`);

  let ok = true;
  for (const p of passos) {
    if (!verificarFicheiro(p.caminho, `${p.fase} — ${p.descricao}`)) ok = false;
  }

  // 3) Leitura do score da auditoria
  try {
    const relPath = join(ROOT, "output/fase5/relatorio-fase5.json");
    if (existsSync(relPath)) {
      const rel = JSON.parse(readFileSync(relPath, "utf-8"));
      const auditoriaDemo = rel?.demo?.auditoria;
      if (auditoriaDemo) {
        console.log(`\n📊 Score da auditoria AGT: ${auditoriaDemo.score}%`);
        console.log(`   Obrigatórios conformes: ${auditoriaDemo.obrigatoriosConformes}/${auditoriaDemo.obrigatoriosTotais}`);
        console.log(`   Funcionais conformes:   ${auditoriaDemo.funcionaisConformes}/${auditoriaDemo.funcionaisTotais}`);
        if (auditoriaDemo.obrigatoriosConformes < auditoriaDemo.obrigatoriosTotais) {
          console.log("   ⚠️  Requisito(s) obrigatório(s) ainda não conforme(s):");
          for (const r of auditoriaDemo.resultados ?? []) {
            if (r.estado !== "✅ Conforme" && r.categoria === "Obrigatório") {
              console.log(`       • ${r.codigo} ${r.nome} — ${r.detalhe}`);
            }
          }
        }
      }
    }
  } catch {
    // ficheiro ainda não existia nesta execução — sem problema
  }

  console.log(`\n${ok ? "✅ TESTE COMPLETO — TUDO OK" : "❌ TESTE COMPLETO — HÁ FALHAS (ver acima)"}`);
  process.exit(ok ? 0 : 1);
}

main();