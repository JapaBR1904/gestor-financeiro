package br.com.nexo.produto;

import java.math.BigDecimal;
import java.util.List;

import br.com.nexo.auth.SessaoContexto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/produtos")
public class ProdutoController {
    private final ProdutoService produtoService;
    private final SessaoContexto sessaoContexto;

    public ProdutoController(ProdutoService produtoService, SessaoContexto sessaoContexto) {
        this.produtoService = produtoService;
        this.sessaoContexto = sessaoContexto;
    }

    @GetMapping
    public List<ProdutoService.ProdutoDetalhe> listar(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        return produtoService.listar(sessaoContexto.organizacaoId(token));
    }

    @GetMapping("/{produtoId}")
    public ProdutoService.ProdutoDetalhe buscar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @PathVariable Long produtoId
    ) {
        return produtoService.buscar(sessaoContexto.organizacaoId(token), produtoId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProdutoService.ProdutoDetalhe criar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @Valid @RequestBody CriarProdutoRequest request
    ) {
        return produtoService.criar(mapearProduto(sessaoContexto.organizacaoId(token), request));
    }

    @PutMapping("/{produtoId}")
    public ProdutoService.ProdutoDetalhe atualizar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @PathVariable Long produtoId,
            @Valid @RequestBody CriarProdutoRequest request
    ) {
        return produtoService.atualizar(produtoId, mapearProduto(sessaoContexto.organizacaoId(token), request));
    }

    @PatchMapping("/{produtoId}/status")
    public ProdutoService.ProdutoDetalhe alterarStatus(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @PathVariable Long produtoId,
            @Valid @RequestBody AlterarStatusRequest request
    ) {
        return produtoService.alterarStatus(sessaoContexto.organizacaoId(token), produtoId, request.ativo());
    }

    private ProdutoService.NovoProduto mapearProduto(Long organizacaoId, CriarProdutoRequest request) {
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

        return new ProdutoService.NovoProduto(
                organizacaoId,
                request.nome(),
                request.descricao(),
                request.precoVenda(),
                ingredientes
        );
    }

    public record CriarProdutoRequest(
            @NotBlank(message = "O nome do produto é obrigatório.")
            @Size(max = 160, message = "O nome do produto deve ter no máximo 160 caracteres.")
            String nome,
            @Size(max = 2000, message = "A descrição deve ter no máximo 2000 caracteres.")
            String descricao,
            @NotNull(message = "O preço de venda é obrigatório.")
            @DecimalMin(value = "0.01", message = "O preço de venda deve ser maior que zero.")
            BigDecimal precoVenda,
            @NotNull(message = "A lista de ingredientes é obrigatória.")
            @Size(max = 100, message = "Um produto pode ter no máximo 100 ingredientes.")
            List<@NotNull(message = "O ingrediente não pode ser nulo.") @Valid CriarIngredienteRequest> ingredientes
    ) {}

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
    ) {}

    public record AlterarStatusRequest(boolean ativo) {}
}
