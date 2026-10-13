package br.com.nexo.relatorio;

import java.math.BigDecimal;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {"nexo.email.provider=disabled", "spring.jpa.properties.hibernate.generate_statistics=true", "logging.level.org.hibernate.stat=OFF"})
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "NEXO_TEST_DB_URL", matches = ".+")
@Transactional // Toda a massa sintética desta classe é revertida, sem tocar registros existentes.
class RelatorioIntegrationTest {
    @Autowired RelatorioService relatorio;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager em;
    @Autowired EntityManagerFactory emf;
    @DynamicPropertySource static void banco(DynamicPropertyRegistry r) {
        String url = System.getenv("NEXO_TEST_DB_URL");
        if (url != null && url.matches(".*[/]nexo([?].*)?")) throw new IllegalArgumentException("O banco nexo não é permitido em testes.");
        r.add("spring.datasource.url", () -> url);
        r.add("spring.datasource.username", () -> System.getenv().getOrDefault("NEXO_TEST_DB_USERNAME", "nexo_app"));
        r.add("spring.datasource.password", () -> System.getenv().getOrDefault("NEXO_TEST_DB_PASSWORD", ""));
    }
    private long id(String sql, Object... args) { return jdbc.queryForObject(sql, Long.class, args); }
    private long org() { assertNotEquals("nexo", jdbc.queryForObject("SELECT current_database()", String.class)); return id("INSERT INTO organizacoes(nome) VALUES ('Relatório sintético') RETURNING id"); }
    private long cliente(long org, String nome) { return id("INSERT INTO clientes(organizacao_id,nome) VALUES (?,?) RETURNING id", org, nome); }
    private long produto(long org) { return id("INSERT INTO produtos(organizacao_id,nome,preco_venda) VALUES (?,'Produto homônimo',1) RETURNING id", org); }
    private void venda(long org, Long cliente, long produto, String snapshot, String valor) {
        long venda = id("INSERT INTO vendas(organizacao_id,cliente_id,forma_pagamento,total_venda,custo_total,lucro_total) VALUES (?,?,'pix',?,0,?) RETURNING id", org, cliente, new BigDecimal(valor), new BigDecimal(valor));
        jdbc.update("INSERT INTO venda_itens(organizacao_id,venda_id,produto_id,produto_nome,quantidade,preco_unitario,custo_unitario,subtotal,custo_subtotal,lucro_subtotal) VALUES (?,?,?,?,1,?,0,?,0,?)", org, venda, produto, snapshot, new BigDecimal(valor), new BigDecimal(valor), new BigDecimal(valor));
    }
    @Test void homonimosSnapshotsSemClientePrecisaoEOutraOrganizacao() {
        long org = org(), outra = org(), a = cliente(org, "Cliente homônimo"), b = cliente(org, "Cliente homônimo"), literal = cliente(org, "Sem cliente identificado"), p = produto(org), q = produto(org);
        venda(org, a, p, "Nome na venda", "0.10");
        venda(org, b, q, "Nome na venda", "0.20");
        venda(org, a, p, "Outro snapshot", "0.30");
        venda(org, null, p, "Nome na venda", "0.40");
        venda(org, literal, p, "Nome na venda", "0.50");
        venda(outra, cliente(outra, "Privado de outra organização"), produto(outra), "Privado", "99999.99");
        var resultado = relatorio.gerar(org);
        assertEquals(new BigDecimal("1.50"), resultado.faturamento());
        assertEquals(new BigDecimal("1.50"), resultado.saldoFinanceiro());
        assertEquals(5, resultado.quantidadeVendas());
        assertEquals(3, resultado.produtosMaisVendidos().size());
        assertEquals(3, resultado.melhoresClientes().size());
        assertEquals(2, resultado.melhoresClientes().stream().filter(c -> c.nome().equals("Cliente homônimo")).count());
        assertTrue(resultado.melhoresClientes().stream().anyMatch(c -> c.nome().equals("Sem cliente identificado")));
        assertEquals(new BigDecimal("1.50"), resultado.produtosMaisVendidos().stream().map(RelatorioService.ProdutoRanking::faturamento).reduce(BigDecimal.ZERO, BigDecimal::add));
        assertFalse(resultado.produtosMaisVendidos().stream().anyMatch(pv -> pv.nome().equals("Privado")));
    }
    @Test void renomearInativarOuDesvincularClienteNaoReescreveSnapshotOuTotais() {
        long org = org(), cliente = cliente(org, "Nome antigo"), produto = produto(org);
        venda(org, cliente, produto, "Nome do produto na venda", "12.34");
        jdbc.update("UPDATE clientes SET nome='Nome atual' WHERE id=?", cliente);
        jdbc.update("UPDATE produtos SET nome='Catálogo atual',ativo=false WHERE id=?", produto);
        em.clear();
        var resultado = relatorio.gerar(org);
        assertEquals(cliente, resultado.melhoresClientes().getFirst().clienteId());
        assertEquals("Nome atual", resultado.melhoresClientes().getFirst().nome());
        assertEquals(produto, resultado.produtosMaisVendidos().getFirst().produtoId());
        assertEquals("Nome do produto na venda", resultado.produtosMaisVendidos().getFirst().nome());
        jdbc.update("UPDATE clientes SET ativo=false WHERE id=?", cliente);
        em.clear();
        assertEquals(cliente, relatorio.gerar(org).melhoresClientes().getFirst().clienteId());
        jdbc.update("UPDATE vendas SET cliente_id=NULL WHERE organizacao_id=?", org); // Simula histórico sem vínculo, sem apagar cliente.
        em.clear(); resultado = relatorio.gerar(org);
        assertTrue(resultado.melhoresClientes().isEmpty());
        assertEquals(new BigDecimal("12.34"), resultado.faturamento());
        assertEquals(new BigDecimal("12.34"), resultado.produtosMaisVendidos().getFirst().faturamento());
    }
    @Test void consultasNaoCrescemPorVenda() {
        long org = org(), cliente = cliente(org, "Benchmark sintético"), produto = produto(org);
        venda(org, cliente, produto, "Snapshot", "0.10");
        var stats = emf.unwrap(SessionFactory.class).getStatistics();
        em.clear(); stats.clear(); long inicio = System.nanoTime(); relatorio.gerar(org); long primeira = stats.getPrepareStatementCount(); long tempo1 = System.nanoTime()-inicio;
        for (int i=1;i<100;i++) venda(org, cliente, produto, "Snapshot", "0.10");
        em.clear(); stats.clear(); inicio = System.nanoTime(); var resultado = relatorio.gerar(org); long cem = stats.getPrepareStatementCount(); long tempo100 = System.nanoTime()-inicio;
        System.out.printf("Benchmark sintético relatório: 1 venda=%d consultas/%dms; 100 vendas=%d consultas/%dms%n", primeira, tempo1/1_000_000, cem, tempo100/1_000_000);
        assertEquals(new BigDecimal("10.00"), resultado.faturamento());
        assertEquals(primeira, cem, "Quantidade de consultas precisa ser constante");
        assertTrue(cem <= 4, "Organização, vendas/clientes, despesas e itens em batch");
    }
}
