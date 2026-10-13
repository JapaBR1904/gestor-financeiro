-- Execute no banco nexo como administrador. Migração aditiva, sem apagar dados.
BEGIN;

CREATE TABLE IF NOT EXISTS membros_organizacao (
    organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id),
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
    papel VARCHAR(30) NOT NULL CHECK (papel IN ('proprietario', 'administrador', 'membro')),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organizacao_id, usuario_id)
);
INSERT INTO membros_organizacao (organizacao_id, usuario_id, papel, ativo)
SELECT organizacao_id, id, CASE WHEN papel IN ('proprietario','administrador','membro') THEN papel ELSE 'membro' END, ativo
FROM usuarios ON CONFLICT DO NOTHING;

ALTER TABLE sessoes_usuario ADD COLUMN IF NOT EXISTS organizacao_id BIGINT REFERENCES organizacoes(id);
UPDATE sessoes_usuario s SET organizacao_id = u.organizacao_id FROM usuarios u
WHERE s.usuario_id = u.id AND s.organizacao_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessoes_organizacao_usuario ON sessoes_usuario(organizacao_id, usuario_id);
ALTER TABLE convites_organizacao ADD COLUMN IF NOT EXISTS criado_por BIGINT REFERENCES usuarios(id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_convites_token ON convites_organizacao(token_hash) WHERE token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS movimentacoes (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('receita','despesa')),
    descricao VARCHAR(180) NOT NULL,
    valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
    data DATE NOT NULL,
    categoria VARCHAR(80) NOT NULL DEFAULT 'Outros',
    conta VARCHAR(80) NOT NULL DEFAULT 'Principal',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_organizacao_data ON movimentacoes(organizacao_id, data, id);
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS chave_idempotencia UUID;
CREATE UNIQUE INDEX IF NOT EXISTS uq_movimentacoes_idempotencia ON movimentacoes(organizacao_id, chave_idempotencia) WHERE chave_idempotencia IS NOT NULL;

CREATE TABLE IF NOT EXISTS documentos_organizacao (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id),
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
    nome VARCHAR(180) NOT NULL,
    descricao VARCHAR(500) NOT NULL DEFAULT '',
    tipo VARCHAR(100) NOT NULL,
    conteudo BYTEA NOT NULL CHECK (octet_length(conteudo) BETWEEN 1 AND 5242880),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documentos_organizacao ON documentos_organizacao(organizacao_id, criado_em);

GRANT SELECT, INSERT, UPDATE, DELETE ON membros_organizacao, movimentacoes, documentos_organizacao TO nexo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexo_app;
COMMIT;
