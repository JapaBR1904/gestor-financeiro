-- Execute este arquivo conectado ao banco "nexo".
-- Estrutura inicial para separar empresas e preparar produtos, ingredientes e ficha de custo.

CREATE TABLE IF NOT EXISTS organizacoes (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(160) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produtos (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    nome VARCHAR(160) NOT NULL,
    descricao TEXT,
    preco_venda NUMERIC(14, 2) NOT NULL CHECK (preco_venda >= 0),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_produtos_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes(id) ON DELETE CASCADE,
    CONSTRAINT uq_produtos_organizacao_id_id UNIQUE (organizacao_id, id)
);

CREATE TABLE IF NOT EXISTS ingredientes (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    nome VARCHAR(160) NOT NULL,
    preco_compra NUMERIC(14, 2) NOT NULL CHECK (preco_compra >= 0),
    quantidade_compra NUMERIC(14, 4) NOT NULL CHECK (quantidade_compra > 0),
    unidade_compra VARCHAR(10) NOT NULL CHECK (unidade_compra IN ('kg', 'g', 'l', 'ml', 'un')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ingredientes_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes(id) ON DELETE CASCADE,
    CONSTRAINT uq_ingredientes_organizacao_id_id UNIQUE (organizacao_id, id)
);

CREATE TABLE IF NOT EXISTS produto_ingredientes (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    produto_id BIGINT NOT NULL,
    ingrediente_id BIGINT NOT NULL,
    quantidade_usada NUMERIC(14, 4) NOT NULL CHECK (quantidade_usada > 0),
    unidade_uso VARCHAR(10) NOT NULL CHECK (unidade_uso IN ('kg', 'g', 'l', 'ml', 'un')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_produto_ingredientes_produto
        FOREIGN KEY (organizacao_id, produto_id)
        REFERENCES produtos(organizacao_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_produto_ingredientes_ingrediente
        FOREIGN KEY (organizacao_id, ingrediente_id)
        REFERENCES ingredientes(organizacao_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_produto_ingrediente UNIQUE (produto_id, ingrediente_id)
);

CREATE INDEX IF NOT EXISTS idx_produtos_organizacao ON produtos(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_ingredientes_organizacao ON ingredientes(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_produto_ingredientes_produto ON produto_ingredientes(produto_id);
