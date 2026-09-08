-- 003_fase4_documentos_e_transporte.sql
-- FASE 4 · Atualização dos 6 Tipos Oficiais de Documentos e Referências
-- Decreto Presidencial n.º 71/25 (Art. 3º, 4º e 6º)
-- Documentos Suportados (6): Fatura, FaturaRecibo, NotaCredito, NotaDebito, Orcamento (Factura pro-forma), Recibo
-- Executar no Supabase SQL Editor.

BEGIN;

-- 1. Definir search_path automaticamente (suporta kima_facturas ou kima_faturas)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'kima_facturas') THEN
    SET search_path TO kima_facturas, public;
  ELSIF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'kima_faturas') THEN
    SET search_path TO kima_faturas, public;
  END IF;
END $$;

-- 2. Campos de transporte de mercadorias
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS transporte_viatura   TEXT,
  ADD COLUMN IF NOT EXISTS transporte_matricula TEXT,
  ADD COLUMN IF NOT EXISTS transporte_motorista TEXT;

-- 3. Remover FK de documento_referenciado se existir e permitir número completo ou texto (ex: 'B/000003')
ALTER TABLE documentos
  DROP CONSTRAINT IF EXISTS documentos_documento_referenciado_fkey;

ALTER TABLE documentos
  ALTER COLUMN documento_referenciado TYPE TEXT;

-- 4. Limpar/remover tipos não emitidos pelo sistema (ex: Guia de Remessa / Transporte)
DELETE FROM series_numeracao
WHERE tipo_documento IN ('GuiaRemessa', 'Guia de Remessa', 'GUIA_REMESSA', 'GuiaTransporte');

DELETE FROM documentos
WHERE tipo IN ('GuiaRemessa', 'Guia de Remessa', 'GUIA_REMESSA', 'GuiaTransporte');

-- 5. Normalizar linhas legadas em series_numeracao para os 6 tipos oficiais
UPDATE series_numeracao
SET tipo_documento = CASE
  WHEN tipo_documento IN ('Factura', 'FATURA', 'fatura') THEN 'Fatura'
  WHEN tipo_documento IN ('Factura-Recibo', 'FacturaRecibo', 'FATURA_RECIBO', 'factura-recibo') THEN 'FaturaRecibo'
  WHEN tipo_documento IN ('Nota de Crédito', 'Nota_Credito', 'NotaCredito', 'NOTA_CREDITO', 'nota_credito') THEN 'NotaCredito'
  WHEN tipo_documento IN ('Nota de Débito', 'Nota_Debito', 'NotaDebito', 'NOTA_DEBITO', 'nota_debito') THEN 'NotaDebito'
  WHEN tipo_documento IN ('Factura pro-forma', 'factura-pro forma', 'Proforma', 'Orçamento', 'Orcamento', 'ORCAMENTO', 'orcamento') THEN 'Orcamento'
  WHEN tipo_documento IN ('Recibo', 'RECIBO', 'recibo') THEN 'Recibo'
  ELSE 'Fatura'
END
WHERE tipo_documento NOT IN ('Fatura', 'FaturaRecibo', 'NotaCredito', 'NotaDebito', 'Orcamento', 'Recibo');

-- 6. Normalizar linhas legadas em documentos para os 6 tipos oficiais
UPDATE documentos
SET tipo = CASE
  WHEN tipo IN ('Factura', 'FATURA', 'fatura') THEN 'Fatura'
  WHEN tipo IN ('Factura-Recibo', 'FacturaRecibo', 'FATURA_RECIBO', 'factura-recibo') THEN 'FaturaRecibo'
  WHEN tipo IN ('Nota de Crédito', 'Nota_Credito', 'NotaCredito', 'NOTA_CREDITO', 'nota_credito') THEN 'NotaCredito'
  WHEN tipo IN ('Nota de Débito', 'Nota_Debito', 'NotaDebito', 'NOTA_DEBITO', 'nota_debito') THEN 'NotaDebito'
  WHEN tipo IN ('Factura pro-forma', 'factura-pro forma', 'Proforma', 'Orçamento', 'Orcamento', 'ORCAMENTO', 'orcamento') THEN 'Orcamento'
  WHEN tipo IN ('Recibo', 'RECIBO', 'recibo') THEN 'Recibo'
  ELSE 'Fatura'
END
WHERE tipo NOT IN ('Fatura', 'FaturaRecibo', 'NotaCredito', 'NotaDebito', 'Orcamento', 'Recibo');

-- 7. Atualizar check constraint de series_numeracao para os 6 tipos oficiais
ALTER TABLE series_numeracao 
  DROP CONSTRAINT IF EXISTS series_numeracao_tipo_documento_check;

ALTER TABLE series_numeracao 
  ADD CONSTRAINT series_numeracao_tipo_documento_check 
  CHECK (tipo_documento IN ('Fatura', 'FaturaRecibo', 'NotaCredito', 'NotaDebito', 'Orcamento', 'Recibo'));

-- 8. Atualizar check constraint de documentos para os 6 tipos oficiais
ALTER TABLE documentos 
  DROP CONSTRAINT IF EXISTS documentos_tipo_check;

ALTER TABLE documentos 
  ADD CONSTRAINT documentos_tipo_check 
  CHECK (tipo IN ('Fatura', 'FaturaRecibo', 'NotaCredito', 'NotaDebito', 'Orcamento', 'Recibo'));

COMMIT;