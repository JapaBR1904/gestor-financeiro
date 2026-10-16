-- Incremental: preserva vendas, itens e valores históricos. Aplicar uma vez após a 12.
BEGIN;
ALTER TABLE vendas ADD COLUMN chave_idempotencia UUID;
ALTER TABLE vendas ADD COLUMN payload_hash CHAR(64);
ALTER TABLE vendas ADD COLUMN resposta_original JSONB;
ALTER TABLE vendas ADD CONSTRAINT uq_vendas_idempotencia UNIQUE (organizacao_id, chave_idempotencia);
ALTER TABLE vendas ADD CONSTRAINT ck_vendas_idempotencia CHECK (
    (chave_idempotencia IS NULL AND payload_hash IS NULL AND resposta_original IS NULL)
    OR (chave_idempotencia IS NOT NULL AND payload_hash IS NOT NULL AND resposta_original IS NOT NULL));
ALTER TABLE vendas ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'registrada';
ALTER TABLE vendas ADD COLUMN cancelamento_motivo VARCHAR(500);
ALTER TABLE vendas ADD COLUMN cancelado_em TIMESTAMPTZ;
ALTER TABLE vendas ADD COLUMN cancelado_por BIGINT REFERENCES usuarios(id);
ALTER TABLE vendas ADD CONSTRAINT ck_vendas_cancelamento CHECK (
    (status = 'registrada' AND cancelamento_motivo IS NULL AND cancelado_em IS NULL AND cancelado_por IS NULL)
    OR (status = 'cancelada' AND cancelamento_motivo IS NOT NULL AND length(trim(cancelamento_motivo)) BETWEEN 3 AND 500 AND cancelado_em IS NOT NULL AND cancelado_por IS NOT NULL));
COMMIT;
