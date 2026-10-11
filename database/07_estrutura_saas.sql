-- Execute este arquivo conectado ao banco "nexo" como postgres.
-- Estrutura SaaS: onboarding, planos/assinaturas e convites de equipe.

CREATE TABLE IF NOT EXISTS configuracoes_saas (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL UNIQUE,
    perfil_uso VARCHAR(20),
    objetivos JSONB NOT NULL DEFAULT '[]'::jsonb,
    onboarding_concluido BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_configuracoes_saas_organizacao
        FOREIGN KEY (organizacao_id)
        REFERENCES organizacoes(id)
        ON DELETE CASCADE,

    CONSTRAINT ck_configuracoes_saas_perfil
        CHECK (perfil_uso IS NULL OR perfil_uso IN ('pessoal', 'negocio', 'empresa')),

    CONSTRAINT ck_configuracoes_saas_objetivos_array
        CHECK (jsonb_typeof(objetivos) = 'array')
);

CREATE TABLE IF NOT EXISTS assinaturas (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL UNIQUE,
    plano VARCHAR(20) NOT NULL DEFAULT 'free',
    status VARCHAR(20) NOT NULL DEFAULT 'prototipo',
    provedor VARCHAR(40),
    provedor_cliente_id VARCHAR(180),
    provedor_assinatura_id VARCHAR(180),
    periodo_inicio TIMESTAMPTZ,
    periodo_fim TIMESTAMPTZ,
    cancelamento_agendado BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_assinaturas_organizacao
        FOREIGN KEY (organizacao_id)
        REFERENCES organizacoes(id)
        ON DELETE CASCADE,

    CONSTRAINT ck_assinaturas_plano
        CHECK (plano IN ('free', 'pro', 'business')),

    CONSTRAINT ck_assinaturas_status
        CHECK (status IN ('prototipo', 'trial', 'ativa', 'atrasada', 'cancelada'))
);

CREATE INDEX IF NOT EXISTS idx_assinaturas_plano_status
    ON assinaturas(plano, status);

CREATE TABLE IF NOT EXISTS convites_organizacao (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    email VARCHAR(180) NOT NULL,
    papel VARCHAR(30) NOT NULL DEFAULT 'membro',
    token_hash VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    expira_em TIMESTAMPTZ,
    aceito_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_convites_organizacao
        FOREIGN KEY (organizacao_id)
        REFERENCES organizacoes(id)
        ON DELETE CASCADE,

    CONSTRAINT ck_convites_papel
        CHECK (papel IN ('administrador', 'membro')),

    CONSTRAINT ck_convites_status
        CHECK (status IN ('pendente', 'aceito', 'revogado', 'expirado'))
);

CREATE INDEX IF NOT EXISTS idx_convites_organizacao_status
    ON convites_organizacao(organizacao_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_convite_pendente_email_organizacao
    ON convites_organizacao(organizacao_id, LOWER(email))
    WHERE status = 'pendente';

-- Garante configuração e plano Free para organizações que já existem.
INSERT INTO configuracoes_saas (organizacao_id)
SELECT id
FROM organizacoes
ON CONFLICT (organizacao_id) DO NOTHING;

INSERT INTO assinaturas (organizacao_id, plano, status)
SELECT id, 'free', 'prototipo'
FROM organizacoes
ON CONFLICT (organizacao_id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE configuracoes_saas, assinaturas, convites_organizacao
TO nexo_app;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO nexo_app;
