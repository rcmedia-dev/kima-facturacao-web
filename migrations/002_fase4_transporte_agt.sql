-- 002_fase4_transporte_agt.sql
-- FASE 4 · T4.3 — Módulo de Guias de Remessa / Transporte
-- Campos de transporte de mercadorias nas Guias de Remessa (F3)
-- Executar no schema `kima_facturas` (Supabase SQL Editor).

BEGIN;

ALTER TABLE kima_facturas.documentos
  ADD COLUMN IF NOT EXISTS transporte_viatura   TEXT,
  ADD COLUMN IF NOT EXISTS transporte_matricula TEXT,
  ADD COLUMN IF NOT EXISTS transporte_motorista TEXT;

ALTER TABLE kima_facturas.documentos
  ALTER COLUMN documento_referenciado TYPE TEXT;

ALTER TABLE kima_facturas.series_numeracao 
  DROP CONSTRAINT IF EXISTS series_numeracao_tipo_documento_check;
ALTER TABLE kima_facturas.series_numeracao 
  ADD CONSTRAINT series_numeracao_tipo_documento_check 
  CHECK (tipo_documento IN ('Fatura', 'FaturaRecibo', 'NotaCredito', 'NotaDebito', 'Orcamento', 'Recibo'));

ALTER TABLE kima_facturas.documentos 
  DROP CONSTRAINT IF EXISTS documentos_tipo_check;
ALTER TABLE kima_facturas.documentos 
  ADD CONSTRAINT documentos_tipo_check 
  CHECK (tipo IN ('Fatura', 'FaturaRecibo', 'NotaCredito', 'NotaDebito', 'Orcamento', 'Recibo'));

COMMIT;