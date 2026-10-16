package br.com.nexo.venda;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import br.com.nexo.validacao.ValidacaoFinanceira;
import br.com.nexo.validacao.DadosInvalidosException;

import br.com.nexo.cliente.Cliente;
import br.com.nexo.cliente.ClienteService;
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
    private final ClienteService clienteService;
    private final ProdutoRepository produtoRepository;
    private final ProdutoService produtoService;
    private final VendaRepository vendaRepository;
    private final VendaItemRepository vendaItemRepository;
    private final VendaIdempotenciaRepository idempotencia;
    private final br.com.nexo.organizacao.MembroRepository membros;
    private final br.com.nexo.organizacao.PoliticaOrganizacao politica;
    private final br.com.nexo.saas.AcessoPlanoService planos;

    public VendaService(OrganizacaoService organizacaoService, ClienteService clienteService, ProdutoRepository produtoRepository, ProdutoService produtoService, VendaRepository vendaRepository, VendaItemRepository vendaItemRepository, VendaIdempotenciaRepository idempotencia, br.com.nexo.organizacao.MembroRepository membros, br.com.nexo.organizacao.PoliticaOrganizacao politica, br.com.nexo.saas.AcessoPlanoService planos) {
        this.organizacaoService = organizacaoService;
        this.clienteService = clienteService;
        this.produtoRepository = produtoRepository;
        this.produtoService = produtoService;
        this.vendaRepository = vendaRepository;
        this.vendaItemRepository = vendaItemRepository;
        this.idempotencia = idempotencia; this.membros = membros; this.politica = politica; this.planos = planos;
    }

    @Transactional
    public VendaDetalhe criar(NovaVenda dados) { return criar(dados, java.util.UUID.randomUUID()); }

    @Transactional
    public VendaDetalhe criar(NovaVenda dados, java.util.UUID chave) {
        if (dados == null || dados.organizacaoId() == null) throw new IllegalArgumentException("A organização é obrigatória.");
        if (dados.itens() == null || dados.itens().isEmpty()) throw new IllegalArgumentException("Adicione pelo menos um produto à venda.");

        if (chave == null) throw new DadosInvalidosException("Idempotency-Key", "Identifique a tentativa de venda.");
        var payload = new NovaVenda(dados.organizacaoId(), dados.clienteId(), normalizarFormaPagamento(dados.formaPagamento()), normalizarTexto(dados.observacao()), dados.itens());
        var fingerprint = idempotencia.fingerprint(payload);
        var original = idempotencia.original(dados.organizacaoId(), chave, fingerprint);
        if (original.isPresent()) return original.get();
        Organizacao organizacao = organizacaoService.buscarPorId(dados.organizacaoId());
        Cliente cliente = dados.clienteId() == null ? null : clienteService.buscarEntidade(dados.organizacaoId(), dados.clienteId());
        if (cliente != null && !cliente.isAtivo()) throw new IllegalArgumentException("O cliente selecionado está inativo.");
        String formaPagamento = normalizarFormaPagamento(dados.formaPagamento());

        List<ItemCalculado> itens = dados.itens().stream().map(item -> calcularItem(dados.organizacaoId(), item)).toList();
        BigDecimal total = itens.stream().map(ItemCalculado::subtotal).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal custo = itens.stream().anyMatch(i -> i.custoSubtotal() == null) ? null : itens.stream().map(ItemCalculado::custoSubtotal).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal lucro = custo == null ? null : total.subtract(custo).setScale(2, RoundingMode.HALF_UP);
        ValidacaoFinanceira.calculado(total, "totalVenda");
        ValidacaoFinanceira.calculado(custo, "custoTotal");
        ValidacaoFinanceira.calculado(lucro, "lucroTotal");

        Venda venda = vendaRepository.save(new Venda(organizacao, cliente, formaPagamento, normalizarTexto(dados.observacao()), total, custo, lucro));

        for (ItemCalculado item : itens) {
            vendaItemRepository.save(new VendaItem(organizacao, venda, item.produto(), item.produto().getNome(), item.quantidade(), item.precoUnitario(), item.custoUnitario(), item.subtotal(), item.custoSubtotal(), item.lucroSubtotal()));
        }

        var detalhe = montarDetalhe(venda);
        idempotencia.guardar(dados.organizacaoId(), chave, fingerprint, detalhe);
        return detalhe;
    }

    @Transactional
    public VendaDetalhe cancelar(br.com.nexo.auth.AuthService.UsuarioAutenticado usuario, Long id, String motivo) {
        var atual = membros.usuarioAtual(usuario);
        politica.exigirGestao(atual);
        if (!atual.papel().equals("proprietario")) planos.exigir(atual.organizacaoId(), br.com.nexo.saas.RecursoPlano.EQUIPE);
        String texto = normalizarTexto(motivo);
        if (texto == null || texto.length() < 3 || texto.length() > 500) throw new DadosInvalidosException("motivo", "Informe o motivo do cancelamento, de 3 a 500 caracteres.");
        var venda = vendaRepository.bloquear(id, atual.organizacaoId()).orElseThrow(() -> new IllegalArgumentException("Venda não encontrada neste espaço."));
        venda.cancelar(atual.id(), texto);
        return montarDetalhe(vendaRepository.saveAndFlush(venda));
    }

    @Transactional(readOnly = true)
    public List<VendaDetalhe> listar(Long organizacaoId) {
        organizacaoService.buscarPorId(organizacaoId);
        return vendaRepository.findByOrganizacaoIdOrderByCriadoEmDesc(organizacaoId).stream().map(this::montarDetalhe).toList();
    }

    @Transactional(readOnly = true)
    public VendaDetalhe buscar(Long organizacaoId, Long vendaId) {
        organizacaoService.buscarPorId(organizacaoId);
        Venda venda = vendaRepository.findByIdAndOrganizacaoId(vendaId, organizacaoId)
                .orElseThrow(() -> new IllegalArgumentException("Venda não encontrada para esta organização."));
        return montarDetalhe(venda);
    }

    @Transactional(readOnly = true)
    public VendaResumo resumo(Long organizacaoId) {
        List<VendaDetalhe> vendas = listar(organizacaoId).stream().filter(v -> v.status().equals("registrada")).toList();
        BigDecimal faturamento = vendas.stream().map(VendaDetalhe::totalVenda).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal custo = vendas.stream().anyMatch(v -> v.custoTotal() == null) ? null : vendas.stream().map(VendaDetalhe::custoTotal).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal lucro = vendas.stream().anyMatch(v -> v.lucroTotal() == null) ? null : vendas.stream().map(VendaDetalhe::lucroTotal).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        return new VendaResumo(vendas.size(), faturamento, custo, lucro);
    }

    private ItemCalculado calcularItem(Long organizacaoId, NovoItem item) {
        if (item == null) throw new DadosInvalidosException("itens", "O item da venda não pode ser nulo.");
        if (item.produtoId() == null) throw new IllegalArgumentException("Selecione um produto.");
        if (item.quantidade() == null || item.quantidade() <= 0) throw new IllegalArgumentException("A quantidade deve ser maior que zero.");
        Produto produto = produtoRepository.findByIdAndOrganizacaoId(item.produtoId(), organizacaoId)
                .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado para esta organização."));
        if (!produto.isAtivo()) throw new IllegalArgumentException("O produto " + produto.getNome() + " está inativo.");
        ProdutoService.ProdutoDetalhe detalhe = produtoService.buscar(organizacaoId, produto.getId());
        BigDecimal quantidade = BigDecimal.valueOf(item.quantidade());
        BigDecimal preco = produto.getPrecoVenda().setScale(2, RoundingMode.HALF_UP);
        BigDecimal custo = detalhe.custoEstimado();
        BigDecimal subtotal = preco.multiply(quantidade).setScale(2, RoundingMode.HALF_UP);
        BigDecimal custoSubtotal = custo == null ? null : ValidacaoFinanceira.calculado(custo.multiply(quantidade), "itens.custoSubtotal");
        BigDecimal lucroSubtotal = custoSubtotal == null ? null : ValidacaoFinanceira.calculado(subtotal.subtract(custoSubtotal), "itens.lucroSubtotal");
        ValidacaoFinanceira.calculado(subtotal, "itens.subtotal");
        return new ItemCalculado(produto, item.quantidade(), preco, custo, subtotal, custoSubtotal, lucroSubtotal);
    }

    private VendaDetalhe montarDetalhe(Venda venda) {
        List<ItemDetalhe> itens = vendaItemRepository.findByVendaIdOrderByIdAsc(venda.getId()).stream()
                .map(item -> new ItemDetalhe(item.getId(), item.getProduto().getId(), item.getProdutoNome(), item.getQuantidade(), item.getPrecoUnitario(), item.getCustoUnitario(), item.getSubtotal(), item.getCustoSubtotal(), item.getLucroSubtotal()))
                .toList();
        Cliente cliente = venda.getCliente();
        return new VendaDetalhe(venda.getId(), cliente == null ? null : cliente.getId(), cliente == null ? null : cliente.getNome(), venda.getFormaPagamento(), venda.getObservacao(), venda.getTotalVenda(), venda.getCustoTotal(), venda.getLucroTotal(), venda.getCriadoEm(), itens, venda.getStatus(), venda.getCancelamentoMotivo(), venda.getCanceladoEm(), venda.getCanceladoPor());
    }

    private String normalizarFormaPagamento(String valor) {
        String normalizada = valor == null ? "" : valor.trim().toLowerCase();
        if (!List.of("pix", "dinheiro", "debito", "credito", "outro").contains(normalizada)) throw new IllegalArgumentException("Forma de pagamento inválida.");
        return normalizada;
    }

    private String normalizarTexto(String valor) { return valor == null || valor.trim().isBlank() ? null : valor.trim(); }

    public record NovaVenda(Long organizacaoId, Long clienteId, String formaPagamento, String observacao, List<NovoItem> itens) {}
    public record NovoItem(Long produtoId, Integer quantidade) {}
    private record ItemCalculado(Produto produto, Integer quantidade, BigDecimal precoUnitario, BigDecimal custoUnitario, BigDecimal subtotal, BigDecimal custoSubtotal, BigDecimal lucroSubtotal) {}
    public record ItemDetalhe(Long id, Long produtoId, String produtoNome, Integer quantidade, BigDecimal precoUnitario, BigDecimal custoUnitario, BigDecimal subtotal, BigDecimal custoSubtotal, BigDecimal lucroSubtotal) {}
    public record VendaDetalhe(Long id, Long clienteId, String clienteNome, String formaPagamento, String observacao, BigDecimal totalVenda, BigDecimal custoTotal, BigDecimal lucroTotal, OffsetDateTime criadoEm, List<ItemDetalhe> itens, String status, String cancelamentoMotivo, OffsetDateTime canceladoEm, Long canceladoPor) {}
    public record VendaResumo(int quantidadeVendas, BigDecimal faturamento, BigDecimal custo, BigDecimal lucro) {}
}
