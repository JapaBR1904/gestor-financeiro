package br.com.nexo.venda;

import java.util.List;

import br.com.nexo.auth.SessaoContexto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/vendas")
public class VendaController {
    private final VendaService vendaService;
    private final SessaoContexto sessaoContexto;

    public VendaController(VendaService vendaService, SessaoContexto sessaoContexto) {
        this.vendaService = vendaService;
        this.sessaoContexto = sessaoContexto;
    }

    @GetMapping
    public List<VendaService.VendaDetalhe> listar(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        return vendaService.listar(sessaoContexto.organizacaoId(token));
    }

    @GetMapping("/resumo")
    public VendaService.VendaResumo resumo(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        return vendaService.resumo(sessaoContexto.organizacaoId(token));
    }

    @GetMapping("/{vendaId}")
    public VendaService.VendaDetalhe buscar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @PathVariable Long vendaId
    ) {
        return vendaService.buscar(sessaoContexto.organizacaoId(token), vendaId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VendaService.VendaDetalhe criar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @Valid @RequestBody CriarVendaRequest request
    ) {
        return vendaService.criar(new VendaService.NovaVenda(
                sessaoContexto.organizacaoId(token),
                request.clienteId(),
                request.formaPagamento(),
                request.observacao(),
                request.itens().stream().map(item -> new VendaService.NovoItem(item.produtoId(), item.quantidade())).toList()
        ));
    }

    public record CriarVendaRequest(
            Long clienteId,
            @NotBlank(message = "A forma de pagamento é obrigatória.") String formaPagamento,
            @Size(max = 2000, message = "A observação deve ter no máximo 2000 caracteres.") String observacao,
            @NotEmpty(message = "Adicione pelo menos um item à venda.")
            @Size(max = 100, message = "Uma venda pode ter no máximo 100 itens.") List<@NotNull(message = "O item não pode ser nulo.") @Valid CriarVendaItemRequest> itens
    ) {}

    public record CriarVendaItemRequest(
            @NotNull(message = "O produto é obrigatório.") Long produtoId,
            @NotNull(message = "A quantidade é obrigatória.") @Min(value = 1, message = "A quantidade deve ser pelo menos 1.") Integer quantidade
    ) {}
}
