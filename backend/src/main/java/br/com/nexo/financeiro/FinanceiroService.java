package br.com.nexo.financeiro;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import br.com.nexo.saas.AcessoPlanoService;
import br.com.nexo.saas.RecursoPlano;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FinanceiroService {
    private final JdbcTemplate jdbc;
    private final AcessoPlanoService acesso;
    private final CalendarioFinanceiro calendario;
    public FinanceiroService(JdbcTemplate jdbc, AcessoPlanoService acesso, CalendarioFinanceiro calendario) { this.jdbc = jdbc; this.acesso = acesso; this.calendario = calendario; }

    public Periodo periodo(LocalDate inicio, LocalDate fim) {
        LocalDate hoje = calendario.hoje();
        LocalDate primeiro = inicio == null ? hoje.withDayOfMonth(1) : inicio;
        LocalDate ultimo = fim == null ? hoje : fim;
        if (ultimo.isBefore(primeiro) || ChronoUnit.DAYS.between(primeiro, ultimo) > 366)
            throw new IllegalArgumentException("Escolha um período de até 12 meses, com início anterior ao fim.");
        return new Periodo(primeiro, ultimo);
    }

    @Transactional(readOnly = true)
    public Resumo resumo(Long org, LocalDate inicio, LocalDate fim) {
        var periodo = periodo(inicio, fim);
        var itens = registros(org, periodo);
        BigDecimal receitas = soma(itens, "receita"); BigDecimal despesas = soma(itens, "despesa");
        return new Resumo(periodo.inicio(), periodo.fim(), receitas, despesas, receitas.subtract(despesas), itens);
    }

    @Transactional(readOnly = true)
    public Analise analise(Long org, LocalDate inicio, LocalDate fim) {
        acesso.exigir(org, RecursoPlano.FLUXO_CAIXA);
        var atual = resumo(org, inicio, fim);
        long dias = ChronoUnit.DAYS.between(atual.inicio(), atual.fim()) + 1;
        var anterior = resumo(org, atual.inicio().minusDays(dias), atual.inicio().minusDays(1));
        var evolucao = new java.util.ArrayList<Evolucao>();
        BigDecimal acumulado = BigDecimal.ZERO;
        for (LocalDate dia = atual.inicio(); !dia.isAfter(atual.fim()); dia = dia.plusDays(1)) {
            LocalDate data = dia;
            var itens = atual.movimentacoes().stream().filter(m -> m.data().equals(data)).toList();
            BigDecimal entradas = soma(itens, "receita"); BigDecimal saidas = soma(itens, "despesa");
            acumulado = acumulado.add(entradas).subtract(saidas);
            evolucao.add(new Evolucao(dia, entradas, saidas, acumulado));
        }
        var categorias = atual.movimentacoes().stream().filter(m -> m.tipo().equals("despesa"))
                .collect(java.util.stream.Collectors.groupingBy(Movimentacao::categoria,
                        java.util.stream.Collectors.reducing(BigDecimal.ZERO, Movimentacao::valor, BigDecimal::add)));
        return new Analise(atual, anterior, evolucao, categorias);
    }

    private List<Movimentacao> registros(Long org, Periodo periodo) {
        // Cada origem aparece uma vez: lançamentos manuais não replicam vendas/despesas comerciais.
        return jdbc.query("""
                SELECT * FROM (
                  SELECT id, 'manual' AS origem, tipo, descricao, valor, data, categoria, conta FROM movimentacoes WHERE organizacao_id = ?
                  UNION ALL
                  SELECT id, 'venda', 'receita', 'Venda #' || id, total_venda,
                         (criado_em AT TIME ZONE 'America/Sao_Paulo')::date, 'Vendas', forma_pagamento FROM vendas WHERE organizacao_id = ?
                  UNION ALL
                  SELECT id, 'despesa', 'despesa', descricao, valor, data_despesa, categoria, 'Principal' FROM despesas WHERE organizacao_id = ?
                ) movimentos WHERE data BETWEEN ? AND ? ORDER BY data DESC, origem, id DESC
                """, (rs, n) -> new Movimentacao(rs.getLong("id"), rs.getString("origem"), rs.getString("tipo"),
                rs.getString("descricao"), rs.getBigDecimal("valor"), rs.getObject("data", LocalDate.class),
                rs.getString("categoria"), rs.getString("conta")), org, org, org, periodo.inicio(), periodo.fim());
    }
    private BigDecimal soma(List<Movimentacao> itens, String tipo) {
        return itens.stream().filter(m -> m.tipo().equals(tipo)).map(Movimentacao::valor).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional
    public Movimentacao salvar(Long org, Long id, Lancamento dados) {
        return salvar(org, id, dados, null);
    }
    @Transactional
    public Movimentacao salvar(Long org, Long id, Lancamento dados, java.util.UUID chaveIdempotencia) {
        if (dados == null || dados.tipo() == null || !List.of("receita", "despesa").contains(dados.tipo())) throw new IllegalArgumentException("Escolha receita ou despesa.");
        String descricao = texto(dados.descricao(), 180, "Informe a descrição do lançamento.");
        String categoria = texto(dados.categoria(), 80, "Informe uma categoria.");
        String conta = texto(dados.conta(), 80, "Informe uma conta.");
        if (dados.valor() == null || dados.valor().signum() <= 0 || dados.valor().scale() > 2 || dados.valor().compareTo(new BigDecimal("999999999999.99")) > 0)
            throw new IllegalArgumentException("Informe um valor positivo com até duas casas decimais.");
        if (dados.data() == null) throw new IllegalArgumentException("Informe a data do lançamento.");
        Long chave = id;
        if (id == null) {
            chave = jdbc.queryForObject("""
                    INSERT INTO movimentacoes (organizacao_id,tipo,descricao,valor,data,categoria,conta,chave_idempotencia)
                    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (organizacao_id,chave_idempotencia) WHERE chave_idempotencia IS NOT NULL
                    DO UPDATE SET chave_idempotencia=EXCLUDED.chave_idempotencia RETURNING id
                    """, Long.class, org, dados.tipo(), descricao, dados.valor(), dados.data(), categoria, conta, chaveIdempotencia);
            var salvo = jdbc.queryForMap("SELECT tipo,descricao,valor,data,categoria,conta FROM movimentacoes WHERE id=? AND organizacao_id=?",chave,org);
            if (!dados.tipo().equals(salvo.get("tipo")) || !descricao.equals(salvo.get("descricao"))
                    || dados.valor().compareTo((BigDecimal)salvo.get("valor")) != 0 || !dados.data().equals(((java.sql.Date)salvo.get("data")).toLocalDate())
                    || !categoria.equals(salvo.get("categoria")) || !conta.equals(salvo.get("conta")))
                throw new IllegalArgumentException("Este envio já foi usado para outro lançamento. Inicie um novo lançamento.");
        }
        else if (jdbc.update("UPDATE movimentacoes SET tipo=?,descricao=?,valor=?,data=?,categoria=?,conta=?,atualizado_em=NOW() WHERE id=? AND organizacao_id=?",
                dados.tipo(), descricao, dados.valor(), dados.data(), categoria, conta, id, org) == 0) throw new IllegalArgumentException("Lançamento não encontrado.");
        return new Movimentacao(chave, "manual", dados.tipo(), descricao, dados.valor(), dados.data(), categoria, conta);
    }
    @Transactional public void remover(Long org, Long id) {
        if (jdbc.update("DELETE FROM movimentacoes WHERE id=? AND organizacao_id=?", id, org) == 0) throw new IllegalArgumentException("Lançamento não encontrado.");
    }
    private String texto(String valor, int tamanho, String erro) {
        String texto = valor == null ? "" : valor.trim();
        if (texto.isBlank() || texto.length() > tamanho) throw new IllegalArgumentException(erro);
        return texto;
    }

    @Transactional(readOnly = true) public String exportar(Long org, LocalDate inicio, LocalDate fim) {
        acesso.exigir(org, RecursoPlano.EXPORTACAO);
        var dados = resumo(org, inicio, fim);
        var csv = new StringBuilder("\uFEFFData;Tipo;Descrição;Categoria;Conta;Valor;Origem\r\n");
        for (var item : dados.movimentacoes()) csv.append(item.data()).append(';').append(item.tipo()).append(';')
                .append(celula(item.descricao())).append(';').append(celula(item.categoria())).append(';').append(celula(item.conta())).append(';')
                .append(item.valor().toPlainString().replace('.', ',')).append(';').append(item.origem()).append("\r\n");
        return csv.toString();
    }
    private String celula(String valor) {
        String texto = valor == null ? "" : valor;
        String inicio = texto.stripLeading();
        if (!inicio.isEmpty() && "=+-@\t\r\n".indexOf(inicio.charAt(0)) >= 0) texto = "'" + texto;
        return "\"" + texto.replace("\"", "\"\"") + "\"";
    }
    public record Periodo(LocalDate inicio, LocalDate fim) {}
    public record Lancamento(String tipo, String descricao, BigDecimal valor, LocalDate data, String categoria, String conta) {}
    public record Movimentacao(Long id, String origem, String tipo, String descricao, BigDecimal valor, LocalDate data, String categoria, String conta) {}
    public record Resumo(LocalDate inicio, LocalDate fim, BigDecimal receitas, BigDecimal despesas, BigDecimal saldo, List<Movimentacao> movimentacoes) {}
    public record Evolucao(LocalDate data, BigDecimal receitas, BigDecimal despesas, BigDecimal saldo) {}
    public record Analise(Resumo atual, Resumo anterior, List<Evolucao> evolucao, java.util.Map<String, BigDecimal> categorias) {}
}
