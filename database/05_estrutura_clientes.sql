-- Execute este arquivo conectado ao banco "nexo" como postgres.

CREATE TABLE IF NOT EXISTS clientes (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    nome VARCHAR(160) NOT NULL,
    telefone VARCHAR(30),
    email VARCHAR(180),
    observacao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_clientes_organizacao
        FOREIGN KEY (organizacao_id)
        REFERENCES organizacoes(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_clientes_organizacao_id_id
        UNIQUE (organizacao_id, id)
);

CREATE INDEX IF NOT EXISTS idx_clientes_organizacao_nome
    ON clientes(organizacao_id, nome);

CREATE INDEX IF NOT EXISTS idx_clientes_organizacao_telefone
    ON clientes(organizacao_id, telefone);

ALTER TABLE vendas
    ADD COLUMN IF NOT EXISTS cliente_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_vendas_cliente'
    ) THEN
        ALTER TABLE vendas
            ADD CONSTRAINT fk_vendas_cliente
            FOREIGN KEY (organizacao_id, cliente_id)
            REFERENCES clientes(organizacao_id, id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vendas_cliente
    ON vendas(organizacao_id, cliente_id);

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE clientes
TO nexo_app;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO nexo_app;
