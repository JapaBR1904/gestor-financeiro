package br.com.nexo.saas;

import java.util.List;
import java.util.UUID;

import br.com.nexo.auth.SessaoContexto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assinatura")
public class AssinaturaController {
    private final AssinaturaService service;
    private final SessaoContexto sessao;
    public AssinaturaController(AssinaturaService service, SessaoContexto sessao) { this.service = service; this.sessao = sessao; }

    @GetMapping
    public AssinaturaService.Detalhe carregar(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) { return service.carregar(sessao.usuario(token)); }
    @GetMapping("/planos")
    public List<Plano.Detalhe> planos(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) { sessao.usuario(token); return service.planos(); }
    @PostMapping("/checkout")
    public AssinaturaService.CheckoutDetalhe criar(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token, @Valid @RequestBody CriarRequest request) {
        return service.criar(sessao.usuario(token), request.plano(), request.chaveIdempotencia(), false);
    }
    @PostMapping("/cancelamento")
    public AssinaturaService.CheckoutDetalhe solicitarCancelamento(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token, @Valid @RequestBody CancelamentoRequest request) {
        return service.criar(sessao.usuario(token), "free", request.chaveIdempotencia(), true);
    }
    @GetMapping("/checkout/{id}")
    public AssinaturaService.CheckoutDetalhe buscar(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token, @PathVariable UUID id) { return service.buscar(sessao.usuario(token), id); }
    @PostMapping("/checkout/{id}/confirmar")
    public AssinaturaService.CheckoutDetalhe confirmar(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token, @PathVariable UUID id, @Valid @RequestBody ConfirmarRequest request) {
        return service.confirmar(sessao.usuario(token), id, request.metodo(), request.cenario());
    }
    @PostMapping("/checkout/{id}/cancelar")
    public AssinaturaService.CheckoutDetalhe cancelar(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token, @PathVariable UUID id) { return service.cancelarCheckout(sessao.usuario(token), id); }

    public record CriarRequest(@NotBlank(message = "Escolha um plano.") String plano, @NotNull(message = "Identifique a solicitação.") UUID chaveIdempotencia) {}
    public record CancelamentoRequest(@NotNull(message = "Identifique a solicitação.") UUID chaveIdempotencia) {}
    public record ConfirmarRequest(@NotNull(message = "Escolha um método de pagamento.") ProvedorPagamento.Metodo metodo,
                                   @NotNull(message = "Escolha o resultado da simulação.") ProvedorPagamento.Cenario cenario) {}
}
