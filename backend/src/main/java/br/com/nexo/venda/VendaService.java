package br.com.nexo.venda;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;

import br.com.nexo.organizacao.Organizacao;
import br.com.nexo.organizacao.OrganizacaoService;
import br.com.nexo.produto.Produto;
import br.com.nexo.produto.ProdutoRepository;
import br.com.nexo.produto.ProdutoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VendaService {
    private final OrganizacaoService organizacaoService;
    private final ProdutoRepository produtoRepository;
    private final ProdutoService produtoService;
    private final VendaRepository vendaRepository;
    private final VendaItemRepository vendaItemRepository;

    public VendaService(OrganizacaoService organizacaoService, ProdutoRepository produtoRepository, ProdutoService produtoService, VendaRepository vendaRepository, VendaItemRepository vendaItemRepository) {
        this.organizacaoService = organizacaoService;
        this.produtoRepository = produtoRepository;
        this.produtoService = produtoService;
        this.vendaRepository = vendaRepository;
        this.vendaItemRepository = vendaItemRepository;
    }

    @Transactional
    public VendaDetalhe criar(NovaVenda dados) {
        if (dados == null || dados.organizacaoId() == null) throw new IllegalArgumentException("A organização é obrigatória.");
        if (dados.itens() == null || dados.itens().isEmpty()) throw new IllegalArgumentException("Adicione pelo menos um produto à venda.");

        Organizacao organizacao = organizacaoService.buscarPorId(dados.organizacaoId());
        String formaPagamento = normalizarFormaPagamento(dados.formaPagamento());

        List<ItemCalculado> itens = dados.itens().stream().map(item -> calcularItem(dados.organizacaoId(), item)).toList();
        BigDecimal total = itens.stream().map(ItemCalculado::subtotal).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal custo = itens.stream().map(ItemCalculado::custoSubtotal).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal lucro = total.subtract(custo).setScale(2, RoundingMode.HALF_UP);

        Venda venda = vendaRepository.save(new Venda(organizacao, formaPagamento, normalizarTexto(dados.observacao()), total, custo, lucro));

        for (ItemCalculado item : itens) {
            vendaItemRepository.save(new VendaItem(
                    organizacao,
                    venda,
                    item.produto(),
                    item.produto().getNome(),
                    item.quantidade(),
                    item.precoUnitario(),
                    item.custoUnitario(),
                    item.subtotal(),
                    item.custoSubtotal(),
                    item.lucroSubtotal()
            ));
        }

        return montarDetalhe(venda);
    }

    @Transactional(readOnly = true)
    public List<VendaDetalhe> listar(Long organizacaoId) {
        organizacaoService.buscarPorId(organizacaoId);
        return vendaRepository.findByOrganizacaoIdOrderByCriadoEmDesc(organizacaoId).stream().map(this::montarDetalhe).toList();
    }

    @Transactional(readOnly = true)
    public VendaResumo resumo(Long organizacaoId) {
        List<VendaDetalhe> vendas = listar(organizacaoId);
        BigDecimal faturamento = vendas.stream().map(VendaDetalhe::totalVenda).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal custo = vendas.stream().map(VendaDetalhe::custoTotal).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal lucro = vendas.stream().map(VendaDetalhe::lucroTotal).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        return new VendaResumo(vendas.size(), faturamento, custo, lucro);
    }

    private ItemCalculado calcularItem(Long organizacaoId, NovoItem item) {
        if (item.produtoId() == null) throw new IllegalArgumentException("Selecione um produto.");
        if (item.quantidade() == null || item.quantidade() <= 0) throw new IllegalArgumentException("A quantidade deve ser maior que zero.");

        Produto produto = produtoRepository.findByIdAndOrganizacaoId(item.produtoId(), organizacaoId)
                .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado para esta organização."));
        if (!produto.isAtivo()) throw new IllegalArgumentException("O produto " + produto.getNome() + " está inativo.");

        ProdutoService.ProdutoDetalhe detalhe = produtoService.buscar(organizacaoId, produto.getId());
        BigDecimal quantidade = BigDecimal.valueOf(item.quantidade());
        BigDecimal preco = produto.getPrecoVenda().setScale(2, RoundingMode.HALF_UP);
        BigDecimal custo = detalhe.custoEstimado().setScale(2, RoundingMode.HALF_UP);
        BigDecimal subtotal = preco.multiply(quantidade).setScale(2, RoundingMode.HALF_UP);
        BigDecimal custoSubtotal = custo.multiply(quantidade).setScale(2, RoundingMode.HALF_UP);
        BigDecimal lucroSubtotal = subtotal.subtract(custoSubtotal).setScale(2, RoundingMode.HALF_UP);
        return new ItemCalculado(produto, item.quantidade(), preco, custo, subtotal, custoSubtotal, lucroSubtotal);
    }

    private VendaDetalhe montarDetalhe(Venda venda) {
        List<ItemDetalhe> itens = vendaItemRepository.findByVendaIdOrderByIdAsc(venda.getId()).stream()
                .map(item -> new ItemDetalhe(item.getId(), item.getProduto().getId(), item.getProdutoNome(), item.getQuantidade(), item.getPrecoUnitario(), item.getCustoUnitario(), item.getSubtotal(), item.getCustoSubtotal(), item.getLucroSubtotal()))
                .toList();
        return new VendaDetalhe(venda.getId(), venda.getFormaPagamento(), venda.getObservacao(), venda.getTotalVenda(), venda.getCustoTotal(), venda.getLucroTotal(), venda.getCriadoEm(), itens);
    }

    private String normalizarFormaPagamento(String valor) {
        String normalizada = valor == null ? "" : valor.trim().toLowerCase();
        if (!List.of("pix", "dinheiro", "debito", "credito", "outro").contains(normalizada)) {
            throw new IllegalArgumentException("Forma de pagamento inválida.");
        }
        return normalizada;
    }

    private String normalizarTexto(String valor) {
        return valor == null || valor.trim().isBlank() ? null : valor.trim();
    }

    public record NovaVenda(Long organizacaoId, String formaPagamento, String observacao, List<NovoItem> itens) {}
    public record NovoItem(Long produtoId, Integer quantidade) {}
    private record ItemCalculado(Produto produto, Integer quantidade, BigDecimal precoUnitario, BigDecimal custoUnitario, BigDecimal subtotal, BigDecimal custoSubtotal, BigDecimal lucroSubtotal) {}
    public record ItemDetalhe(Long id, Long produtoId, String produtoNome, Integer quantidade, BigDecimal precoUnitario, BigDecimal custoUnitario, BigDecimal subtotal, BigDecimal custoSubtotal, BigDecimal lucroSubtotal) {}
    public record VendaDetalhe(Long id, String formaPagamento, String observacao, BigDecimal totalVenda, BigDecimal custoTotal, BigDecimal lucroTotal, OffsetDateTime criadoEm, List<ItemDetalhe> itens) {}
    public record VendaResumo(int quantidadeVendas, BigDecimal faturamento, BigDecimal custo, BigDecimal lucro) {}
}
