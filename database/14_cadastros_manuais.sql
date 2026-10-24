-- Aplicação explícita após aprovação, somente no banco escolhido. Não executada pelo app.
BEGIN;
CREATE TABLE cadastros_manuais (
    usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id),
    estado VARCHAR(10) NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','aprovado','recusado')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decidido_em TIMESTAMPTZ,
    decidido_por VARCHAR(100),
    CHECK ((estado = 'pendente' AND decidido_em IS NULL AND decidido_por IS NULL)
        OR (estado <> 'pendente' AND decidido_em IS NOT NULL AND decidido_por IS NOT NULL))
);
CREATE INDEX idx_cadastros_manuais_pendentes ON cadastros_manuais(criado_em) WHERE estado = 'pendente';
COMMIT;
