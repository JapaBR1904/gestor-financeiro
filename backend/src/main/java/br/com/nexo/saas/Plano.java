package br.com.nexo.saas;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

public enum Plano {
    FREE("free", "Free", 0, 1, "Para começar a organizar a vida financeira e conhecer o Nexo.",
            List.of("Dashboard financeiro", "Cadastro de produtos e clientes", "Vendas e despesas", "Relatórios essenciais", "1 usuário")),
    PRO("pro", "Pro", 39, 1, "Controle individual, com análises e planejamento para decidir melhor.",
            List.of("Tudo do plano Free", "Fluxo de caixa por período", "Metas e comparativos", "Exportação CSV", "Assistente financeiro com IA", "1 usuário")),
    BUSINESS("business", "Business", 99, 10, "Para empresas com equipe e gestão compartilhada.",
            List.of("Tudo do plano Pro", "Até 10 usuários", "Convites e acesso compartilhado", "Papéis e permissões", "Organizações independentes", "Documentos da empresa"));

    private final String id;
    private final String nome;
    private final BigDecimal valor;
    private final int limiteUsuarios;
    private final String descricao;
    private final List<String> beneficios;

    Plano(String id, String nome, int valor, int limiteUsuarios, String descricao, List<String> beneficios) {
        this.id = id; this.nome = nome; this.valor = BigDecimal.valueOf(valor);
        this.limiteUsuarios = limiteUsuarios; this.descricao = descricao; this.beneficios = beneficios;
    }
    public String id() { return id; }
    public String nome() { return nome; }
    public BigDecimal valor() { return valor; }
    public int limiteUsuarios() { return limiteUsuarios; }
    public boolean permite(RecursoPlano recurso) { return ordinal() >= de(recurso.planoMinimo()).ordinal(); }
    public Detalhe detalhe() {
        return new Detalhe(id, nome, valor, "BRL", "mensal", descricao, beneficios, limiteUsuarios,
                Arrays.stream(RecursoPlano.values()).filter(this::permite).map(Enum::name).toList());
    }
    public static Plano de(String valor) {
        String id = valor == null ? "" : valor.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values()).filter(p -> p.id.equals(id)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Plano inválido."));
    }
    public static Plano efetivo(String plano, String status) {
        return List.of("prototipo", "ativa", "trial").contains(status) ? de(plano) : FREE;
    }
    public record Detalhe(String id, String nome, BigDecimal valorMensal, String moeda, String periodicidade,
                          String descricao, List<String> beneficios, int limiteUsuarios, List<String> recursos) {}
}
