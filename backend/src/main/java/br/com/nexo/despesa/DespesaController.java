package br.com.nexo.despesa;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import br.com.nexo.auth.SessaoContexto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/despesas")
public class DespesaController {
    private final DespesaService despesaService;
    private final SessaoContexto sessaoContexto;

    public DespesaController(DespesaService despesaService, SessaoContexto sessaoContexto) {
        this.despesaService = despesaService;
        this.sessaoContexto = sessaoContexto;
    }

    @GetMapping
    public List<DespesaService.DespesaDetalhe> listar(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        return despesaService.listar(sessaoContexto.organizacaoId(token));
    }

    @GetMapping("/resumo")
    public DespesaService.DespesaResumo resumo(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        return despesaService.resumo(sessaoContexto.organizacaoId(token));
    }

    @GetMapping("/{despesaId}")
    public DespesaService.DespesaDetalhe buscar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @PathVariable Long despesaId
    ) {
        return despesaService.buscar(sessaoContexto.organizacaoId(token), despesaId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DespesaService.DespesaDetalhe criar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @Valid @RequestBody DespesaRequest request
    ) {
        return despesaService.criar(mapear(sessaoContexto.organizacaoId(token), request));
    }

    @PutMapping("/{despesaId}")
    public DespesaService.DespesaDetalhe atualizar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @PathVariable Long despesaId,
            @Valid @RequestBody DespesaRequest request
    ) {
        Long organizacaoId = sessaoContexto.organizacaoId(token);
        return despesaService.atualizar(organizacaoId, despesaId, mapear(organizacaoId, request));
    }

    @DeleteMapping("/{despesaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @PathVariable Long despesaId
    ) {
        despesaService.excluir(sessaoContexto.organizacaoId(token), despesaId);
    }

    private DespesaService.NovaDespesa mapear(Long organizacaoId, DespesaRequest request) {
        return new DespesaService.NovaDespesa(
                organizacaoId,
                request.descricao(),
                request.valor(),
                request.categoria(),
                request.dataDespesa(),
                request.formaPagamento(),
                request.observacao()
        );
    }

    public record DespesaRequest(
            @NotBlank(message = "A descrição é obrigatória.")
            @Size(max = 180, message = "A descrição deve ter no máximo 180 caracteres.") String descricao,
            @NotNull(message = "O valor é obrigatório.")
            @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero.") BigDecimal valor,
            @NotBlank(message = "A categoria é obrigatória.")
            @Size(max = 80, message = "A categoria deve ter no máximo 80 caracteres.") String categoria,
            @NotNull(message = "A data é obrigatória.") LocalDate dataDespesa,
            @NotBlank(message = "A forma de pagamento é obrigatória.") String formaPagamento,
            @Size(max = 2000, message = "A observação deve ter no máximo 2000 caracteres.") String observacao
    ) {}
}
