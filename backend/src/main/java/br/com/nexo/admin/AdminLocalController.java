package br.com.nexo.admin;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import br.com.nexo.auth.RecuperacaoAssistidaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/local")
public class AdminLocalController {
    private final AdminLocalService admin;
    private final RecuperacaoAssistidaService recuperacao;
    public AdminLocalController(AdminLocalService admin, RecuperacaoAssistidaService recuperacao) { this.admin=admin; this.recuperacao=recuperacao; }
    @GetMapping("/disponibilidade")
    public Map<String, Boolean> disponibilidade(HttpServletRequest request) { return Map.of("disponivel", admin.disponivel(request)); }
    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> entrar(HttpServletRequest request, @Valid @RequestBody Login dados) {
        String token = admin.entrar(request, dados.usuario(), dados.senha());
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie(token, 900, request.isSecure()).toString()).body(Map.of("mensagem", "Administração local aberta."));
    }
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> sair(HttpServletRequest request, @CookieValue(name=AdminLocalService.COOKIE, required=false) String token) {
        admin.sair(request, token);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie("", 0, request.isSecure()).toString()).body(Map.of("mensagem", "Administração encerrada."));
    }
    @GetMapping("/recuperacoes")
    public List<RecuperacaoAssistidaService.Pedido> pendentes(HttpServletRequest request, @CookieValue(name=AdminLocalService.COOKIE, required=false) String token) {
        admin.exigirSessao(request, token); return recuperacao.pendentes();
    }
    @PostMapping("/recuperacoes/{protocolo}")
    public Map<String, String> decidir(HttpServletRequest request, @CookieValue(name=AdminLocalService.COOKIE, required=false) String token,
            @PathVariable Long protocolo, @RequestBody Decisao decisao) {
        admin.exigirSessao(request, token); recuperacao.decidir(protocolo, decisao.aprovar(), decisao.identidadeConfirmada());
        return Map.of("mensagem", decisao.aprovar() ? "Troca liberada no navegador solicitante." : "Solicitação recusada.");
    }
    private ResponseCookie cookie(String token, int segundos, boolean seguro) {
        return ResponseCookie.from(AdminLocalService.COOKIE, token).httpOnly(true).secure(seguro).sameSite("Strict")
                .path("/api/admin/local").maxAge(Duration.ofSeconds(segundos)).build();
    }
    public record Login(@NotBlank @Size(max=100) String usuario, @NotBlank @Size(max=100) String senha) {}
    public record Decisao(boolean aprovar, boolean identidadeConfirmada) {}
}
