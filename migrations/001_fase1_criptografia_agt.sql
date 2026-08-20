-- 001_fase1_criptografia_agt.sql
-- FASE 1 · Segurança, Criptografia & Imutabilidade (Certificação AGT)
-- Decreto Presidencial n.º 71/25 · Tarefas T1.1, T1.2, T1.3, T1.4, T1.5
-- Executar no schema `kima_facturas` (Supabase SQL Editor).

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Colunas de segurança / imutabilidade na tabela de documentos
--    R12 (hash de integridade), R9 (assinatura JWS), R8 (QR Code),
--    R14/R6 (user tracking), R15 (certificação AGT).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE kima_facturas.documentos
  ADD COLUMN IF NOT EXISTS hash_anterior   TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_jws  TEXT,
  ADD COLUMN IF NOT EXISTS qr_payload      TEXT,
  ADD COLUMN IF NOT EXISTS assinado_por    TEXT,
  ADD COLUMN IF NOT EXISTS cert_agt_numero TEXT;

-- Índice para leitura rápida da cadeia de hashes (company + tipo + série + nº)
CREATE INDEX IF NOT EXISTS idx_documentos_cadeia_hash
  ON kima_facturas.documentos (company_id, tipo, serie, numero);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tabela de chaves de assinatura digital (RS256) por empresa
--    A chave privada fica sempre no servidor e nunca é exposta via API.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kima_facturas.chaves_assinatura_agt (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      TEXT NOT NULL,
  private_key_pem TEXT NOT NULL,
  public_key_pem  TEXT NOT NULL,
  alg             TEXT NOT NULL DEFAULT 'RS256',
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Imutabilidade dos documentos emitidos (R13)
--    Impede que o hash seja alterado e que os valores de documentos emitidos
--    (não rascunho / não cancelados) sejam modificados. O cancelamento (mudança
--    de status) e o registo de pagamentos continuam permitidos.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION kima_facturas.impedir_alteracao_documento_emitido()
RETURNS TRIGGER AS $$
BEGIN
  -- O hash é definitivo após a emissão
  IF OLD.hash IS NOT NULL AND NEW.hash IS DISTINCT FROM OLD.hash THEN
    RAISE EXCEPTION 'Imutabilidade (R13): o hash de um documento emitido não pode ser alterado';
  END IF;

  -- Valores de documentos emitidos não podem mudar (apenas status/observações/pagamentos)
  IF OLD.status NOT IN ('Rascunho', 'Cancelado')
     AND NEW.status NOT IN ('Rascunho')
     AND (
       NEW.subtotal  IS DISTINCT FROM OLD.subtotal  OR
       NEW.total_iva IS DISTINCT FROM OLD.total_iva OR
       NEW.total     IS DISTINCT FROM OLD.total
     ) THEN
    RAISE EXCEPTION 'Immutabilidade (R13): valores de um documento emitido não podem ser alterados';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_imutabilidade_documento ON kima_facturas.documentos;
CREATE TRIGGER trg_imutabilidade_documento
  BEFORE UPDATE ON kima_facturas.documentos
  FOR EACH ROW
  EXECUTE FUNCTION kima_facturas.impedir_alteracao_documento_emitido();

COMMIT;

