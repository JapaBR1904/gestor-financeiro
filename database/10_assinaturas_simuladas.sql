-- Migração incremental, no banco nexo depois da 09. Não exclui dados.
BEGIN;
ALTER TABLE assinaturas ADD COLUMN IF NOT EXISTS versao BIGINT NOT NULL DEFAULT 0;
ALTER TABLE assinaturas DROP CONSTRAINT IF EXISTS ck_assinaturas_status;
ALTER TABLE assinaturas ADD CONSTRAINT ck_assinaturas_status CHECK
    (status IN ('prototipo', 'trial', 'ativa', 'atrasada', 'cancelada', 'pendente', 'vencida', 'pagamento_falhou'));

CREATE TABLE IF NOT EXISTS checkouts_assinatura (
    id UUID PRIMARY KEY,
    organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    chave_idempotencia UUID NOT NULL,
    plano_anterior VARCHAR(20) NOT NULL CHECK (plano_anterior IN ('free','pro','business')),
    plano_destino VARCHAR(20) NOT NULL CHECK (plano_destino IN ('free','pro','business')),
    assinatura_versao BIGINT NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('upgrade','downgrade','cancelamento')),
    valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK
        (status IN ('pendente','aprovado','recusado','cancelado','expirado','desatualizado')),
    metodo VARCHAR(20) CHECK (metodo IN ('cartao','pix','boleto')),
    origem VARCHAR(20) NOT NULL DEFAULT 'simulado' CHECK (origem = 'simulado'),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expira_em TIMESTAMPTZ NOT NULL,
    concluido_em TIMESTAMPTZ,
    UNIQUE (organizacao_id, chave_idempotencia)
);
CREATE INDEX IF NOT EXISTS idx_checkouts_organizacao ON checkouts_assinatura(organizacao_id, criado_em DESC);

CREATE TABLE IF NOT EXISTS historico_assinaturas (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    checkout_id UUID NOT NULL UNIQUE REFERENCES checkouts_assinatura(id),
    plano_anterior VARCHAR(20) NOT NULL,
    plano_novo VARCHAR(20) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    origem VARCHAR(20) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_historico_assinatura_organizacao ON historico_assinaturas(organizacao_id, criado_em DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE checkouts_assinatura, historico_assinaturas TO nexo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexo_app;
COMMIT;
