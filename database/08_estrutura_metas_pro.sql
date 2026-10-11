-- Execute este arquivo conectado ao banco "nexo" como postgres.
-- Estrutura das metas disponíveis a partir do plano Pro.

CREATE TABLE IF NOT EXISTS metas (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    titulo VARCHAR(140) NOT NULL,
    unidade VARCHAR(20) NOT NULL DEFAULT 'moeda',
    valor_meta NUMERIC(14,2) NOT NULL,
    valor_atual NUMERIC(14,2) NOT NULL DEFAULT 0,
    prazo DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ativa',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_metas_organizacao
        FOREIGN KEY (organizacao_id)
        REFERENCES organizacoes(id)
        ON DELETE CASCADE,

    CONSTRAINT ck_metas_unidade
        CHECK (unidade IN ('moeda', 'percentual', 'quantidade')),

    CONSTRAINT ck_metas_status
        CHECK (status IN ('ativa', 'concluida', 'arquivada')),

    CONSTRAINT ck_metas_valores
        CHECK (valor_meta > 0 AND valor_atual >= 0)
);

CREATE INDEX IF NOT EXISTS idx_metas_organizacao_status
    ON metas(organizacao_id, status, criado_em DESC);

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE metas
TO nexo_app;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO nexo_app;
