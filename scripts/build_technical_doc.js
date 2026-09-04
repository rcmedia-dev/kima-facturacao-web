const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const projectRoot = process.cwd();

// Helper to escape XML special characters
function xmlEscape(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helpers for OpenXML tags
function title(text) {
  return `
    <w:p w:rsidR="0036606C" w:rsidRDefault="0036606C">
      <w:pPr>
        <w:pStyle w:val="Ttulo"/>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/><w:color w:val="1E3A8A"/></w:rPr>
        <w:t>${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>`;
}

function subtitle(text) {
  return `
    <w:p w:rsidR="0036606C" w:rsidRDefault="0036606C">
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="360"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:i/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="4B5563"/></w:rPr>
        <w:t>${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>`;
}

function metaBlock(items) {
  let rowsXml = items.map(item => `
    <w:tr>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="3000" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
          <w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="180"/><w:right w:w="180"/></w:tcMar>
        </w:tcPr>
        <w:p><w:r><w:rPr><w:b/><w:color w:val="1E293B"/></w:rPr><w:t>${xmlEscape(item.label)}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="6000" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/>
          <w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="180"/><w:right w:w="180"/></w:tcMar>
        </w:tcPr>
        <w:p><w:r><w:t>${xmlEscape(item.val)}</w:t></w:r></w:p>
      </w:tc>
    </w:tr>`).join('');

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="none"/>
          <w:left w:val="none"/>
          <w:right w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      ${rowsXml}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>`;
}

function h1(text) {
  return `
    <w:p w:rsidR="0036606C" w:rsidRDefault="0036606C">
      <w:pPr>
        <w:pStyle w:val="Cabealho1"/>
        <w:spacing w:before="360" w:after="160"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/><w:color w:val="1E3A8A"/></w:rPr>
        <w:t>${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>`;
}

function h2(text) {
  return `
    <w:p w:rsidR="0036606C" w:rsidRDefault="0036606C">
      <w:pPr>
        <w:pStyle w:val="Cabealho2"/>
        <w:spacing w:before="240" w:after="120"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="2563EB"/></w:rPr>
        <w:t>${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>`;
}

function h3(text) {
  return `
    <w:p w:rsidR="0036606C" w:rsidRDefault="0036606C">
      <w:pPr>
        <w:pStyle w:val="Cabealho3"/>
        <w:spacing w:before="180" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="0F766E"/></w:rPr>
        <w:t>${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>`;
}

function para(text, options = {}) {
  const bold = options.bold ? '<w:b/>' : '';
  const italic = options.italic ? '<w:i/>' : '';
  const color = options.color ? `<w:color w:val="${options.color}"/>` : '';
  
  return `
    <w:p w:rsidR="0036606C" w:rsidRDefault="0036606C">
      <w:pPr>
        <w:spacing w:after="140" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>${bold}${italic}${color}<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
        <w:t>${xmlEscape(text)}</w:t>
      </w:r>
    </w:p>`;
}

function bullet(text, boldPrefix = '') {
  let prefixXml = boldPrefix ? `<w:r><w:rPr><w:b/><w:color w:val="1E293B"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${xmlEscape(boldPrefix)} </w:t></w:r>` : '';
  
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

function callout(titleText, bodyText, type = 'info') {
  let borderColor = '2563EB'; // Blue
  let bgColor = 'EFF6FF';
  
  if (type === 'warning') {
    borderColor = 'D97706'; // Amber
    bgColor = 'FFFBEB';
  } else if (type === 'success') {
    borderColor = '059669'; // Green
    bgColor = 'ECFDF5';
  }

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:bottom w:val="none"/>
          <w:left w:val="single" w:sz="24" w:space="0" w:color="${borderColor}"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="9000" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="${bgColor}"/>
            <w:tcMar><w:top w:w="160"/><w:bottom w:w="160"/><w:left w:w="240"/><w:right w:w="200"/></w:tcMar>
          </w:tcPr>
          <w:p>
            <w:r><w:rPr><w:b/><w:color w:val="${borderColor}"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${xmlEscape(titleText)}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r><w:rPr><w:color w:val="334155"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${xmlEscape(bodyText)}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="200"/></w:pPr></w:p>`;
}

function table(headers, rows, widths) {
  let headerCells = headers.map((h, i) => `
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="${widths[i]}" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/>
        <w:tcMar><w:top w:w="140"/><w:bottom w:w="140"/><w:left w:w="140"/><w:right w:w="140"/></w:tcMar>
      </w:tcPr>
      <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${xmlEscape(h)}</w:t></w:r></w:p>
    </w:tc>`).join('');

  let rowXml = rows.map((r, rIdx) => {
    let bgColor = (rIdx % 2 === 0) ? 'FFFFFF' : 'F8FAFC';
    let cells = r.map((cellText, cIdx) => `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${widths[cIdx]}" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="${bgColor}"/>
          <w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="140"/><w:right w:w="140"/></w:tcMar>
        </w:tcPr>
        <w:p><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t>${xmlEscape(cellText)}</w:t></w:r></w:p>
      </w:tc>`).join('');
    return `<w:tr>${cells}</w:tr>`;
  }).join('');

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
    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>`;
}

// Assemble Document Body
function generateDocumentXmlBody() {
  let xml = '';

  // Title & Metadata
  xml += title('DOCUMENTAÇÃO TÉCNICA DO SISTEMA DE FACTURAÇÃO KIMA WEB');
  xml += subtitle('Especificações da Arquitetura, Tecnologias, Módulos Comerciais e Núcleo Criptográfico AGT');
  
  xml += metaBlock([
    { label: 'Nome do Sistema:', val: 'Kima Facturação Web (Kima Financeiro)' },
    { label: 'Entidade / Emissor:', val: 'RC MEDIA ANGOLA – PRESTAÇÃO DE SERVIÇOS, LDA' },
    { label: 'Legislação Base (Angola):', val: 'Decreto Presidencial n.º 71/25, Decreto Executivo n.º 683/25, Decreto Presidencial n.º 312/18' },
    { label: 'Moeda Padrão:', val: 'Kwanza Angolano (AOA / Kz)' },
    { label: 'Versão do Documento:', val: '1.0 (Versão de Produção & Certificação AGT)' },
    { label: 'Data de Emissão:', val: 'Agosto de 2026' }
  ]);

  // Section 1: Introduction
  xml += h1('1. Introdução e Visão Geral do Sistema');
  xml += para('O Kima Facturação Web é uma solução tecnológica avançada de gestão comercial e faturação eletrónica, desenvolvida especificamente para atender às exigências operacionais e fiscais de empresas a operar na República de Angola. O sistema foi concebido para cobrir integralmente desde micro e pequenas empresas até médias e grandes corporações, garantindo agilidade na emissão de documentos comerciais, rigoroso controlo financeiro e total conformidade com a legislação tributária angolana.');

  xml += callout(
    'Enquadramento Legal e Fiscal em Angola (AGT)',
    'O sistema responde rigorosamente às diretrizes da Administração Geral Tributária (AGT) no âmbito da transição para a faturação eletrónica e certificação de software fiscal (Decreto Presidencial n.º 71/25 e normativos complementares). O Kima Facturação Web integra mecanismos nativos de imutabilidade, criptografia assimétrica, assinaturas digitais JWS, geração de código QR e exportação normalizada do ficheiro SAF-T (AO).',
    'info'
  );

  xml += para('Principais Objetivos Operacionais:');
  xml += bullet('Simplificação do fluxo de faturação através de um assistente (wizard) intuitivo em 3 passos.', 'Fluxo Operacional:');
  xml += bullet('Emissão de múltiplos tipos de documentos comerciais (Facturas, Facturas-Recibo, Facturas Simplificadas, Notas de Crédito, Notas de Débito, Orçamentos e Guias de Remessa).', 'Tipos de Documentos:');
  xml += bullet('Aplicação automatizada das alíquotas de IVA em vigor em Angola (14% Taxa Geral, 7% Taxa Reduzida, 0% Isento) com associação dos respetivos códigos e motivos de isenção fiscal.', 'Regime Fiscal IVA:');
  xml += bullet('Criptografia avançada RSA-SHA256, garantindo imutabilidade de faturas já emitidas e encadeamento fiscal de hashes.', 'Segurança & Auditoria:');
  xml += bullet('Geração instantânea de PDFs profissionais e relatórios de fecho de caixa, balancete de IVA e declarações periódicas.', 'Relatórios & PDF:');

  // Section 2: Architecture & Tech Stack
  xml += h1('2. Arquitetura Tecnológica e Stack de Desenvolvimento');
  xml += para('A arquitetura do Kima Facturação Web foi projetada seguindo os princípios de modularidade, escalabilidade, segurança e elevada performance reativa. O ecossistema combina as tecnologias mais modernas do desenvolvimento web contemporâneo:');

  xml += table(
    ['Camada da Arquitetura', 'Tecnologia Utilizada', 'Versão / Especificação', 'Papel no Sistema'],
    [
      ['Frontend / App Router', 'Next.js (React 19)', 'v16.3.0', 'Renderização Server-Side (SSR) e Client-Side otimizada, rotas dinâmicas e Server Actions.'],
      ['Linguagem Base', 'TypeScript', 'v5.7.3', 'Tipagem estática estrita ponta a ponta, prevenção de erros e contratos de dados seguros.'],
      ['Estilização & UI', 'Tailwind CSS + Shadcn/ui', 'v4.3.3 / Base UI', 'Interface responsiva moderna, acessível, componentes com temas dinâmicos e de alto desempenho.'],
      ['Gestão de Estado Global', 'Zustand', 'v5.0.14', 'Armazenamento reativo leve com suporte a persistência e reidratação de estado.'],
      ['Formulários e Validação', 'React Hook Form + Zod', 'v7.84 / v4.4', 'Validação rigorosa de esquemas de dados em tempo real (ex: formato de NIF, IVA e totais).'],
      ['Base de Dados / ORM', 'Supabase (PostgreSQL) + Drizzle', 'Drizzle ORM v0.45', 'Banco de dados relacional (schema kima_facturas) com controlo de migrações e auditoria.'],
      ['Motor Criptográfico', 'Node.js Crypto Engine', 'Native Crypto Module', 'Geração de pares de chaves RSA 2048-bit, hash SHA-256 encadeado e assinaturas JWS.'],
      ['Geração de Documentos PDF', 'jsPDF', 'v4.2.1', 'Geração dinâmica de documentos PDF no browser/servidor com layouts profissionais e QR Code.'],
      ['Exportação & Validação Fiscal', 'SAF-T (AO) Exporter + XSD', 'Esquema AGT 2026', 'Geração de XML SAF-T (AO) e validação automática por esquema XSD antes do envio.']
    ],
    [2200, 2400, 1600, 2800]
  );

  xml += h2('2.1 Detalhes das Camadas de Software');
  xml += para('1. Frontend & Renderização Server Components: O uso do Next.js 16 com a App Router permite que páginas pesadas de listagem e processamento sejam compiladas no servidor, reduzindo o tempo de carregamento no cliente final. O Tailwind CSS v4 garante uma experiência uniforme em dispositivos móveis e desktops.');
  xml += para('2. Persistência Híbrida (Supabase PostgreSQL + LocalStorage): O sistema suporta sincronização em nuvem via Supabase PostgreSQL (schema kima_facturas) com tolerância a falhas através de reidratação local em localStorage para operação offline temporária.');
  xml += para('3. Motor Criptográfico de Assinatura Digital: Integrado diretamente nas APIs do servidor Node.js/Next.js, este módulo é responsável por calcular o Hash Fiscal imutável e gerar a assinatura JWS antes da gravação final do documento no banco de dados.');

  // Section 3: Core Features & Functional Modules
  xml += h1('3. Módulos Funcionais e Recursos do Sistema');
  xml += para('O Kima Facturação Web está estruturado em vários módulos integrados que cobrem todo o fluxo operacional de uma empresa.');

  xml += h2('3.1 Dashboard Inteligente e Métricas KPI');
  xml += para('O Dashboard oferece uma visão panorâmica instantânea da saúde financeira da empresa em tempo real, incluindo:');
  xml += bullet('Total Faturado no mês e no ano comercial (em Kz).', 'Métricas Financeiras:');
  xml += bullet('Total de Faturas Pendentes de pagamento com alertas de vencimento.', 'Controlo de Cobrança:');
  xml += bullet('Número total de clientes registados e volume de transações.', 'Volume Comercial:');
  xml += bullet('Tabela com as últimas faturas emitidas e acesso rápido ao download de PDF.', 'Histórico Recente:');

  xml += h2('3.2 Gestão de Clientes e Validação de NIF Angolano');
  xml += para('O módulo de clientes permite gerir a base de dados de compradores com validação automática de dados fiscais:');
  xml += bullet('Módulo 11 para NIFs de Pessoas Coletivas (iniciados por 500...) e Pessoas Singulares / Bilhete de Identidade (BI). Impede a emissão de faturas com NIFs inválidos.', 'Validação de NIF:');
  xml += bullet('Nome/Razão Social, NIF, Endereço Fiscal, Telefone, E-mail e Tipo de Contribuinte.', 'Campos Suportados:');
  xml += bullet('Pesquisa em tempo real por NIF ou Razão Social com filtros de estado.', 'Pesquisa Avançada:');

  xml += h2('3.3 Gestão de Catálogo de Artigos, Serviços e IVA');
  xml += para('O cadastro de produtos e serviços suporta toda a parametrização fiscal exigida em Angola:');
  xml += table(
    ['Taxa de IVA', 'Aplicação Principal', 'Motivo de Isenção / Base Legal', 'Exemplo de Uso'],
    [
      ['14% (Taxa Geral)', 'Regime Geral de IVA', 'Não aplicável (Taxável)', 'Venda de bens de consumo, prestação de serviços gerais.'],
      ['7% (Taxa Reduzida)', 'Regime Simplificado / Bens Essenciais', 'Não aplicável (Taxável)', 'Produtos da cesta básica, insumos agrícolas, PME simplificadas.'],
      ['0% (Isento)', 'Operações Isentas de IVA', 'Exigida seleção do código legal (ex: Artigo 12.º do CIVA)', 'Serviços de saúde, educação, exportações, medicamentos.']
    ],
    [2000, 2400, 2600, 2000]
  );

  xml += h2('3.4 Assistente de Emissão de Faturas (Wizard em 3 Passos)');
  xml += para('A criação de novos documentos fiscais foi otimizada para ser concluída em menos de 1 minuto:');
  xml += bullet('Seleção do cliente com auto-preenchimento dos dados fiscais e escolha da Série de Emissão.', 'Passo 1 - Cliente & Série:');
  xml += bullet('Adição de produtos/serviços, definição de quantidades, preços unitários e descontos. Cálculo automático do IVA por linha e subtotal.', 'Passo 2 - Linhas do Documento:');
  xml += bullet('Seleção do método de pagamento (Multicaixa, Transferência, TPA, Numerário), revisão dos totais, assinatura criptográfica JWS, geração de Hash e emissão do PDF com QR Code.', 'Passo 3 - Emissão & Assinatura:');

  xml += h2('3.5 Gestão de Tipos de Documentos Comerciais');
  xml += para('O sistema gera e gere os seguintes tipos de documentos estritamente normalizados:');
  xml += bullet('Factura (FT) - Documento de crédito comercial.', 'FT:');
  xml += bullet('Factura-Recibo (FR) - Documento de liquidação simultânea e pronto pagamento.', 'FR:');
  xml += bullet('Factura Simplificada (FS) - Para vendas diretas ao consumidor final.', 'FS:');
  xml += bullet('Nota de Crédito (NC) - Para retificação ou anulação de faturas emitidas (com referência obrigatória ao documento de origem).', 'NC:');
  xml += bullet('Nota de Débito (ND) - Para acréscimos de valor a faturas existentes.', 'ND:');
  xml += bullet('Orçamento (OR) e Guia de Remessa (GR) - Documentos informativos e de transporte.', 'OR / GR:');

  // Section 4: Cryptographic Engine & AGT Compliance
  xml += h1('4. Núcleo Criptográfico e Conformidade Fiscal AGT');
  xml += para('Para cumprir os requisitos obrigatórios de certificação da AGT (Decreto Presidencial n.º 71/25 e Decreto Executivo n.º 683/25), o Kima Facturação Web implementa um motor de segurança de dados de nível bancário.');

  xml += callout(
    'Mecanismo de Imutabilidade e Hash Encadeado (Chain of Trust)',
    'Cada documento fiscal emitido gera um Hash SHA-256 único. Para garantir a impossibilidade de alteração ou inserção fraudulenta de documentos no passado, o cálculo do Hash do documento N inclui os caracteres do Hash do documento N-1 da mesma série. Qualquer tentativa de alteração inviabiliza a cadeia de custódia.',
    'warning'
  );

  xml += h2('4.1 Especificação dos Componentes de Criptografia Fiscal');
  xml += bullet('Algoritmo SHA-256 aplicado sobre os campos essenciais: Data de Emissão + Data de Criação + Número do Documento + Total Geral + Hash Anterior.', 'Fiscal Hash:');
  xml += bullet('Par de chaves RSA de 2048-bit gerado exclusivamente para a empresa. A chave privada assina o hash do documento gerando um JWS que comprova a autoria do sistema.', 'Assinatura JWS (RSA-2048):');
  xml += bullet('Código QR impresso no canto do documento PDF contendo a URL oficial de validação da AGT, NIF da Empresa, NIF do Cliente, Tipo de Documento, Número, Data, Valor Total, Valor do IVA e Hash Fiscal.', 'Código QR AGT:');
  xml += bullet('Numeração sequencial contínua por Série e Tipo de Documento (ex: A/000001, A/000002). O sistema impede buracos ou duplicações na numeração.', 'Séries Auditáveis:');
  xml += bullet('Inclusão obrigatória no cabeçalho dos documentos do número de validação atribuído pela AGT (ex: 999/AGT/2026).', 'N.º de Certificado AGT:');

  xml += h2('4.2 Exportador SAF-T (AO) e Validação XSD');
  xml += para('O ficheiro SAF-T (AO) (Standard Audit File for Tax Purposes - Angola) é o padrão de exportação obrigatório para prestação de contas à AGT:');
  xml += bullet('Estruturação de dados contendo Header, MasterFiles (Clientes, Produtos, Tabela de Impostos) e SourceDocuments (Faturas, Notas de Crédito/Débito, Pagamentos).', 'Estrutura XML SAF-T:');
  xml += bullet('Antes da transferência do ficheiro ao utilizador, o motor executa uma validação em tempo real contra o esquema XSD oficial da AGT (saft-ao.xsd), garantindo zero inconsistências sintáticas.', 'Validação XSD:');

  // Section 5: Database Schema
  xml += h1('5. Modelo de Dados e Esquema de Base de Dados');
  xml += para('A estrutura de dados foi desenhada no Supabase PostgreSQL (schema kima_facturas) garantindo integridade referencial, índices de alta velocidade e histórico de auditoria imutável.');

  xml += table(
    ['Nome da Tabela', 'Chave Primária', 'Descrição da Entidade', 'Campos Chave'],
    [
      ['companies', 'id (UUID)', 'Dados da empresa emissora', 'nif, razao_social, agt_cert_no, rsa_public_key, rsa_private_key, morada'],
      ['clients', 'id (UUID)', 'Cadastro de clientes', 'nif, nome, email, telefone, endereco, tipo_contribuinte'],
      ['products', 'id (UUID)', 'Catálogo de artigos/serviços', 'codigo, descricao, preco_unitario, taxa_iva, motivo_isencao_code'],
      ['series_numeracao', 'id (UUID)', 'Séries de numeração por doc', 'tipo_documento, serie, ano, ultimo_numero'],
      ['invoices', 'id (UUID)', 'Cabeçalho dos documentos', 'numero_doc, serie, tipo, client_id, total_sem_imposto, total_iva, total_geral, hash, jws_signature, qr_code_url, status'],
      ['invoice_lines', 'id (UUID)', 'Linhas de itens da fatura', 'invoice_id, product_id, descricao, quantidade, preco_unitario, taxa_iva, valor_iva, total_linha'],
      ['payments', 'id (UUID)', 'Registo de pagamentos', 'invoice_id, metodo_pagamento, valor_pago, data_pagamento, referencia'],
      ['logs_auditoria', 'id (UUID)', 'Log de auditoria imutável', 'user_id, acao, entidade, payload_hash, timestamp, ip_address']
    ],
    [2000, 1600, 2400, 3000]
  );

  // Section 6: Installation & Setup
  xml += h1('6. Guia de Instalação, Configuração e Manutenção');
  xml += para('Para implantar e executar o Kima Facturação Web em ambiente local ou de produção:');

  xml += h2('6.1 Requisitos do Sistema');
  xml += bullet('Node.js v20.x ou superior (Recomendado Node.js v24 LTS).', 'Node.js:');
  xml += bullet('Gerenciador de pacotes pnpm (v10+) ou npm.', 'Gerenciador de Pacotes:');
  xml += bullet('Instância PostgreSQL (Supabase) configurada com as credenciais de acesso.', 'Base de Dados:');

  xml += h2('6.2 Passos de Configuração e Execução');
  xml += para('1. Clona o repositório e instala as dependências:');
  xml += para('   pnpm install', { bold: true });
  xml += para('2. Configuração das Variáveis de Ambiente (.env.local):');
  xml += para('   NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"', { italic: true });
  xml += para('   SUPABASE_SERVICE_ROLE_KEY="sua-chave-service-role"', { italic: true });
  xml += para('   NEXT_PUBLIC_APP_URL="http://localhost:3000"', { italic: true });
  xml += para('3. Execução das Migrações da Base de Dados:');
  xml += para('   npx drizzle-kit push / pnpm run db:push', { bold: true });
  xml += para('4. Início do Servidor de Desenvolvimento:');
  xml += para('   pnpm dev', { bold: true });
  xml += para('5. Testes de Conformidade AGT e Credenciação:');
  xml += para('   node scripts/agt-fase5-teste.mts', { bold: true });
  xml += para('   node scripts/agt-credenciacao.mts', { bold: true });

  // Section 7: Conclusion
  xml += h1('7. Conclusão e Roadmap de Evolução');
  xml += para('O Kima Facturação Web estabelece-se como uma plataforma de faturação de topo para o mercado angolano, unindo a facilidade de utilização de uma aplicação moderna com a máxima rigorosidade exigida pelas entidades reguladoras (AGT).');

  xml += callout(
    'Estado de Prontidão do Sistema',
    'Com a conclusão das Fases de Segurança Criptográfica, Módulo de Documentos Retificativos, Exportação SAF-T (AO) e Validação XSD, o sistema encontra-se 100% preparado para passar nos testes formais de credenciação da AGT.',
    'success'
  );

  xml += para('Próximos Passos de Expansão (Roadmap 2026/2027):');
  xml += bullet('Desenvolvimento da camada de sincronização em tempo real via REST API direta com os servidores centrais da AGT (Fase 2).', 'Integração Direta AGT:');
  xml += bullet('Expansão do suporte multi-tenant nativo para gestão centralizada de grupos empresariais.', 'Multi-Empresa:');
  xml += bullet('Implementação de controlo de acessos refinado por perfil de utilizador (Administrador, Operador de Caixa, Contabilista).', 'Gestão de Permissões:');

  // Close body
  return xml;
}

// Main execution function
function buildDocument() {
  const docxTemplatePath = path.join(projectRoot, 'Metas Semanais/Folha de oficio.docx');
  const targetDocxPath = path.join(projectRoot, 'Metas Semanais/Folha de oficio.docx');
  const copyTargetDocxPath = path.join(projectRoot, 'DOCUMENTACAO_TECNICA_KIMA_FACTURACAO.docx');

  console.log('Reading template zip...');
  const zip = new AdmZip(docxTemplatePath);

  // Generate new document.xml body content
  const bodyXml = generateDocumentXmlBody();

  // Load existing document.xml to preserve namespaces and section properties
  let docXmlContent = zip.readAsText('word/document.xml');

  // Extract <w:document ...><w:body> prefix and </w:body></w:document> suffix including <w:sectPr>
  const bodyStartIdx = docXmlContent.indexOf('<w:body>');
  const bodyEndIdx = docXmlContent.indexOf('</w:body>');

  if (bodyStartIdx === -1 || bodyEndIdx === -1) {
    throw new Error('Invalid document.xml structure in template!');
  }

  const headerPrefix = docXmlContent.substring(0, bodyStartIdx + '<w:body>'.length);
  
  // Extract sectPr from original document body
  const sectPrMatch = docXmlContent.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectPrMatch ? sectPrMatch[0] : '';

  const newDocXml = headerPrefix + '\n' + bodyXml + '\n' + sectPr + '\n</w:body></w:document>';

  console.log('Updating word/document.xml in zip archive...');
  zip.updateFile('word/document.xml', Buffer.from(newDocXml, 'utf8'));

  console.log('Writing updated DOCX file to Metas Semanais/Folha de oficio.docx...');
  zip.writeZip(targetDocxPath);

  console.log('Creating a ready-to-use copy at DOCUMENTACAO_TECNICA_KIMA_FACTURACAO.docx...');
  zip.writeZip(copyTargetDocxPath);

  console.log('SUCCESS! Documentation DOCX created cleanly.');
}

buildDocument();
