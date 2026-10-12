-- Execute no banco nexo depois dos scripts 02 a 08. Não remove dados.
BEGIN;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tentativas_login INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS login_janela_em TIMESTAMPTZ;

ALTER TABLE codigos_autenticacao DROP CONSTRAINT IF EXISTS ck_codigos_autenticacao_finalidade;
ALTER TABLE codigos_autenticacao ADD CONSTRAINT ck_codigos_autenticacao_finalidade
    CHECK (finalidade IN ('cadastro', 'login', 'verificacao_email', 'recuperacao_senha'));
ALTER TABLE codigos_autenticacao ADD COLUMN IF NOT EXISTS prova_hash VARCHAR(64);
ALTER TABLE codigos_autenticacao ADD COLUMN IF NOT EXISTS prova_expira_em TIMESTAMPTZ;
ALTER TABLE codigos_autenticacao ADD COLUMN IF NOT EXISTS prova_usada_em TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS uq_codigos_prova_hash ON codigos_autenticacao(prova_hash);

-- Invalida códigos antigos, sem apagar o histórico. Contas sem senha usam recuperação.
UPDATE codigos_autenticacao SET usado_em = NOW()
    WHERE finalidade IN ('cadastro', 'login') AND usado_em IS NULL;
COMMIT;
