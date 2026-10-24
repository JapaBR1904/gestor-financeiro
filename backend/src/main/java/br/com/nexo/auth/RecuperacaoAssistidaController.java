package br.com.nexo.auth;

import java.time.Duration;
import java.util.Map;
import br.com.nexo.admin.AdminLocalService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/recuperacao/assistida")
public class RecuperacaoAssistidaController {
    private final RecuperacaoAssistidaService recuperacao;
    private final AdminLocalService admin;
    private final boolean seguro;
    public RecuperacaoAssistidaController(RecuperacaoAssistidaService recuperacao, AdminLocalService admin, @Value("${nexo.cookie.secure:false}") boolean seguro) {
        this.recuperacao = recuperacao; this.admin = admin; this.seguro = seguro;
    }
    @GetMapping("/disponibilidade")
    public Map<String, Boolean> disponibilidade(HttpServletRequest request) { return Map.of("disponivel", admin.disponivel(request)); }
    @PostMapping
    public ResponseEntity<Map<String, Object>> solicitar(HttpServletRequest request, @Valid @RequestBody AuthController.EmailRequest dados,
            @CookieValue(name="nexo_recovery", required=false) String provaAtual) {
        admin.exigirAmbiente(request);
        var solicitacao = recuperacao.solicitar(dados.email(), provaAtual);
        var cookie = ResponseCookie.from("nexo_recovery", solicitacao.prova()).httpOnly(true).secure(seguro)
                .sameSite("Strict").path("/api/auth/recuperacao").maxAge(Duration.ofMinutes(10)).build();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(Map.of("protocolo", solicitacao.protocolo(), "mensagem", "Solicitação registrada. Procure o responsável para confirmar sua identidade."));
    }
    @GetMapping
    public RecuperacaoAssistidaService.Estado consultar(HttpServletRequest request, @CookieValue(name="nexo_recovery", required=false) String prova) {
        admin.exigirAmbiente(request); return recuperacao.consultar(prova);
    }
}
