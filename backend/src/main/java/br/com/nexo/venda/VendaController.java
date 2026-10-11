package br.com.nexo.venda;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/vendas")
public class VendaController {
    private final VendaService vendaService;

    public VendaController(VendaService vendaService) {
        this.vendaService = vendaService;
    }

    @GetMapping
    public List<VendaService.VendaDetalhe> listar(@RequestParam Long organizacaoId) {
        return vendaService.listar(organizacaoId);
    }

    @GetMapping("/resumo")
    public VendaService.VendaResumo resumo(@RequestParam Long organizacaoId) {
        return vendaService.resumo(organizacaoId);
    }

    @GetMapping("/{vendaId}")
    public VendaService.VendaDetalhe buscar(@PathVariable Long vendaId, @RequestParam Long organizacaoId) {
        return vendaService.buscar(organizacaoId, vendaId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VendaService.VendaDetalhe criar(@Valid @RequestBody CriarVendaRequest request) {
        return vendaService.criar(new VendaService.NovaVenda(
                request.organizacaoId(),
                request.clienteId(),
                request.formaPagamento(),
                request.observacao(),
                request.itens().stream().map(item -> new VendaService.NovoItem(item.produtoId(), item.quantidade())).toList()
        ));
    }

    public record CriarVendaRequest(
            @NotNull(message = "A organização é obrigatória.") Long organizacaoId,
            Long clienteId,
            @NotBlank(message = "A forma de pagamento é obrigatória.") String formaPagamento,
            String observacao,
            @NotEmpty(message = "Adicione pelo menos um item à venda.") List<@Valid CriarVendaItemRequest> itens
    ) {}

    public record CriarVendaItemRequest(
            @NotNull(message = "O produto é obrigatório.") Long produtoId,
            @NotNull(message = "A quantidade é obrigatória.") @Min(value = 1, message = "A quantidade deve ser pelo menos 1.") Integer quantidade
    ) {}
}
