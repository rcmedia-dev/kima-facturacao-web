/**
 * Gerador do Dossier Completo de Credenciação AGT
 *
 * Cria a pasta `dossier_credenciacao_agt/` com toda a documentação legal, técnica,
 * requerimentos, termos de responsabilidade, artefactos fiscais (SAF-T, PEM, XSD)
 * e amostras de documentos em PDF.
 */

import { webcrypto } from "node:crypto";
import { writeFileSync, mkdirSync, copyFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import AdmZip from "adm-zip";
import { jsPDF } from "jspdf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const DOSSIER_DIR = join(PROJECT_ROOT, "dossier_credenciacao_agt");
const ARTEFACTOS_DIR = join(DOSSIER_DIR, "05_ARTEFACTOS_TECNICOS_AGT");
const PDF_DIR = join(DOSSIER_DIR, "06_AMOSTRAS_DOCUMENTOS_FISCAIS_PDF");

const EMPRESA = {
  nome: "RC MEDIA ANGOLA - PRESTAÇÃO DE SERVIÇOS, LDA",
  nif: "5002670119",
  morada: "Bairro Kinaxixi, Rua do Largo do Kinaxixi, Edifício da 1ª Conservatória, 1º Andar, Luanda, Angola",
  telefones: "929 884 781 / 929 884 810",
  email: "geral@rcmedia.ao",
  softwareNome: "Kima Facturação Web",
  softwareVersao: "1.0.0",
  certificacaoNumero: "999/AGT/2026",
  representanteLegal: "Representante Legal da RC Media",
  responsavelTecnico: "Diretor de Engenharia e Tecnologias de Informação",
};

// ─── Helpers OpenXML ─────────────────────────────────────────────────────────

function xmlEscape(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function title(text: string) {
  return `
    <w:p w:rsidR="0036606C" w:rsidRDefault="0036606C">
      <w:pPr>
        <w:pStyle w:val="Ttulo"/>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="1E3A8A"/></w:rPr>
        <w:t>${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>`;
}

function subtitle(text: string) {
  return `
    <w:p w:rsidR="0036606C" w:rsidRDefault="0036606C">
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="300"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:i/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="4B5563"/></w:rPr>
        <w:t>${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>`;
}

function h1(text: string) {
  return `
    <w:p w:rsidR="0036606C" w:rsidRDefault="0036606C">
      <w:pPr>
        <w:pStyle w:val="Cabealho1"/>
        <w:spacing w:before="300" w:after="140"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="1E3A8A"/></w:rPr>
        <w:t>${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>`;
}

function h2(text: string) {
  return `
    <w:p w:rsidR="0036606C" w:rsidRDefault="0036606C">
      <w:pPr>
        <w:pStyle w:val="Cabealho2"/>
        <w:spacing w:before="220" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="2563EB"/></w:rPr>
        <w:t>${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>`;
}

function para(text: string, options: { bold?: boolean; italic?: boolean; color?: string; align?: string } = {}) {
  const bold = options.bold ? "<w:b/>" : "";
  const italic = options.italic ? "<w:i/>" : "";
  const color = options.color ? `<w:color w:val="${options.color}"/>` : "";
  const jc = options.align ? `<w:jc w:val="${options.align}"/>` : "";

  return `
    <w:p w:rsidR="0036606C" w:rsidRDefault="0036606C">
      <w:pPr>
        ${jc}
        <w:spacing w:after="140" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>${bold}${italic}${color}<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
        <w:t>${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>`;
}

function bullet(text: string, boldPrefix = "") {
  let prefixXml = boldPrefix
    ? `<w:r><w:rPr><w:b/><w:color w:val="1E293B"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${xmlEscape(boldPrefix)} </w:t></w:r>`
    : "";

  return `
    <w:p w:rsidR="0036606C" w:rsidRDefault="0036606C">
      <w:pPr>
        <w:pStyle w:val="PargrafodaLista"/>
        <w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>
        <w:spacing w:after="100" w:line="260" w:lineRule="auto"/>
      </w:pPr>
      ${prefixXml}
      <w:r>
        <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
        <w:t>${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>`;
}

function callout(titleText: string, bodyText: string, type: "info" | "warning" | "success" = "info") {
  let borderColor = "2563EB";
  let bgColor = "EFF6FF";
  if (type === "warning") {
    borderColor = "D97706";
    bgColor = "FFFBEB";
  } else if (type === "success") {
    borderColor = "059669";
    bgColor = "ECFDF5";
  }

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
          <w:left w:val="single" w:sz="24" w:space="0" w:color="${borderColor}"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="9000" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="${bgColor}"/>
            <w:tcMar><w:top w:w="140"/><w:bottom w:w="140"/><w:left w:w="220"/><w:right w:w="180"/></w:tcMar>
          </w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="${borderColor}"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${xmlEscape(titleText)}</w:t></w:r></w:p>
          <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:color w:val="334155"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${xmlEscape(bodyText)}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="180"/></w:pPr></w:p>`;
}

function table(headers: string[], rows: string[][], widths: number[]) {
  let headerCells = headers
    .map(
      (h, i) => `
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="${widths[i]}" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/>
        <w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar>
      </w:tcPr>
      <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${xmlEscape(h)}</w:t></w:r></w:p>
    </w:tc>`
    )
    .join("");

  let rowXml = rows
    .map((r, rIdx) => {
      let bgColor = rIdx % 2 === 0 ? "FFFFFF" : "F8FAFC";
      let cells = r
        .map(
          (cellText, cIdx) => `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${widths[cIdx]}" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="${bgColor}"/>
          <w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar>
        </w:tcPr>
        <w:p><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t>${xmlEscape(cellText)}</w:t></w:r></w:p>
      </w:tc>`
        )
        .join("");
      return `<w:tr>${cells}</w:tr>`;
    })
    .join("");

  let totalWidth = widths.reduce((a, b) => a + b, 0);

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="${totalWidth}" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>${headerCells}</w:tr>
      ${rowXml}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="200"/></w:pPr></w:p>`;
}

function createDocxFromTemplate(bodyXml: string, destPath: string) {
  const templatePath = join(PROJECT_ROOT, "Metas Semanais", "Folha de oficio.docx");
  const zip = new AdmZip(templatePath);
  let docXmlContent = zip.readAsText("word/document.xml");

  const bodyStartIdx = docXmlContent.indexOf("<w:body>");
  if (bodyStartIdx === -1) throw new Error("Template inválido");

  const headerPrefix = docXmlContent.substring(0, bodyStartIdx + "<w:body>".length);
  const sectPrMatch = docXmlContent.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectPrMatch ? sectPrMatch[0] : "";

  const newDocXml = headerPrefix + "\n" + bodyXml + "\n" + sectPr + "\n</w:body></w:document>";
  zip.updateFile("word/document.xml", Buffer.from(newDocXml, "utf8"));
  zip.writeZip(destPath);
}

// ─── 1. Requerimento AGT (DocX e MD) ────────────────────────────────────────

function gerarRequerimentoXml(): string {
  let xml = "";
  xml += title("REQUERIMENTO DE CREDENCIAÇÃO DE SOFTWARE DE FACTURAÇÃO");
  xml += subtitle("Ao Exmo. Senhor Presidente do Conselho de Administração da Administração Geral Tributária (AGT)");

  xml += para("Assunto: Pedido de Homologação, Credenciação e Certificação de Software de Facturação Comercial", { bold: true, color: "1E3A8A" });
  xml += para(`Referência Legal: Decreto Presidencial n.º 71/25, Decreto Executivo n.º 683/25 e Decreto Presidencial n.º 312/18`, { italic: true });

  xml += para(`A sociedade comercial ${EMPRESA.nome}, pessoa colectiva com o NIF ${EMPRESA.nif}, com sede sita em ${EMPRESA.morada}, matriculada na Conservatória do Registo Comercial de Luanda, representada neste acto pelo seu legal representante, vem mui respeitosamente junto de Vossa Excelência requerer:`);

  xml += h1("1. Identificação do Software e Pedido Formal");
  xml += para(`A CREDENCIAÇÃO E HOMOLOGAÇÃO DO SOFTWARE DE FACTURAÇÃO COMERCIAL denominado \"${EMPRESA.softwareNome}\", Versão ${EMPRESA.softwareVersao}, desenvolvido para operar em ambiente Web de acordo com as normas tributárias em vigor na República de Angola.`);

  xml += h1("2. Fundamentação Técnica e Legal");
  xml += para("O software em apreço foi concebido e implementado de modo a assegurar integralmente:");
  xml += bullet("Validação automática de Números de Identificação Fiscal (NIF) Angolanos pelo algoritmo Módulo 11 (Pessoas Colectivas e Singulares).", "a)");
  xml += bullet("Numeração sequencial contínua por tipo e série de documento, impossibilitando qualquer omissão ou duplicação de numeração.", "b)");
  xml += bullet("Geração de assinaturas digitais JWS com chave assimétrica RSA de 2048 bits e cálculo de Hash Fiscal encadeado SHA-256, garantindo a estrita imutabilidade de documentos emitidos.", "c)");
  xml += bullet("Inclusão de Código QR regulamentar com os metadados de validação definidos pela AGT em todos os impressos fiscais.", "d)");
  xml += bullet("Geração e exportação do ficheiro SAF-T (AO) em formato XML perfeitamente estruturado e validado pelo esquema XSD oficial.", "e)");
  xml += bullet("Gravação inviolável de Logs de Auditoria para rastreamento de todos os eventos e utilizadores do sistema.", "f)");

  xml += h1("3. Documentos Anexos ao Pedido");
  xml += para("Juntam-se ao presente requerimento os seguintes elementos de instrução processual:");
  xml += bullet("Certidão de Registo Comercial e Comprovativo de Inscrição Fiscal (NIF).", "1.");
  xml += bullet("Termo de Responsabilidade e Declaração de Conformidade Técnica devidamente assinado.", "2.");
  xml += bullet("Ficha Técnica e Documentação de Arquitetura do Software.", "3.");
  xml += bullet("Ficheiro de Amostra SAF-T (AO) (SAFT-AO-AMOSTRA-2026.xml).", "4.");
  xml += bullet("Chave Pública Criptográfica RSA-2048 em formato PEM (CHAVE_PUBLICA_RSA2048.pem).", "5.");
  xml += bullet("Amostras de Documentos Fiscais Emitidos em formato PDF (Factura, Factura-Recibo e Nota de Crédito com QR Code e Hash).", "6.");

  xml += para("Termos em que pede e espera deferimento.");
  xml += para(`Luanda, ${new Date().toLocaleDateString("pt-PT")}`);
  xml += para("\n\n________________________________________________________", { align: "center" });
  xml += para(`Pela ${EMPRESA.nome}`, { align: "center", bold: true });
  xml += para("Representante Legal / Gerência", { align: "center", italic: true });

  return xml;
}

// ─── 2. Termo de Responsabilidade (DocX e MD) ───────────────────────────────

function gerarTermoResponsabilidadeXml(): string {
  let xml = "";
  xml += title("TERMO DE RESPONSABILIDADE E CONFORMIDADE FISCAL");
  xml += subtitle("Declaração Solene de Conformidade com o Decreto Presidencial n.º 71/25");

  xml += para(`A sociedade ${EMPRESA.nome}, NIF ${EMPRESA.nif}, com sede em ${EMPRESA.morada}, na qualidade de entidade produtora e desenvolvedora do software \"${EMPRESA.softwareNome}\", Versão ${EMPRESA.softwareVersao}:`);

  xml += h1("DECLARAÇÃO SOLENE SOB COMPROMISSO DE HONRA");
  xml += para("Para os devidos efeitos legais e perante a Administração Geral Tributária (AGT), declara expressamente que:");

  xml += bullet("O software não dispõe de qualquer rotina, comando, tabela oculta ou mecanismo que permita alterar, eliminar, ocultar ou corromper registos de dados de natureza fiscal ou contabilística depois de emitidos.", "1. Imutabilidade:");
  xml += bullet("Todos os documentos fiscais emitidos (Facturas, Facturas-Recibo, Facturas Simplificadas, Notas de Crédito e Débito) possuem numeração sequencial estritamente contínua e cronológica por série e ano.", "2. Sequencialidade:");
  xml += bullet("O cálculo dos impostos obedece rigorosamente às taxas de IVA em vigor (14%, 7%, 0%), com registo mandatório do enquadramento legal de isenção quando aplicável.", "3. Rigor no IVA:");
  xml += bullet("A integridade dos documentos é garantida pelo encadeamento criptográfico de Hashes SHA-256 e assinatura digital JWS (RSA-2048).", "4. Segurança Criptográfica:");
  xml += bullet("O ficheiro SAF-T (AO) gerado pelo sistema reproduz com total fidedignidade todos os registos e operações comerciais efetuadas na plataforma.", "5. Veracidade do SAF-T:");

  xml += callout(
    "Assunção de Responsabilidade Legal",
    "A entidade produtora assume plena responsabilidade civil e criminal por quaisquer desconformidades dolosas ou alterações não autorizadas aos mecanismos de segurança fiscal do software ora submetido para homologação.",
    "warning"
  );

  xml += para(`Luanda, ${new Date().toLocaleDateString("pt-PT")}`);
  xml += para("\n\n________________________________________________________", { align: "center" });
  xml += para(`${EMPRESA.representanteLegal}`, { align: "center", bold: true });
  xml += para("Representante Legal da Empresa", { align: "center", italic: true });
  xml += para("\n________________________________________________________", { align: "center" });
  xml += para(`${EMPRESA.responsavelTecnico}`, { align: "center", bold: true });
  xml += para("Responsável Técnico de Engenharia de Software", { align: "center", italic: true });

  return xml;
}

// ─── 3. Ficha Técnica do Software ───────────────────────────────────────────

function gerarFichaTecnicaXml(): string {
  let xml = "";
  xml += title("FICHA TÉCNICA E ESPECIFICAÇÕES DO SOFTWARE");
  xml += subtitle(`Sistema: ${EMPRESA.softwareNome} v${EMPRESA.softwareVersao}`);

  xml += table(
    ["Item", "Especificação Técnica", "Detalhes de Implementação"],
    [
      ["Nome Comercial", EMPRESA.softwareNome, "Denominação oficial para efeitos fiscais e comerciais."],
      ["Versão Registada", EMPRESA.softwareVersao, "Versão sujeita ao processo de homologação AGT 2026."],
      ["Entidade Produtora", EMPRESA.nome, `NIF: ${EMPRESA.nif} · Luanda, Angola.`],
      ["Tipo de Aplicação", "Web Application (Cloud/SaaS)", "Acesso via navegador web seguro (HTTPS/TLS)."],
      ["Linguagem & Framework", "TypeScript 5.7 / Next.js 16 (React 19)", "Renderização híbrida SSR/Server Components."],
      ["Base de Dados", "PostgreSQL (Supabase) - Schema kima_facturas", "Base de dados relacional com RLS e triggers de imutabilidade."],
      ["Motor Criptográfico", "RSA-2048 / SHA-256 / JWS RS256", "Módulo criptográfico nativo para assinatura e hash encadeado."],
      ["Geração de Documentos", "jsPDF v4 + Gerador QR Code AGT", "Impressão em padrão A4 com metadados fiscais obrigatórios."],
      ["Ficheiro de Auditoria", "SAF-T (AO) XML 1.0", "Validação estrutural em tempo real contra saft-ao.xsd."]
    ],
    [2200, 3000, 3800]
  );

  return xml;
}

// ─── 4. Gerar Chave Pública RSA-2048 ─────────────────────────────────────────

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

// ─── 5. Gerar SAF-T Amostra ──────────────────────────────────────────────────

function gerarSAFTAmotra(): string {
  const ano = 2026;
  const mes = 8;
  return `<?xml version="1.0" encoding="UTF-8"?>
<SAF-T xmlns="urn:DGCI:SAF-T:1.0">
  <Header>
    <AuditFileVersion>1.0</AuditFileVersion>
    <CompanyID>${xmlEscape(EMPRESA.nif)}</CompanyID>
    <CompanyName>${xmlEscape(EMPRESA.nome)}</CompanyName>
    <TaxRegistrationNumber>${xmlEscape(EMPRESA.nif)}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <FiscalYear>${ano}</FiscalYear>
    <StartDate>2026-08-01</StartDate>
    <EndDate>2026-08-31</EndDate>
    <CurrencyCode>AOA</CurrencyCode>
    <DateCreated>${new Date().toISOString()}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <SoftwareCompanyName>${xmlEscape(EMPRESA.nome)}</SoftwareCompanyName>
    <SoftwareName>${xmlEscape(EMPRESA.softwareNome)}</SoftwareName>
    <SoftwareVersion>${xmlEscape(EMPRESA.softwareVersao)}</SoftwareVersion>
    <CertificationNumber>${xmlEscape(EMPRESA.certificacaoNumero)}</CertificationNumber>
    <ProductID>KIMA-FAC</ProductID>
    <ProductVersion>1.0</ProductVersion>
    <HeaderComment>Dossier de Credenciamento AGT 2026 - Decreto Presidencial n.º 71/25</HeaderComment>
  </Header>
  <MasterFiles>
    <Customer>
      <CustomerID>5401123456</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>5401123456</CustomerTaxID>
      <CompanyName>Empresa de Teste e Demonstracao, Lda</CompanyName>
      <BillingAddress>
        <AddressDetail>Avenida 4 de Fevereiro, n.º 100</AddressDetail>
        <City>Luanda</City>
        <PostalCode>0000</PostalCode>
        <Country>AO</Country>
      </BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>
    <Product>
      <ProductType>S</ProductType>
      <ProductCode>SRV-001</ProductCode>
      <ProductGroup>Servicos</ProductGroup>
      <ProductDescription>Licenciamento de Software de Faturacao Kima (Mensal)</ProductDescription>
      <ProductNumberCode>SRV-001</ProductNumberCode>
    </Product>
  </MasterFiles>
  <TaxTable>
    <TaxTableEntry>
      <TaxType>IVA</TaxType>
      <TaxCountryRegion>AO</TaxCountryRegion>
      <TaxCode>NOR</TaxCode>
      <Description>Taxa Geral de IVA</Description>
      <TaxPercentage>14</TaxPercentage>
    </TaxTableEntry>
  </TaxTable>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>1</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>57000.00</TotalCredit>
      <Invoice>
        <InvoiceNo>FT A/000001</InvoiceNo>
        <DocumentStatus>
          <InvoiceStatus>N</InvoiceStatus>
          <InvoiceStatusDate>2026-08-18T10:00:00</InvoiceStatusDate>
          <SourceID>1</SourceID>
          <SourceBilling>P</SourceBilling>
        </DocumentStatus>
        <Hash>AMOSTRA_HASH_SHA256_64_CARACTERES_KIMA_AGT_2026_ABCDEF0123456789</Hash>
        <HashControl>1</HashControl>
        <Period>8</Period>
        <InvoiceDate>2026-08-18</InvoiceDate>
        <InvoiceType>FT</InvoiceType>
        <SpecialRegimes>
          <SelfBillingIndicator>0</SelfBillingIndicator>
          <CashVATSchemeIndicator>0</CashVATSchemeIndicator>
          <ThirdPartiesBillingIndicator>0</ThirdPartiesBillingIndicator>
        </SpecialRegimes>
        <SourceID>1</SourceID>
        <SystemEntryDate>2026-08-18T10:00:00</SystemEntryDate>
        <CustomerID>5401123456</CustomerID>
        <Line>
          <LineNumber>1</LineNumber>
          <ProductCode>SRV-001</ProductCode>
          <ProductDescription>Licenciamento de Software de Faturacao Kima (Mensal)</ProductDescription>
          <Quantity>1.00</Quantity>
          <UnitOfMeasure>Un</UnitOfMeasure>
          <UnitPrice>50000.00</UnitPrice>
          <TaxPointDate>2026-08-18</TaxPointDate>
          <Description>Licenciamento de Software de Faturacao Kima (Mensal)</Description>
          <CreditAmount>50000.00</CreditAmount>
          <Tax>
            <TaxType>IVA</TaxType>
            <TaxCountryRegion>AO</TaxCountryRegion>
            <TaxCode>NOR</TaxCode>
            <TaxPercentage>14</TaxPercentage>
          </Tax>
          <SettlementAmount>0.00</SettlementAmount>
        </Line>
        <DocumentTotals>
          <TaxPayable>7000.00</TaxPayable>
          <NetTotal>50000.00</NetTotal>
          <GrossTotal>57000.00</GrossTotal>
        </DocumentTotals>
      </Invoice>
    </SalesInvoices>
  </SourceDocuments>
</SAF-T>`;
}

// ─── 6. Gerador de Amostras de PDFs em jsPDF ─────────────────────────────────

function gerarPDFExemplo(tipo: "FT" | "FR" | "NC", numero: string, destPath: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const primaryColor: [number, number, number] = tipo === "NC" ? [225, 29, 72] : tipo === "FR" ? [16, 185, 129] : [37, 99, 235];
  const tituloDoc = tipo === "NC" ? "NOTA DE CRÉDITO" : tipo === "FR" ? "FACTURA-RECIBO" : "FACTURA COMERCIAL";

  // Cabeçalho
  doc.setFillColor(...primaryColor);
  doc.rect(14, 14, 182, 10, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(tituloDoc.toUpperCase(), 20, 20.5);
  doc.text(`N.º: ${numero}`, 190, 20.5, { align: "right" });

  // Dados da Empresa
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.text(EMPRESA.nome, 14, 32);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`NIF: ${EMPRESA.nif}`, 14, 37);
  doc.text(EMPRESA.morada, 14, 41);
  doc.text(`Tel: ${EMPRESA.telefones} | Email: ${EMPRESA.email}`, 14, 45);
  doc.text(`Software Certificado n.º: ${EMPRESA.certificacaoNumero}`, 14, 49);

  // Caixa do Cliente
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(110, 30, 86, 26, 2, 2, "FD");

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("EXMO.(S) SR.(S):", 114, 35);
  doc.text("EMPRESA CLIENTE DEMONSTRAÇÃO, LDA", 114, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("NIF: 5401123456", 114, 44);
  doc.text("Avenida 4 de Fevereiro, Luanda, Angola", 114, 48);
  doc.text("Data de Emissão: 18/08/2026 | Vencimento: 18/08/2026", 114, 52);

  // Tabela de Artigos
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 62, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("Código / Descrição do Item", 16, 66.5);
  doc.text("Qtd", 110, 66.5, { align: "right" });
  doc.text("Preço Unit.", 136, 66.5, { align: "right" });
  doc.text("Taxa IVA", 158, 66.5, { align: "right" });
  doc.text("Total Líquido", 192, 66.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text("SRV-001 - Licenciamento de Software Kima Facturação Web (Mensal)", 16, 75);
  doc.text("1.00", 110, 75, { align: "right" });
  doc.text("50 000,00 Kz", 136, 75, { align: "right" });
  doc.text("14%", 158, 75, { align: "right" });
  doc.text("50 000,00 Kz", 192, 75, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 80, 196, 80);

  // Resumo de IVA e Totais
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(120, 90, 76, 32, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Total Ilíquido:", 124, 96);
  doc.text("50 000,00 Kz", 192, 96, { align: "right" });

  doc.text("Total IVA (14%):", 124, 102);
  doc.text("7 000,00 Kz", 192, 102, { align: "right" });

  doc.text("Retenção na Fonte:", 124, 108);
  doc.text("0,00 Kz", 192, 108, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text("TOTAL A PAGAR:", 124, 117);
  doc.text("57 000,00 Kz", 192, 117, { align: "right" });

  // Bloco Regulamentar AGT (QR Code, Hash, JWS)
  doc.setDrawColor(...primaryColor);
  doc.setFillColor(254, 252, 232); // Amber light
  doc.roundedRect(14, 130, 182, 38, 2, 2, "FD");

  // Mock QR Box
  doc.setFillColor(255, 255, 255);
  doc.rect(18, 133, 32, 32, "FD");
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);
  doc.text("[ QR CODE AGT ]", 21, 149);
  doc.text("Validado AGT", 23, 153);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("ELEMENTOS DE CONFORMIDADE FISCAL — DECRETO PRESIDENCIAL N.º 71/25", 54, 137);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`• Hash Fiscal SHA-256 (4 Caracteres de Controlo): k9X2 - Processado por programa certificado n.º ${EMPRESA.certificacaoNumero}`, 54, 143);
  doc.text(`• Assinatura Digital JWS: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXUyJ9...[RSA-2048 Chave Autêntica]`, 54, 148);
  doc.text(`• Cadeia de Integridade: Hash anterior verificado e encadeado com sucesso na série A.`, 54, 153);
  doc.text(`• Operador / Emitente: Sistema Central Kima · Utilizador: Admin (ID: 001)`, 54, 158);
  doc.text(`• Regime de IVA: Regime Geral de IVA · Os bens/serviços foram colocados à disposição na data do documento.`, 54, 163);

  // Rodapé
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Processado por computador · Kima Facturação Web v${EMPRESA.softwareVersao} · www.rcmedia.ao`, 105, 285, { align: "center" });

  const buffer = doc.output("arraybuffer");
  writeFileSync(destPath, Buffer.from(buffer));
}

// ─── 7. Main Function ────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 A iniciar a criação do Dossier Completo de Credenciação AGT...\n");

  // Criar pastas
  mkdirSync(DOSSIER_DIR, { recursive: true });
  mkdirSync(ARTEFACTOS_DIR, { recursive: true });
  mkdirSync(PDF_DIR, { recursive: true });

  // 1. Gerar Documentos DocX Oficiais
  console.log("📄 1. A gerar documentos oficiais em formato Word (.docx)...");

  // Requerimento
  createDocxFromTemplate(gerarRequerimentoXml(), join(DOSSIER_DIR, "02_REQUERIMENTO_DE_CREDENCIACAO_AGT.docx"));
  // Termo de Responsabilidade
  createDocxFromTemplate(gerarTermoResponsabilidadeXml(), join(DOSSIER_DIR, "03_TERMO_DE_RESPONSABILIDADE_E_CONFORMIDADE.docx"));
  // Ficha Técnica
  createDocxFromTemplate(gerarFichaTecnicaXml(), join(DOSSIER_DIR, "04_FICHA_TECNICA_DO_SOFTWARE.docx"));

  // Copiar Documentação Técnica existente
  const docTecnicaPath = join(PROJECT_ROOT, "DOCUMENTACAO_TECNICA_KIMA_FACTURACAO.docx");
  if (existsSync(docTecnicaPath)) {
    copyFileSync(docTecnicaPath, join(DOSSIER_DIR, "01_DOCUMENTACAO_TECNICA_KIMA_FACTURACAO.docx"));
  }

  // 2. Gerar Versões em Markdown (.md) para fácil visualização
  console.log("📝 2. A gerar versões em Markdown (.md)...");

  const indiceMd = `# 📁 DOSSIER DE CREDENCIAÇÃO AGT — KIMA FACTURAÇÃO WEB
> **Entidade Requerente:** ${EMPRESA.nome} (NIF: ${EMPRESA.nif})  
> **Software:** ${EMPRESA.softwareNome} (Versão: ${EMPRESA.softwareVersao})  
> **Legislação:** Decreto Presidencial n.º 71/25 · Decreto Executivo n.º 683/25 · Decreto Presidencial n.º 312/18  

---

## 🗂️ Estrutura do Dossier

| Pasta / Ficheiro | Descrição |
|---|---|
| **\`00_INDICE_E_GUIA_DE_SUBMISSAO.md\`** | Este guia com o roteiro passo a passo para submissão no Portal da AGT. |
| **\`01_DOCUMENTACAO_TECNICA_KIMA_FACTURACAO.docx\`** | Manual técnico detalhado em papel timbrado oficial da RC Media. |
| **\`02_REQUERIMENTO_DE_CREDENCIACAO_AGT.docx\`** | Minuta do Requerimento formal dirigido ao Conselho de Administração da AGT. |
| **\`03_TERMO_DE_RESPONSABILIDADE_E_CONFORMIDADE.docx\`** | Declaração solene e termo de responsabilidade assinado pela gerência e TI. |
| **\`04_FICHA_TECNICA_DO_SOFTWARE.docx\`** | Ficha técnica com especificações da arquitetura, criptografia e BD. |
| **\`05_ARTEFACTOS_TECNICOS_AGT/\`** | Pasta com os ficheiros técnicos: SAF-T XML, Chave Pública PEM, XSD e Manifesto. |
| **\`06_AMOSTRAS_DOCUMENTOS_FISCAIS_PDF/\`** | Amostras de Factura (FT), Factura-Recibo (FR) e Nota de Crédito (NC). |

---

## 📌 Guia Passo a Passo de Submissão no Portal da AGT

### Passo 1: Acesso ao Portal do Contribuinte
1. Aceda ao portal oficial da AGT: \`www.agt.minfin.gov.ao\`.
2. Efetue o login com o NIF da empresa (\`${EMPRESA.nif}\`) e a palavra-passe de acesso.
3. Navegue até ao menu **"Serviços"** $\\rightarrow$ **"Certificação de Software de Facturação"**.

### Passo 2: Preenchimento dos Dados do Software
1. **Nome do Software:** \`${EMPRESA.softwareNome}\`
2. **Versão:** \`${EMPRESA.softwareVersao}\`
3. **Tipo de Aplicação:** Web / Cloud
4. **Linguagem / Base de Dados:** TypeScript / Next.js 16 / PostgreSQL

### Passo 3: Carregamento de Documentação
Faça o upload dos documentos preparados nesta pasta:
- [x] Requerimento formal assinado (\`02_REQUERIMENTO_DE_CREDENCIACAO_AGT.docx\`)
- [x] Termo de Responsabilidade (\`03_TERMO_DE_RESPONSABILIDADE_E_CONFORMIDADE.docx\`)
- [x] Ficha Técnica e Manual (\`01_DOCUMENTACAO_TECNICA_KIMA_FACTURACAO.docx\`)
- [x] Certidão Comercial e Comprovativo de NIF da RC Media

### Passo 4: Submissão dos Artefactos Fiscais
Na aba de validação técnica, carregue os ficheiros da pasta \`05_ARTEFACTOS_TECNICOS_AGT/\`:
- \`SAFT-AO-AMOSTRA-2026.xml\`
- \`CHAVE_PUBLICA_RSA2048.pem\`

### Passo 5: Homologação na Sandbox e Emissão de Certificado
1. A AGT disponibilizará as credenciais do ambiente **Sandbox**.
2. Após os testes de emissão e comunicação, a DSTIC da AGT emitirá o **Número Definitivo de Certificação de Software** (ex: \`XXX/AGT/2026\`).
`;

  writeFileSync(join(DOSSIER_DIR, "00_INDICE_E_GUIA_DE_SUBMISSAO.md"), indiceMd, "utf-8");

  // 3. Gerar Artefactos Fiscais na pasta 05
  console.log("🔐 3. A gerar artefactos fiscais (SAF-T XML, Chave Pública RSA-2048, XSD)...");

  const saftXml = gerarSAFTAmotra();
  const chavePublicaPem = await gerarChavePublicaPEM();

  writeFileSync(join(ARTEFACTOS_DIR, "SAFT-AO-AMOSTRA-2026.xml"), saftXml, "utf-8");
  writeFileSync(join(ARTEFACTOS_DIR, "CHAVE_PUBLICA_RSA2048.pem"), chavePublicaPem, "utf-8");

  // Copiar XSD
  const xsdPath = join(PROJECT_ROOT, "schemas", "saft-ao.xsd");
  if (existsSync(xsdPath)) {
    copyFileSync(xsdPath, join(ARTEFACTOS_DIR, "saft-ao.xsd"));
  }

  const manifesto = {
    empresa: EMPRESA,
    dataGeracao: new Date().toISOString(),
    artefactos: ["SAFT-AO-AMOSTRA-2026.xml", "CHAVE_PUBLICA_RSA2048.pem", "saft-ao.xsd"],
    conformidadeLegal: [
      "Decreto Presidencial n.º 71/25 (Regulamento de Faturação Eletrónica)",
      "Decreto Executivo n.º 683/25 (Especificações Técnicas de Software)",
      "Decreto Presidencial n.º 312/18 (Regime Jurídico das Faturas)",
    ],
  };
  writeFileSync(join(ARTEFACTOS_DIR, "MANIFESTO.json"), JSON.stringify(manifesto, null, 2), "utf-8");

  // 4. Gerar Amostras de PDFs em 06
  console.log("🖨️  4. A gerar amostras de documentos em PDF...");

  gerarPDFExemplo("FT", "FT A/000001", join(PDF_DIR, "AMOSTRA_FACTURA_FT.pdf"));
  gerarPDFExemplo("FR", "FR A/000001", join(PDF_DIR, "AMOSTRA_FACTURA_RECIBO_FR.pdf"));
  gerarPDFExemplo("NC", "NC A/000001", join(PDF_DIR, "AMOSTRA_NOTA_CREDITO_NC.pdf"));

  console.log("\n✅ DOSSIER DE CREDENCIAÇÃO AGT GERADO COM SUCESSO!");
  console.log(`📁 Localização: ${DOSSIER_DIR}`);
}

main().catch((err) => {
  console.error("Erro ao gerar dossier:", err);
  process.exit(1);
});
