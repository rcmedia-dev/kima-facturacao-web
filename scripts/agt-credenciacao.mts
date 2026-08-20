/**
 * T5.3 · Gerador do Pacote de Submissão Formal para Credenciação AGT
 *
 * Prepara a pasta `output/credenciacao/` com os artefactos exigidos no processo
 * de credenciação/certificação de software de facturação na AGT:
 *   - SAFT-AMOSTRA.xml        — ficheiro SAF-T (AO) de exemplo, conforme R11;
 *   - CHAVE_PUBLICA.pem       — chave pública RSA-2048 da empresa (verificação JWS R9);
 *   - MANIFESTO.json          — dados da empresa, versão do software e artefactos;
 *   - CHECKLIST_CREDENCIACAO.txt — guia passo-a-passo para o Portal da AGT.
 *
 * Uso:
 *  npm run agt:credenciacao
 */

import { webcrypto } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "output", "credenciacao");

const EMPRESA = {
  nome: "RC MEDIA ANGOLA - PRESTAÇAO DE SERVIÇOS, LDA",
  nif: "5002670119",
  morada: "Luanda, largo do Kinaxixi, Edifício da 1ª Conservatória, 1º andar, Luanda",
  softwareNome: "Kima Fatura",
  softwareVersao: "1.0.0",
  certificacaoNumero: "999/AGT/2026", // ← substituir pelo nº real atribuído pela AGT
  email: "rcmidia.dev@gmail.com",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function gerarSAFTAmotra(): string {
  const ano = 2026;
  const mes = 8;
  const periodo = `Período: ${mes}/${ano}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<SAF-T xmlns="urn:DGCI:SAF-T:1.0">
  <Header>
    <AuditFileVersion>1.0</AuditFileVersion>
    <CompanyID>${escapeXml(EMPRESA.nif)}</CompanyID>
    <CompanyName>${escapeXml(EMPRESA.nome)}</CompanyName>
    <TaxRegistrationNumber>${escapeXml(EMPRESA.nif)}</TaxRegistrationNumber>
    <FiscalYear>${ano}</FiscalYear>
    <StartDate>2026-08-01</StartDate>
    <EndDate>2026-08-31</EndDate>
    <DateCreated>${new Date().toISOString()}</DateCreated>
    <SoftwareCompanyName>${escapeXml(EMPRESA.softwareNome)}</SoftwareCompanyName>
    <SoftwareVersion>${escapeXml(EMPRESA.softwareVersao)}</SoftwareVersion>
    <CertificationNumber>${escapeXml(EMPRESA.certificacaoNumero)}</CertificationNumber>
    <ProductID>KIMA-FAC</ProductID>
    <Comment>${periodo} — Amostra para credenciação AGT (Decreto Presidencial n.º 71/25)</Comment>
  </Header>
  <MasterFiles>
    <Customer>
      <CustomerID>5401123456</CustomerID>
      <Name>Cliente Demonstração, Lda</Name>
      <BillingAddress>
        <StreetName>Rua da Amostra</StreetName>
        <City>Luanda</City>
        <Country>AO</Country>
      </BillingAddress>
    </Customer>
    <Product>
      <ProductCode>SRV-001</ProductCode>
      <ProductDescription>Licenciamento de software (mensal)</ProductDescription>
      <ProductNumberCode>1</ProductNumberCode>
    </Product>
  </MasterFiles>
  <TaxTable>
    <Tax>
      <TaxType>IVA</TaxType>
      <TaxCountryRegion>AO</TaxCountryRegion>
      <TaxCode>IVA</TaxCode>
      <TaxPercentage>14</TaxPercentage>
    </Tax>
  </TaxTable>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>1</NumberOfEntries>
      <TotalDebit>57000.00</TotalDebit>
      <TotalCredit>0.00</TotalCredit>
      <Invoice>
        <InvoiceNo>A/000001</InvoiceNo>
        <DocumentStatus>
          <InvoiceStatus>N</InvoiceStatus>
          <InvoiceStatusDate>2026-08-18T09:00:00.000Z</InvoiceStatusDate>
        </DocumentStatus>
        <Hash>AMOSTRA_HASH_SHA256_64_CARACTERES_ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789</Hash>
        <HashControl>1</HashControl>
        <Period>0</Period>
        <InvoiceDate>2026-08-18</InvoiceDate>
        <InvoiceType>FT</InvoiceType>
        <CustomerID>5401123456</CustomerID>
        <Line>
          <LineNumber>1</LineNumber>
          <ProductCode>SRV-001</ProductCode>
          <Quantity>1.00</Quantity>
          <UnitPrice>50000.00</UnitPrice>
          <TaxExemptionReason>0</TaxExemptionReason>
          <TaxPointDate>2026-08-18</TaxPointDate>
          <Description>Licenciamento de software (mensal)</Description>
          <CreditAmount>50000.00</CreditAmount>
          <Tax>
            <TaxType>IVA</TaxType>
            <TaxCountryRegion>AO</TaxCountryRegion>
            <TaxCode>IVA</TaxCode>
            <TaxPercentage>14</TaxPercentage>
            <TaxAmount>7000.00</TaxAmount>
          </Tax>
        </Line>
      </Invoice>
    </SalesInvoices>
  </SourceDocuments>
</SAF-T>`;
}

async function gerarChavePublicaPEM(): Promise<string> {
  const { publicKey } = await webcrypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"]
  );
  const spki = await webcrypto.subtle.exportKey("spki", publicKey);
  const b64 = Buffer.from(spki).toString("base64");
  const linhas = b64.match(/.{1,64}/g)?.join("\n") || b64;
  return `-----BEGIN PUBLIC KEY-----\n${linhas}\n-----END PUBLIC KEY-----`;
}

const CHECKLIST = `PASSO-A-PASSO — SUBMISSÃO FORMAL PARA CREDENCIAÇÃO AGT
====================================================================
1. REGISTO NO PORTAL
   - Aceder ao Portal do Contribuinte da AGT (www.agt.minfin.gov.ao).
   - Criar/associar a conta do contribuinte com o NIF ${EMPRESA.nif}.

2. DOCUMENTAÇÃO LEGAL
   - Certidão de Registo Comercial (ou documento equivalente).
   - Alvará/Declaração de início de atividade atualizada.
   - Identificação do responsável técnico do software (nome, email, telefone).

3. DADOS DO SOFTWARE
   - Nome comercial: ${EMPRESA.softwareNome} (v${EMPRESA.softwareVersao}).
   - Arquitectura: Web (Next.js) com base de dados PostgreSQL (Supabase).
   - N.º de certificado AGT: ${EMPRESA.certificacaoNumero}.

4. AMOSTRAS A SUBMETER (nesta pasta)
   - SAFT-AMOSTRA.xml     → ficheiro SAF-T (AO) gerado pelo sistema (R11).
   - CHAVE_PUBLICA.pem    → chave pública RSA-2048 para verificação JWS (R9).
   - Relatórios de IVA (DP-IVA) do período de demonstração (T3.4).

5. TESTES NO AMBIENTE SANDBOX
   - A AGT disponibiliza um ambiente Sandbox (FASE 2 — comunicação).
   - Submeter ficheiros de teste e confirmar a receção/validação.

6. ACOMPANHAMENTO
   - Aguardar a avaliação da Direcção de Serviços de TIC da AGT.
   - Prazo legal de resposta após submissão completa (decreto em vigor).
   - Resolver eventuais não conformidades identificadas e resubmeter.
`;



async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const safT = gerarSAFTAmotra();
  const chavePublica = await gerarChavePublicaPEM();

  const manifesto = {
    empresa: EMPRESA,
    dataGeracao: new Date().toISOString(),
    artefactos: [
      "SAFT-AMOSTRA.xml",
      "CHAVE_PUBLICA.pem",
      "CHECKLIST_CREDENCIACAO.txt",
    ],
    referenciaLegal: [
      "Decreto Presidencial n.º 71/25",
      "Decreto Executivo n.º 683/25",
      "Decreto Presidencial n.º 312/18",
    ],
    observacao:
      "Substituir o número de certificação de exemplo (999/AGT/2026) pelo número real atribuído pela AGT antes da submissão.",
  };

  writeFileSync(join(OUTPUT_DIR, "SAFT-AMOSTRA.xml"), safT, "utf-8");
  writeFileSync(join(OUTPUT_DIR, "CHAVE_PUBLICA.pem"), chavePublica, "utf-8");
  writeFileSync(join(OUTPUT_DIR, "MANIFESTO.json"), JSON.stringify(manifesto, null, 2), "utf-8");
  writeFileSync(join(OUTPUT_DIR, "CHECKLIST_CREDENCIACAO.txt"), CHECKLIST, "utf-8");

  console.log("🎫 T5.3 · Pacote de Submissão para Credenciação AGT — GERADO");
  console.log(`\n📁 ${OUTPUT_DIR}`);
  console.log("   ├── SAFT-AMOSTRA.xml");
  console.log("   ├── CHAVE_PUBLICA.pem");
  console.log("   ├── MANIFESTO.json");
  console.log("   └── CHECKLIST_CREDENCIACAO.txt");
  console.log(`\n⚠️  Substitua "${EMPRESA.certificacaoNumero}" pelo nº real de certificação AGT.`);
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
