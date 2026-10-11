package br.com.nexo.despesa;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
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
@RequestMapping("/api/despesas")
public class DespesaController {
    private final DespesaService despesaService;

    public DespesaController(DespesaService despesaService) {
        this.despesaService = despesaService;
    }

    @GetMapping
    public List<DespesaService.DespesaDetalhe> listar(@RequestParam Long organizacaoId) {
        return despesaService.listar(organizacaoId);
    }

    @GetMapping("/resumo")
    public DespesaService.DespesaResumo resumo(@RequestParam Long organizacaoId) {
        return despesaService.resumo(organizacaoId);
    }

    @GetMapping("/{despesaId}")
    public DespesaService.DespesaDetalhe buscar(@PathVariable Long despesaId, @RequestParam Long organizacaoId) {
        return despesaService.buscar(organizacaoId, despesaId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DespesaService.DespesaDetalhe criar(@Valid @RequestBody CriarDespesaRequest request) {
        return despesaService.criar(new DespesaService.NovaDespesa(
                request.organizacaoId(), request.descricao(), request.valor(), request.categoria(),
                request.dataDespesa(), request.formaPagamento(), request.observacao()
        ));
    }

    public record CriarDespesaRequest(
            @NotNull(message = "A organização é obrigatória.") Long organizacaoId,
            @NotBlank(message = "A descrição é obrigatória.") String descricao,
            @NotNull(message = "O valor é obrigatório.") @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero.") BigDecimal valor,
            @NotBlank(message = "A categoria é obrigatória.") String categoria,
            @NotNull(message = "A data é obrigatória.") LocalDate dataDespesa,
            @NotBlank(message = "A forma de pagamento é obrigatória.") String formaPagamento,
            String observacao
    ) {}
}
