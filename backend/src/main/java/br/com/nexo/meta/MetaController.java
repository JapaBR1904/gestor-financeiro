package br.com.nexo.meta;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import br.com.nexo.auth.SessaoContexto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/metas")
public class MetaController {
    private final MetaService metaService;
    private final SessaoContexto sessaoContexto;

    public MetaController(MetaService metaService, SessaoContexto sessaoContexto) {
        this.metaService = metaService;
        this.sessaoContexto = sessaoContexto;
    }

    @GetMapping
    public List<MetaService.MetaResumo> listar(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        return metaService.listar(sessaoContexto.organizacaoId(token));
    }

    @PostMapping
    public MetaService.MetaResumo criar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @Valid @RequestBody CriarMetaRequest request
    ) {
        return metaService.criar(sessaoContexto.organizacaoId(token), request.titulo(), request.unidade(), request.valorMeta(), request.valorAtual(), request.prazo());
    }

    @PatchMapping("/{metaId}/progresso")
    public MetaService.MetaResumo atualizarProgresso(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @PathVariable Long metaId,
            @Valid @RequestBody AtualizarProgressoRequest request
    ) {
        return metaService.atualizarProgresso(sessaoContexto.organizacaoId(token), metaId, request.valorAtual());
    }

    @DeleteMapping("/{metaId}")
    public ResponseEntity<Void> arquivar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @PathVariable Long metaId
    ) {
        metaService.arquivar(sessaoContexto.organizacaoId(token), metaId);
        return ResponseEntity.noContent().build();
    }

    public record CriarMetaRequest(
            @NotBlank(message = "Informe o título da meta.")
            @Size(max = 140, message = "O título da meta deve ter no máximo 140 caracteres.") String titulo,
            @NotBlank(message = "Informe a unidade da meta.") String unidade,
            @NotNull(message = "Informe o valor da meta.") @DecimalMin(value = "0.01", message = "O valor da meta deve ser maior que zero.") BigDecimal valorMeta,
            @DecimalMin(value = "0.00", message = "O valor atual não pode ser negativo.") BigDecimal valorAtual,
            LocalDate prazo
    ) {}

    public record AtualizarProgressoRequest(
            @NotNull(message = "Informe o progresso atual.") @DecimalMin(value = "0.00", message = "O progresso atual não pode ser negativo.") BigDecimal valorAtual
    ) {}
}
