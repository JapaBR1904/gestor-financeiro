-- Execute este arquivo conectado ao banco "nexo" como postgres.

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    nome VARCHAR(160) NOT NULL,
    email VARCHAR(180) NOT NULL,
    papel VARCHAR(30) NOT NULL DEFAULT 'proprietario',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    email_verificado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_usuarios_organizacao
        FOREIGN KEY (organizacao_id)
        REFERENCES organizacoes(id)
        ON DELETE CASCADE,

    CONSTRAINT ck_usuarios_papel
        CHECK (papel IN ('proprietario', 'administrador', 'membro'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email_normalizado
    ON usuarios (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_usuarios_organizacao
    ON usuarios(organizacao_id);

CREATE TABLE IF NOT EXISTS codigos_autenticacao (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(180) NOT NULL,
    codigo_hash VARCHAR(255) NOT NULL,
    finalidade VARCHAR(20) NOT NULL,
    tentativas INTEGER NOT NULL DEFAULT 0,
    max_tentativas INTEGER NOT NULL DEFAULT 5,
    expira_em TIMESTAMPTZ NOT NULL,
    usado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_codigos_autenticacao_finalidade
        CHECK (finalidade IN ('cadastro', 'login')),

    CONSTRAINT ck_codigos_autenticacao_tentativas
        CHECK (tentativas >= 0 AND max_tentativas > 0)
);

CREATE INDEX IF NOT EXISTS idx_codigos_autenticacao_email_finalidade
    ON codigos_autenticacao(LOWER(email), finalidade, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_codigos_autenticacao_expiracao
    ON codigos_autenticacao(expira_em);

CREATE TABLE IF NOT EXISTS sessoes_usuario (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expira_em TIMESTAMPTZ NOT NULL,
    revogada_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultimo_acesso_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_sessoes_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sessoes_usuario_token_hash
    ON sessoes_usuario(token_hash);

CREATE INDEX IF NOT EXISTS idx_sessoes_usuario_usuario
    ON sessoes_usuario(usuario_id, expira_em DESC);

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE usuarios, codigos_autenticacao, sessoes_usuario
TO nexo_app;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO nexo_app;
