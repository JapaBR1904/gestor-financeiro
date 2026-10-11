-- Execute este arquivo conectado ao banco "nexo" antes de iniciar o backend atualizado.

CREATE TABLE IF NOT EXISTS vendas (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    forma_pagamento VARCHAR(30) NOT NULL,
    observacao TEXT,
    total_venda NUMERIC(14, 2) NOT NULL CHECK (total_venda >= 0),
    custo_total NUMERIC(14, 2) NOT NULL CHECK (custo_total >= 0),
    lucro_total NUMERIC(14, 2) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_vendas_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes(id) ON DELETE CASCADE,
    CONSTRAINT uq_vendas_organizacao_id_id UNIQUE (organizacao_id, id)
);

CREATE TABLE IF NOT EXISTS venda_itens (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    venda_id BIGINT NOT NULL,
    produto_id BIGINT NOT NULL,
    produto_nome VARCHAR(160) NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(14, 2) NOT NULL CHECK (preco_unitario >= 0),
    custo_unitario NUMERIC(14, 2) NOT NULL CHECK (custo_unitario >= 0),
    subtotal NUMERIC(14, 2) NOT NULL CHECK (subtotal >= 0),
    custo_subtotal NUMERIC(14, 2) NOT NULL CHECK (custo_subtotal >= 0),
    lucro_subtotal NUMERIC(14, 2) NOT NULL,
    CONSTRAINT fk_venda_itens_venda
        FOREIGN KEY (organizacao_id, venda_id)
        REFERENCES vendas(organizacao_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_venda_itens_produto
        FOREIGN KEY (organizacao_id, produto_id)
        REFERENCES produtos(organizacao_id, id)
);

CREATE INDEX IF NOT EXISTS idx_vendas_organizacao_criado ON vendas(organizacao_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_venda_itens_venda ON venda_itens(venda_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE vendas TO nexo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE venda_itens TO nexo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexo_app;
