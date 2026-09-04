# 📁 DOSSIER DE CREDENCIAÇÃO AGT — KIMA FACTURAÇÃO WEB
> **Entidade Requerente:** RC MEDIA ANGOLA - PRESTAÇÃO DE SERVIÇOS, LDA (NIF: 5002670119)  
> **Software:** Kima Facturação Web (Versão: 1.0.0)  
> **Legislação:** Decreto Presidencial n.º 71/25 · Decreto Executivo n.º 683/25 · Decreto Presidencial n.º 312/18  

---

## 🗂️ Estrutura do Dossier

| Pasta / Ficheiro | Descrição |
|---|---|
| **`00_INDICE_E_GUIA_DE_SUBMISSAO.md`** | Este guia com o roteiro passo a passo para submissão no Portal da AGT. |
| **`01_DOCUMENTACAO_TECNICA_KIMA_FACTURACAO.docx`** | Manual técnico detalhado em papel timbrado oficial da RC Media. |
| **`02_REQUERIMENTO_DE_CREDENCIACAO_AGT.docx`** | Minuta do Requerimento formal dirigido ao Conselho de Administração da AGT. |
| **`03_TERMO_DE_RESPONSABILIDADE_E_CONFORMIDADE.docx`** | Declaração solene e termo de responsabilidade assinado pela gerência e TI. |
| **`04_FICHA_TECNICA_DO_SOFTWARE.docx`** | Ficha técnica com especificações da arquitetura, criptografia e BD. |
| **`05_ARTEFACTOS_TECNICOS_AGT/`** | Pasta com os ficheiros técnicos: SAF-T XML, Chave Pública PEM, XSD e Manifesto. |
| **`06_AMOSTRAS_DOCUMENTOS_FISCAIS_PDF/`** | Amostras de Factura (FT), Factura-Recibo (FR) e Nota de Crédito (NC). |

---

## 📌 Guia Passo a Passo de Submissão no Portal da AGT

### Passo 1: Acesso ao Portal do Contribuinte
1. Aceda ao portal oficial da AGT: `www.agt.minfin.gov.ao`.
2. Efetue o login com o NIF da empresa (`5002670119`) e a palavra-passe de acesso.
3. Navegue até ao menu **"Serviços"** $\rightarrow$ **"Certificação de Software de Facturação"**.

### Passo 2: Preenchimento dos Dados do Software
1. **Nome do Software:** `Kima Facturação Web`
2. **Versão:** `1.0.0`
3. **Tipo de Aplicação:** Web / Cloud
4. **Linguagem / Base de Dados:** TypeScript / Next.js 16 / PostgreSQL

### Passo 3: Carregamento de Documentação
Faça o upload dos documentos preparados nesta pasta:
- [x] Requerimento formal assinado (`02_REQUERIMENTO_DE_CREDENCIACAO_AGT.docx`)
- [x] Termo de Responsabilidade (`03_TERMO_DE_RESPONSABILIDADE_E_CONFORMIDADE.docx`)
- [x] Ficha Técnica e Manual (`01_DOCUMENTACAO_TECNICA_KIMA_FACTURACAO.docx`)
- [x] Certidão Comercial e Comprovativo de NIF da RC Media

### Passo 4: Submissão dos Artefactos Fiscais
Na aba de validação técnica, carregue os ficheiros da pasta `05_ARTEFACTOS_TECNICOS_AGT/`:
- `SAFT-AO-AMOSTRA-2026.xml`
- `CHAVE_PUBLICA_RSA2048.pem`

### Passo 5: Homologação na Sandbox e Emissão de Certificado
1. A AGT disponibilizará as credenciais do ambiente **Sandbox**.
2. Após os testes de emissão e comunicação, a DSTIC da AGT emitirá o **Número Definitivo de Certificação de Software** (ex: `XXX/AGT/2026`).
