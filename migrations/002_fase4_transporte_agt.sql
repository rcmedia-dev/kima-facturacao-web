-- 002_fase4_transporte_agt.sql
-- FASE 4 · T4.3 — Módulo de Guias de Remessa / Transporte
-- Campos de transporte de mercadorias nas Guias de Remessa (F3)
-- Executar no schema `kima_facturas` (Supabase SQL Editor).

BEGIN;

ALTER TABLE kima_facturas.documentos
  ADD COLUMN IF NOT EXISTS transporte_viatura   TEXT,
  ADD COLUMN IF NOT EXISTS transporte_matricula TEXT,
  ADD COLUMN IF NOT EXISTS transporte_motorista TEXT;

COMMIT;