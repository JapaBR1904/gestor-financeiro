package br.com.nexo.produto;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.List;

import br.com.nexo.organizacao.Organizacao;
import br.com.nexo.organizacao.OrganizacaoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProdutoService {

    private static final MathContext CALCULO = new MathContext(16, RoundingMode.HALF_UP);

    private final OrganizacaoService organizacaoService;
    private final ProdutoRepository produtoRepository;
    private final IngredienteRepository ingredienteRepository;
    private final ProdutoIngredienteRepository produtoIngredienteRepository;

    public ProdutoService(
            OrganizacaoService organizacaoService,
            ProdutoRepository produtoRepository,
            IngredienteRepository ingredienteRepository,
            ProdutoIngredienteRepository produtoIngredienteRepository
    ) {
        this.organizacaoService = organizacaoService;
        this.produtoRepository = produtoRepository;
        this.ingredienteRepository = ingredienteRepository;
        this.produtoIngredienteRepository = produtoIngredienteRepository;
    }

    @Transactional
    public ProdutoDetalhe criar(NovoProduto dados) {
        validarProduto(dados);

        Organizacao organizacao = organizacaoService.buscarPorId(dados.organizacaoId());

        Produto produto = produtoRepository.save(new Produto(
                organizacao,
                dados.nome().trim(),
                normalizarTextoOpcional(dados.descricao()),
                dados.precoVenda().setScale(2, RoundingMode.HALF_UP)
        ));

        for (NovoIngrediente item : dados.ingredientes()) {
            validarIngrediente(item);

            Ingrediente ingrediente = ingredienteRepository.save(new Ingrediente(
                    organizacao,
                    item.nome().trim(),
                    item.precoCompra().setScale(2, RoundingMode.HALF_UP),
                    item.quantidadeCompra().setScale(4, RoundingMode.HALF_UP),
                    normalizarUnidade(item.unidadeCompra())
            ));

            produtoIngredienteRepository.save(new ProdutoIngrediente(
                    organizacao,
                    produto,
                    ingrediente,
                    item.quantidadeUsada().setScale(4, RoundingMode.HALF_UP),
                    normalizarUnidade(item.unidadeUso())
            ));
        }

        return montarDetalhe(produto);
    }

    @Transactional(readOnly = true)
    public List<ProdutoDetalhe> listar(Long organizacaoId) {
        organizacaoService.buscarPorId(organizacaoId);

        return produtoRepository.findByOrganizacaoIdOrderByNomeAsc(organizacaoId).stream()
                .map(this::montarDetalhe)
                .toList();
    }

    private ProdutoDetalhe montarDetalhe(Produto produto) {
        List<ProdutoIngrediente> vinculos = produtoIngredienteRepository.findByProdutoId(produto.getId());

        List<IngredienteDetalhe> ingredientes = vinculos.stream()
                .map(vinculo -> {
                    BigDecimal custo = calcularCustoIngrediente(vinculo);
                    Ingrediente ingrediente = vinculo.getIngrediente();

                    return new IngredienteDetalhe(
                            ingrediente.getId(),
                            ingrediente.getNome(),
                            ingrediente.getPrecoCompra(),
                            ingrediente.getQuantidadeCompra(),
                            ingrediente.getUnidadeCompra(),
                            vinculo.getQuantidadeUsada(),
                            vinculo.getUnidadeUso(),
                            custo
                    );
                })
                .toList();

        BigDecimal custoEstimado = ingredientes.stream()
                .map(IngredienteDetalhe::custoNoProduto)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal lucroEstimado = produto.getPrecoVenda()
                .subtract(custoEstimado)
                .setScale(2, RoundingMode.HALF_UP);

        return new ProdutoDetalhe(
                produto.getId(),
                produto.getNome(),
                produto.getDescricao(),
                produto.getPrecoVenda(),
                custoEstimado,
                lucroEstimado,
                produto.isAtivo(),
                ingredientes
        );
    }

    private BigDecimal calcularCustoIngrediente(ProdutoIngrediente vinculo) {
        Ingrediente ingrediente = vinculo.getIngrediente();

        String unidadeCompra = normalizarUnidade(ingrediente.getUnidadeCompra());
        String unidadeUso = normalizarUnidade(vinculo.getUnidadeUso());

        if (!familia(unidadeCompra).equals(familia(unidadeUso))) {
            throw new IllegalArgumentException("As unidades de compra e uso do ingrediente são incompatíveis.");
        }

        BigDecimal quantidadeCompraBase = ingrediente.getQuantidadeCompra()
                .multiply(fatorParaBase(unidadeCompra), CALCULO);
        BigDecimal quantidadeUsoBase = vinculo.getQuantidadeUsada()
                .multiply(fatorParaBase(unidadeUso), CALCULO);

        return ingrediente.getPrecoCompra()
                .multiply(quantidadeUsoBase, CALCULO)
                .divide(quantidadeCompraBase, CALCULO)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private void validarProduto(NovoProduto dados) {
        if (dados == null || dados.organizacaoId() == null) {
            throw new IllegalArgumentException("A organização é obrigatória.");
        }
        if (dados.nome() == null || dados.nome().trim().isBlank()) {
            throw new IllegalArgumentException("O nome do produto é obrigatório.");
        }
        if (dados.precoVenda() == null || dados.precoVenda().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("O preço de venda deve ser maior que zero.");
        }
        if (dados.ingredientes() == null) {
            throw new IllegalArgumentException("A lista de ingredientes não pode ser nula.");
        }
    }

    private void validarIngrediente(NovoIngrediente item) {
        if (item.nome() == null || item.nome().trim().isBlank()) {
            throw new IllegalArgumentException("O nome do ingrediente é obrigatório.");
        }
        if (item.precoCompra() == null || item.precoCompra().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("O preço de compra do ingrediente não pode ser negativo.");
        }
        if (item.quantidadeCompra() == null || item.quantidadeCompra().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("A quantidade comprada deve ser maior que zero.");
        }
        if (item.quantidadeUsada() == null || item.quantidadeUsada().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("A quantidade usada deve ser maior que zero.");
        }

        String compra = normalizarUnidade(item.unidadeCompra());
        String uso = normalizarUnidade(item.unidadeUso());

        if (!familia(compra).equals(familia(uso))) {
            throw new IllegalArgumentException("As unidades de compra e uso do ingrediente são incompatíveis.");
        }
    }

    private String normalizarUnidade(String unidade) {
        String normalizada = unidade == null ? "" : unidade.trim().toLowerCase();

        if (!List.of("kg", "g", "l", "ml", "un").contains(normalizada)) {
            throw new IllegalArgumentException("Unidade inválida. Use kg, g, l, ml ou un.");
        }

        return normalizada;
    }

    private String familia(String unidade) {
        return switch (unidade) {
            case "kg", "g" -> "massa";
            case "l", "ml" -> "volume";
            case "un" -> "unidade";
            default -> throw new IllegalArgumentException("Unidade inválida.");
        };
    }

    private BigDecimal fatorParaBase(String unidade) {
        return switch (unidade) {
            case "kg", "l" -> BigDecimal.valueOf(1000);
            case "g", "ml", "un" -> BigDecimal.ONE;
            default -> throw new IllegalArgumentException("Unidade inválida.");
        };
    }

    private String normalizarTextoOpcional(String valor) {
        if (valor == null || valor.trim().isBlank()) return null;
        return valor.trim();
    }

    public record NovoProduto(
            Long organizacaoId,
            String nome,
            String descricao,
            BigDecimal precoVenda,
            List<NovoIngrediente> ingredientes
    ) {
    }

    public record NovoIngrediente(
            String nome,
            BigDecimal precoCompra,
            BigDecimal quantidadeCompra,
            String unidadeCompra,
            BigDecimal quantidadeUsada,
            String unidadeUso
    ) {
    }

    public record ProdutoDetalhe(
            Long id,
            String nome,
            String descricao,
            BigDecimal precoVenda,
            BigDecimal custoEstimado,
            BigDecimal lucroEstimado,
            boolean ativo,
            List<IngredienteDetalhe> ingredientes
    ) {
    }

    public record IngredienteDetalhe(
            Long id,
            String nome,
            BigDecimal precoCompra,
            BigDecimal quantidadeCompra,
            String unidadeCompra,
            BigDecimal quantidadeUsada,
            String unidadeUso,
            BigDecimal custoNoProduto
    ) {
    }
}
