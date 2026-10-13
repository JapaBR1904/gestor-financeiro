package br.com.nexo.financeiro;

import java.time.LocalDate;
import br.com.nexo.auth.SessaoContexto;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/financeiro")
public class FinanceiroController {
    private final FinanceiroService service;
    private final SessaoContexto sessao;
    public FinanceiroController(FinanceiroService service, SessaoContexto sessao) { this.service = service; this.sessao = sessao; }
    @GetMapping("/resumo") public FinanceiroService.Resumo resumo(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fim) { return service.resumo(sessao.organizacaoId(token), inicio, fim); }
    @GetMapping("/analise") public FinanceiroService.Analise analise(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fim) { return service.analise(sessao.organizacaoId(token), inicio, fim); }
    @PostMapping("/movimentacoes") public FinanceiroService.Movimentacao criar(@CookieValue(name = SessaoContexto.COOKIE, required=false) String token,
            @RequestHeader(name="Idempotency-Key",required=false) java.util.UUID chave,
            @RequestBody FinanceiroService.Lancamento dados) { return service.salvar(sessao.organizacaoId(token), null, dados, chave); }
    @PutMapping("/movimentacoes/{id}") public FinanceiroService.Movimentacao editar(@CookieValue(name = SessaoContexto.COOKIE, required=false) String token,
            @PathVariable Long id, @RequestBody FinanceiroService.Lancamento dados) { return service.salvar(sessao.organizacaoId(token), id, dados); }
    @DeleteMapping("/movimentacoes/{id}") public ResponseEntity<Void> remover(@CookieValue(name = SessaoContexto.COOKIE, required=false) String token,
            @PathVariable Long id) { service.remover(sessao.organizacaoId(token), id); return ResponseEntity.noContent().build(); }
    @GetMapping("/exportar") public ResponseEntity<byte[]> exportar(@CookieValue(name = SessaoContexto.COOKIE, required=false) String token,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fim) {
        return ResponseEntity.ok().header("Content-Type", "text/csv; charset=UTF-8")
                .header("Content-Disposition", "attachment; filename=\"nexo-movimentacoes-" + LocalDate.now() + ".csv\"")
                .body(service.exportar(sessao.organizacaoId(token), inicio, fim).getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
