package br.com.nexo.ia;

import br.com.nexo.financeiro.FinanceiroService;
import br.com.nexo.meta.MetaService;
import br.com.nexo.relatorio.RelatorioService;
import br.com.nexo.saas.SaasService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/** Seleciona agregados do espaço da sessão; nunca recebe dados financeiros do navegador. */
@Service
public class ContextoIaService {
    private static final Map<String,String> PAGINAS = Map.ofEntries(
        Map.entry("/dashboard", "Visão geral"), Map.entry("/pessoal", "Movimentações"),
        Map.entry("/fluxo-caixa", "Fluxo de caixa"), Map.entry("/metas", "Metas"),
        Map.entry("/despesas", "Despesas"), Map.entry("/vendas", "Vendas"),
        Map.entry("/relatorios", "Relatórios"), Map.entry("/documentos", "Documentos"),
        Map.entry("/ia", "Nexo IA"));
    private static final List<String> ASSUNTOS = List.of("resumo", "despesas", "fluxo", "metas", "comparativo", "relatorios", "documentos");
    private final FinanceiroService financeiro;
    private final MetaService metas;
    private final RelatorioService relatorios;
    private final SaasService saas;
    private final JsonMapper json = JsonMapper.builder().build();

    public ContextoIaService(FinanceiroService financeiro, MetaService metas, RelatorioService relatorios, SaasService saas) {
        this.financeiro=financeiro; this.metas=metas; this.relatorios=relatorios; this.saas=saas;
    }

    @Transactional(readOnly=true)
    public Dados montar(Long org, Entrada entrada, boolean autorizado) {
        var contexto = entrada == null ? new Entrada("/ia", "resumo", null, null) : entrada;
        String pagina = contexto.pagina() == null ? "/ia" : contexto.pagina();
        String assunto = contexto.assunto() == null ? "resumo" : contexto.assunto();
        if (!PAGINAS.containsKey(pagina) || !ASSUNTOS.contains(assunto))
            throw new IllegalArgumentException("Escolha um contexto válido do Nexo.");
        String perfil = saas.perfilAtual(org);
        var dados = new LinkedHashMap<String,Object>();
        dados.put("tela", PAGINAS.get(pagina));
        dados.put("perfil", perfil);
        dados.put("assunto", assunto);
        String periodo = "Somente sua pergunta; dados financeiros não enviados";
        if (autorizado && !assunto.equals("documentos")) {
            if (assunto.equals("metas")) {
                // Metas representam o progresso atual, não um saldo histórico reconstruído.
                var lista = metas.listar(org);
                var hoje = LocalDate.now(java.time.ZoneId.of("America/Sao_Paulo"));
                dados.put("dataObservacao", hoje);
                dados.put("metasAtuais", lista.stream()
                    .sorted(Comparator.comparing((MetaService.MetaResumo meta) -> !meta.status().equals("ativa"))
                        .thenComparing(meta -> meta.prazo() == null ? LocalDate.MAX : meta.prazo()))
                    .limit(8).map(meta -> new MetaContexto(meta.titulo(), meta.unidade(), meta.valorMeta(), meta.valorAtual(), meta.prazo(), meta.status())).toList());
                dados.put("totalMetas", lista.size());
                dados.put("metasComPrazoVencido", lista.stream().filter(meta -> meta.status().equals("ativa") && meta.prazo() != null && meta.prazo().isBefore(hoje)).count());
                dados.put("limiteMetasEnviadas", 8);
                periodo = "Progresso atual das metas";
            } else if (assunto.equals("relatorios")) {
                var resumo = relatorios.gerar(org);
                dados.put("vendasRegistradas", resumo.faturamento());
                dados.put("custoProdutosVendidos", resumo.custoVendas());
                dados.put("lucroBruto", resumo.lucroBruto());
                dados.put("despesasComerciais", resumo.totalDespesas());
                dados.put("resultadoAposCustosEDespesas", resumo.lucroBruto().subtract(resumo.totalDespesas()));
                periodo = "Todo o histórico comercial; sem movimentações manuais";
            } else if (assunto.equals("fluxo") || assunto.equals("comparativo")) {
                var analise = financeiro.analise(org, contexto.inicio(), contexto.fim());
                dados.put("atual", totais(analise.atual()));
                dados.put("anteriorMesmaDuracao", totais(analise.anterior()));
                analise.evolucao().stream().min(Comparator.comparing(FinanceiroService.Evolucao::saldo))
                    .ifPresent(dia -> dados.put("menorResultadoAcumulado", Map.of("data", dia.data(), "resultado", dia.saldo())));
                periodo = intervalo(analise.atual());
            } else {
                var resumo = financeiro.resumo(org, contexto.inicio(), contexto.fim());
                dados.put("resumo", totais(resumo));
                if (assunto.equals("despesas")) {
                    var categorias = new java.util.HashMap<String,BigDecimal>();
                    resumo.movimentacoes().stream().filter(item -> item.tipo().equals("despesa"))
                        .forEach(item -> categorias.merge(item.categoria(), item.valor(), BigDecimal::add));
                    dados.put("maioresCategorias", categorias.entrySet().stream()
                        .sorted(Map.Entry.<String,BigDecimal>comparingByValue().reversed()).limit(5)
                        .map(item -> Map.of("categoria", item.getKey(), "total", item.getValue())).toList());
                }
                periodo = intervalo(resumo);
            }
        }
        if (assunto.equals("documentos")) periodo = "Nenhum documento enviado; selecione e autorize um documento na área de Documentos";
        dados.put("escopo", periodo);
        dados.put("limites", "Entradas menos saídas é resultado do período, não dinheiro disponível. Vendas não comprovam recebimento. Não há projeção de contas futuras nem consulta a outros espaços.");
        return new Dados(json.writeValueAsString(dados), new Base(pagina, PAGINAS.get(pagina), assunto, periodo, perfil, autorizado && !assunto.equals("documentos")));
    }

    private Map<String,Object> totais(FinanceiroService.Resumo resumo) {
        return Map.of("inicio", resumo.inicio(), "fim", resumo.fim(), "entradasRegistradas", resumo.receitas(),
            "saidasRegistradas", resumo.despesas(), "resultadoPeriodo", resumo.saldo(), "quantidadeMovimentacoes", resumo.movimentacoes().size());
    }
    private String intervalo(FinanceiroService.Resumo resumo) { return resumo.inicio()+" a "+resumo.fim(); }
    public record Entrada(String pagina, String assunto, LocalDate inicio, LocalDate fim) {}
    public record Base(String pagina, String tela, String assunto, String periodo, String perfil, boolean dadosAutorizados) {}
    public record Dados(String texto, Base base) {}
    private record MetaContexto(String titulo, String unidade, BigDecimal valorMeta, BigDecimal valorAtual, LocalDate prazo, String status) {}
}
