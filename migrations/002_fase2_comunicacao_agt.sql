-- 002_fase2_comunicacao_agt.sql
-- FASE 2 · Comunicação em Tempo Real & API AGT (estrutura pronta para receber a API)
-- Decreto Presidencial n.º 71/25 · Tarefas T2.1, T2.2, T2.3, T2.4
-- Executar no schema `kima_facturas` (Supabase SQL Editor).

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Status de comunicação AGT na tabela de documentos (T2.4)
--    O documento continua imutável (R13); estes campos são de COORDENAÇÃO e
--    registam apenas o estado do envio à AGT.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE kima_facturas.documentos
  ADD COLUMN IF NOT EXISTS status_agt             TEXT,
  ADD COLUMN IF NOT EXISTS erro_agt               TEXT,
  ADD COLUMN IF NOT EXISTS tentativas_agt         INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_transmissao_agt   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_ultima_tentativa_agt TIMESTAMPTZ;

-- Índice para consulta rápida por estado de comunicação
CREATE INDEX IF NOT EXISTS idx_documentos_status_agt
  ON kima_facturas.documentos (company_id, status_agt);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tabela de fila de envio assíncrono (T2.2 — Queue & Retry)
--    Cada documento emitido entra na fila; o worker processa com retry.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kima_facturas.fila_envio_agt (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         TEXT NOT NULL,
  documento_id       UUID NOT NULL REFERENCES kima_facturas.documentos(id),
  estado             TEXT NOT NULL DEFAULT 'Pendente', -- Pendente|Processando|Transmitido|Rejeitado|Erro
  tentativas         INT  NOT NULL DEFAULT 0,
  max_tentativas     INT  NOT NULL DEFAULT 5,
  proxima_tentativa  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_erro        TEXT,
  processado_em      TIMESTAMPTZ,
  fim_de_linha       BOOLEAN NOT NULL DEFAULT false,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (documento_id)
);

CREATE INDEX IF NOT EXISTS idx_fila_envio_agt_estado
  ON kima_facturas.fila_envio_agt (company_id, estado, proxima_tentativa);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Credenciais da AGT por empresa (T2.1)
--    A chave secreta deve ser armazenada cifrada em produção (aqui fica o
--    campo único por empresa; o secret é guardado no servidor via env var).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kima_facturas.credenciais_agt (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      TEXT NOT NULL UNIQUE,
  ambiente        TEXT NOT NULL DEFAULT 'sandbox', -- sandbox|producao
  client_id       TEXT,
  base_url_api    TEXT,
  ativa           BOOLEAN NOT NULL DEFAULT true,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Trigger: enfileira automaticamente documentos fiscalmente relevantes (T2.2)
--    (exclui Orçamentos e rascunhos — sem impacto fiscal imediato)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION kima_facturas.enfileirar_documento_agt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> 'Rascunho'
     AND NEW.tipo IN ('Fatura','FaturaRecibo','Simplificada','NotaCredito',
                      'NotaDebito','GuiaRemessa','Recibo','AvisoCobrancaRecibo',
                      'FaturaGenerica','FaturaGlobal','FaturaAdiantamento') THEN
    INSERT INTO kima_facturas.fila_envio_agt (company_id, documento_id)
    VALUES (NEW.company_id, NEW.id)
    ON CONFLICT (documento_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enfileirar_documento_agt ON kima_facturas.documentos;
CREATE TRIGGER trg_enfileirar_documento_agt
  AFTER INSERT ON kima_facturas.documentos
  FOR EACH ROW EXECUTE FUNCTION kima_facturas.enfileirar_documento_agt();

COMMIT;