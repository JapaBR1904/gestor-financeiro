package br.com.nexo.auth;

import java.time.Duration;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final String COOKIE = "nexo_session";
    private final AuthService authService;
    private final SessaoContexto sessaoContexto;
    private final boolean cookieSecure;

    public AuthController(
            AuthService authService,
            SessaoContexto sessaoContexto,
            @Value("${nexo.cookie.secure:false}") boolean cookieSecure
    ) {
        this.authService = authService;
        this.sessaoContexto = sessaoContexto;
        this.cookieSecure = cookieSecure;
    }

    @PostMapping("/codigo")
    public Map<String, Object> solicitarCodigo(@Valid @RequestBody SolicitarCodigoRequest request) {
        authService.solicitarCodigo(request.email(), request.finalidade());
        return Map.of(
                "mensagem", "Código enviado. Ele expira em 10 minutos.",
                "expiraEmMinutos", 10,
                "reenviarEmSegundos", 45
        );
    }

    @PostMapping("/verificar")
    public ResponseEntity<AuthService.UsuarioAutenticado> verificar(@Valid @RequestBody VerificarCodigoRequest request) {
        AuthService.ResultadoAutenticacao resultado = authService.verificarCodigo(
                request.email(), request.codigo(), request.finalidade(), request.nome(), request.organizacaoNome()
        );

        ResponseCookie cookie = cookie(resultado.token(), Duration.ofDays(30));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(resultado.usuario());
    }

    @GetMapping("/me")
    public AuthService.UsuarioAutenticado me(@CookieValue(name = COOKIE, required = false) String token) {
        return sessaoContexto.usuario(token);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(@CookieValue(name = COOKIE, required = false) String token) {
        authService.encerrarSessao(token);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                .body(Map.of("mensagem", "Sessão encerrada."));
    }

    private ResponseCookie cookie(String valor, Duration duracao) {
        return ResponseCookie.from(COOKIE, valor)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(duracao)
                .build();
    }

    public record SolicitarCodigoRequest(
            @NotBlank(message = "O e-mail é obrigatório.") @Email(message = "Informe um e-mail válido.") String email,
            @NotBlank(message = "A finalidade é obrigatória.") String finalidade
    ) {}

    public record VerificarCodigoRequest(
            @NotBlank(message = "O e-mail é obrigatório.") @Email(message = "Informe um e-mail válido.") String email,
            @NotBlank(message = "O código é obrigatório.") @Pattern(regexp = "\\d{6}", message = "Informe o código de 6 dígitos.") String codigo,
            @NotBlank(message = "A finalidade é obrigatória.") String finalidade,
            String nome,
            String organizacaoNome
    ) {}
}
