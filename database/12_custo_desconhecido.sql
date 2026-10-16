-- Custo ausente é NULL; custo explicitamente zero continua sendo 0.
-- Não recalcula ou altera os snapshots monetários das vendas existentes.
BEGIN;
ALTER TABLE vendas ALTER COLUMN custo_total DROP NOT NULL;
ALTER TABLE vendas ALTER COLUMN lucro_total DROP NOT NULL;
ALTER TABLE venda_itens ALTER COLUMN custo_unitario DROP NOT NULL;
ALTER TABLE venda_itens ALTER COLUMN custo_subtotal DROP NOT NULL;
ALTER TABLE venda_itens ALTER COLUMN lucro_subtotal DROP NOT NULL;
-- Coerência entre custo desconhecido e lucro desconhecido.
ALTER TABLE vendas ADD CONSTRAINT ck_vendas_custo_conhecido CHECK ((custo_total IS NULL) = (lucro_total IS NULL));
ALTER TABLE venda_itens ADD CONSTRAINT ck_itens_custo_conhecido CHECK ((custo_unitario IS NULL) = (custo_subtotal IS NULL) AND (custo_subtotal IS NULL) = (lucro_subtotal IS NULL));
COMMIT;
