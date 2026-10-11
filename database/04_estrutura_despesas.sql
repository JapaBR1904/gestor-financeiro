-- Execute este arquivo conectado ao banco "nexo" antes de iniciar o backend com o módulo de despesas.

CREATE TABLE IF NOT EXISTS despesas (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    descricao VARCHAR(180) NOT NULL,
    valor NUMERIC(14, 2) NOT NULL CHECK (valor > 0),
    categoria VARCHAR(80) NOT NULL,
    data_despesa DATE NOT NULL,
    forma_pagamento VARCHAR(30) NOT NULL,
    observacao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_despesas_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_despesas_organizacao_data
    ON despesas(organizacao_id, data_despesa DESC);

CREATE INDEX IF NOT EXISTS idx_despesas_organizacao_categoria
    ON despesas(organizacao_id, categoria);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE despesas TO nexo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexo_app;
