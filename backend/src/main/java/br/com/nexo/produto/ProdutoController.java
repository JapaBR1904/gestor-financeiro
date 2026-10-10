package br.com.nexo.produto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/produtos")
public class ProdutoController {

    private final ProdutoService produtoService;

    public ProdutoController(ProdutoService produtoService) {
        this.produtoService = produtoService;
    }

    @GetMapping
    public List<ProdutoService.ProdutoDetalhe> listar(@RequestParam Long organizacaoId) {
        return produtoService.listar(organizacaoId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProdutoService.ProdutoDetalhe criar(@Valid @RequestBody CriarProdutoRequest request) {
        List<ProdutoService.NovoIngrediente> ingredientes = request.ingredientes().stream()
                .map(item -> new ProdutoService.NovoIngrediente(
                        item.nome(),
                        item.precoCompra(),
                        item.quantidadeCompra(),
                        item.unidadeCompra(),
                        item.quantidadeUsada(),
                        item.unidadeUso()
                ))
                .toList();

        return produtoService.criar(new ProdutoService.NovoProduto(
                request.organizacaoId(),
                request.nome(),
                request.descricao(),
                request.precoVenda(),
                ingredientes
        ));
    }

    public record CriarProdutoRequest(
            @NotNull(message = "A organização é obrigatória.") Long organizacaoId,
            @NotBlank(message = "O nome do produto é obrigatório.")
            @Size(max = 160, message = "O nome do produto deve ter no máximo 160 caracteres.")
            String nome,
            String descricao,
            @NotNull(message = "O preço de venda é obrigatório.")
            @DecimalMin(value = "0.01", message = "O preço de venda deve ser maior que zero.")
            BigDecimal precoVenda,
            @NotNull(message = "A lista de ingredientes é obrigatória.")
            List<@Valid CriarIngredienteRequest> ingredientes
    ) {
    }

    public record CriarIngredienteRequest(
            @NotBlank(message = "O nome do ingrediente é obrigatório.")
            @Size(max = 160, message = "O nome do ingrediente deve ter no máximo 160 caracteres.")
            String nome,
            @NotNull(message = "O preço de compra é obrigatório.")
            @DecimalMin(value = "0.00", message = "O preço de compra não pode ser negativo.")
            BigDecimal precoCompra,
            @NotNull(message = "A quantidade comprada é obrigatória.")
            @DecimalMin(value = "0.0001", message = "A quantidade comprada deve ser maior que zero.")
            BigDecimal quantidadeCompra,
            @NotBlank(message = "A unidade de compra é obrigatória.") String unidadeCompra,
            @NotNull(message = "A quantidade usada é obrigatória.")
            @DecimalMin(value = "0.0001", message = "A quantidade usada deve ser maior que zero.")
            BigDecimal quantidadeUsada,
            @NotBlank(message = "A unidade de uso é obrigatória.") String unidadeUso
    ) {
    }
}
