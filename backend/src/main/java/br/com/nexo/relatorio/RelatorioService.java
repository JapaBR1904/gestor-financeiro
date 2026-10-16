package br.com.nexo.relatorio;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import br.com.nexo.despesa.Despesa;
import br.com.nexo.despesa.DespesaRepository;
import br.com.nexo.organizacao.OrganizacaoService;
import br.com.nexo.venda.Venda;
import br.com.nexo.venda.VendaItemRepository;
import br.com.nexo.venda.VendaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RelatorioService {
    private final OrganizacaoService organizacaoService;
    private final VendaRepository vendaRepository;
    private final VendaItemRepository vendaItemRepository;
    private final DespesaRepository despesaRepository;

    public RelatorioService(
            OrganizacaoService organizacaoService,
            VendaRepository vendaRepository,
            VendaItemRepository vendaItemRepository,
            DespesaRepository despesaRepository
    ) {
        this.organizacaoService = organizacaoService;
        this.vendaRepository = vendaRepository;
        this.vendaItemRepository = vendaItemRepository;
        this.despesaRepository = despesaRepository;
    }

    @Transactional(readOnly = true)
    public RelatorioResumo gerar(Long organizacaoId) {
        organizacaoService.buscarPorId(organizacaoId);

        List<Venda> vendas = vendaRepository.listarParaRelatorio(organizacaoId);
        List<Despesa> despesas = despesaRepository.findByOrganizacaoIdOrderByDataDespesaDescIdDesc(organizacaoId);

        BigDecimal faturamento = vendas.stream()
                .map(Venda::getTotalVenda)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal custoVendas = vendas.stream().anyMatch(v -> v.getCustoTotal() == null) ? null : vendas.stream()
                .map(Venda::getCustoTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalDespesas = despesas.stream()
                .map(Despesa::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal lucroBruto = custoVendas == null ? null : faturamento.subtract(custoVendas).setScale(2, RoundingMode.HALF_UP);
        BigDecimal saldoFinanceiro = faturamento.subtract(totalDespesas).setScale(2, RoundingMode.HALF_UP);

        Map<IdentidadeProduto, ProdutoAcumulado> produtos = new LinkedHashMap<>();
        Map<String, BigDecimal> formasPagamento = new LinkedHashMap<>();
        Map<Long, ClienteAcumulado> clientes = new LinkedHashMap<>();

        for (Venda venda : vendas) {
            formasPagamento.merge(venda.getFormaPagamento(), venda.getTotalVenda(), BigDecimal::add);

            var pessoa = venda.getCliente();
            if (pessoa != null && organizacaoId.equals(pessoa.getOrganizacao().getId())) {
                ClienteAcumulado cliente = clientes.computeIfAbsent(pessoa.getId(), id -> new ClienteAcumulado(id, pessoa.getNome()));
                cliente.quantidadeVendas++;
                cliente.totalComprado = cliente.totalComprado.add(venda.getTotalVenda());
            }
        }

        // ID separa homônimos; o nome do item continua sendo o snapshot daquela venda.
        for (var item : vendaItemRepository.listarParaRelatorio(organizacaoId)) {
            var identidade = new IdentidadeProduto(item.getProdutoId(), item.getNome());
            ProdutoAcumulado produto = produtos.computeIfAbsent(identidade, chave -> new ProdutoAcumulado(chave.id(), chave.nome()));
            produto.quantidadeVendida += item.getQuantidade();
            produto.faturamento = produto.faturamento.add(item.getSubtotal());
        }

        Map<String, BigDecimal> despesasPorCategoria = new LinkedHashMap<>();
        for (Despesa despesa : despesas) {
            despesasPorCategoria.merge(despesa.getCategoria(), despesa.getValor(), BigDecimal::add);
        }

        List<ProdutoRanking> produtosMaisVendidos = produtos.values().stream()
                .sorted(Comparator.comparingInt((ProdutoAcumulado item) -> item.quantidadeVendida).reversed())
                .map(item -> new ProdutoRanking(item.id, item.nome, item.quantidadeVendida, item.faturamento.setScale(2, RoundingMode.HALF_UP)))
                .toList();

        List<FormaPagamentoResumo> pagamentos = formasPagamento.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(entry -> new FormaPagamentoResumo(entry.getKey(), entry.getValue().setScale(2, RoundingMode.HALF_UP)))
                .toList();

        List<CategoriaDespesaResumo> categorias = despesasPorCategoria.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(entry -> new CategoriaDespesaResumo(entry.getKey(), entry.getValue().setScale(2, RoundingMode.HALF_UP)))
                .toList();

        List<ClienteRanking> melhoresClientes = clientes.values().stream()
                .sorted(Comparator.comparing((ClienteAcumulado item) -> item.totalComprado).reversed())
                .map(item -> new ClienteRanking(item.id, item.nome, item.quantidadeVendas, item.totalComprado.setScale(2, RoundingMode.HALF_UP)))
                .toList();

        return new RelatorioResumo(
                vendas.size(),
                faturamento,
                custoVendas,
                lucroBruto,
                despesas.size(),
                totalDespesas,
                saldoFinanceiro,
                produtosMaisVendidos,
                pagamentos,
                categorias,
                melhoresClientes
        );
    }

    private record IdentidadeProduto(Long id, String nome) {}

    private static class ProdutoAcumulado {
        private final Long id;
        private final String nome;
        private int quantidadeVendida;
        private BigDecimal faturamento = BigDecimal.ZERO;

        private ProdutoAcumulado(Long id, String nome) { this.id = id; this.nome = nome; }
    }

    private static class ClienteAcumulado {
        private final Long id;
        private final String nome;
        private int quantidadeVendas;
        private BigDecimal totalComprado = BigDecimal.ZERO;

        private ClienteAcumulado(Long id, String nome) { this.id = id; this.nome = nome; }
    }

    public record ProdutoRanking(Long produtoId, String nome, int quantidadeVendida, BigDecimal faturamento) {}
    public record FormaPagamentoResumo(String formaPagamento, BigDecimal total) {}
    public record CategoriaDespesaResumo(String categoria, BigDecimal total) {}
    public record ClienteRanking(Long clienteId, String nome, int quantidadeVendas, BigDecimal totalComprado) {}

    public record RelatorioResumo(
            int quantidadeVendas,
            BigDecimal faturamento,
            BigDecimal custoVendas,
            BigDecimal lucroBruto,
            int quantidadeDespesas,
            BigDecimal totalDespesas,
            BigDecimal saldoFinanceiro,
            List<ProdutoRanking> produtosMaisVendidos,
            List<FormaPagamentoResumo> formasPagamento,
            List<CategoriaDespesaResumo> despesasPorCategoria,
            List<ClienteRanking> melhoresClientes
    ) {}
}
