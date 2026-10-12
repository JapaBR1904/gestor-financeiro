package br.com.nexo.auth;

import java.time.Duration;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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

    @PostMapping("/cadastro")
    public Map<String, Object> cadastrar(@Valid @RequestBody CadastroRequest request) {
        authService.cadastrar(request.nome(), request.email(), request.senha(), request.confirmacaoSenha());
        return codigoEnviado();
    }

    @PostMapping("/login")
    public ResponseEntity<AuthService.UsuarioAutenticado> login(@Valid @RequestBody LoginRequest request) {
        return respostaSessao(authService.login(request.email(), request.senha()));
    }

    @PostMapping("/recuperacao")
    public Map<String, Object> recuperar(@Valid @RequestBody EmailRequest request) {
        authService.solicitarCodigo(request.email(), "recuperacao_senha");
        return Map.of("mensagem", "Se existir uma conta com este e-mail, enviaremos um código de recuperação.",
                "reenviarEmSegundos", 45, "expiraEmMinutos", 10);
    }

    @PostMapping("/recuperacao/verificar")
    public ResponseEntity<Map<String, String>> verificarRecuperacao(@Valid @RequestBody RecuperacaoRequest request) {
        String prova = authService.verificarRecuperacao(request.email(), request.codigo());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieRecuperacao(prova, Duration.ofMinutes(10)).toString())
                .body(Map.of("mensagem", "Código confirmado. Defina sua nova senha."));
    }

    @PostMapping("/recuperacao/redefinir")
    public ResponseEntity<Map<String, String>> redefinirSenha(
            @CookieValue(name = "nexo_recovery", required = false) String prova,
            @Valid @RequestBody SenhaRequest request) {
        authService.redefinirSenha(prova, request.senha(), request.confirmacaoSenha());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieRecuperacao("", Duration.ZERO).toString())
                .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                .body(Map.of("mensagem", "Senha atualizada. Entre com sua nova senha."));
    }

    private ResponseCookie cookieRecuperacao(String valor, Duration duracao) {
        return ResponseCookie.from("nexo_recovery", valor).httpOnly(true).secure(cookieSecure)
                .sameSite("Strict").path("/api/auth/recuperacao").maxAge(duracao).build();
    }

    private Map<String, Object> codigoEnviado() {
        return Map.of("mensagem", "Código enviado. Ele expira em 10 minutos.",
                "expiraEmMinutos", 10, "reenviarEmSegundos", 45);
    }

    @PostMapping("/codigo")
    public Map<String, Object> solicitarCodigo(@Valid @RequestBody SolicitarCodigoRequest request) {
        authService.solicitarCodigo(request.email(), request.finalidade());
        if ("recuperacao_senha".equals(request.finalidade())) {
            return Map.of("mensagem", "Se existir uma conta com este e-mail, enviaremos um código de recuperação.",
                    "expiraEmMinutos", 10, "reenviarEmSegundos", 45);
        }
        return codigoEnviado();
    }

    @PostMapping("/verificar")
    public ResponseEntity<AuthService.UsuarioAutenticado> verificar(@Valid @RequestBody VerificarCodigoRequest request) {
        return respostaSessao(authService.verificarCodigo(request.email(), request.codigo(), request.finalidade()));
    }

    private ResponseEntity<AuthService.UsuarioAutenticado> respostaSessao(AuthService.ResultadoAutenticacao resultado) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(resultado.token(), Duration.ofDays(30)).toString())
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
            @NotBlank(message = "O e-mail é obrigatório.") @Email(message = "Informe um e-mail válido.") @Size(max = 180, message = "O e-mail é muito longo.") String email,
            @NotBlank(message = "A finalidade é obrigatória.") String finalidade
    ) {}

    public record VerificarCodigoRequest(
            @NotBlank(message = "O e-mail é obrigatório.") @Email(message = "Informe um e-mail válido.") @Size(max = 180, message = "O e-mail é muito longo.") String email,
            @NotBlank(message = "O código é obrigatório.") @Pattern(regexp = "\\d{6}", message = "Informe o código de 6 dígitos.") String codigo,
            @NotBlank(message = "A finalidade é obrigatória.") String finalidade
    ) {}
    public record CadastroRequest(
            @NotBlank(message = "Informe seu nome.") @Size(max = 160, message = "O nome é muito longo.") String nome,
            @NotBlank(message = "Informe seu e-mail.") @Email(message = "Informe um e-mail válido.") @Size(max = 180, message = "O e-mail é muito longo.") String email,
            @NotBlank(message = "Informe sua senha.") @Size(max = 72, message = "A senha é muito longa.") String senha,
            @NotBlank(message = "Confirme sua senha.") @Size(max = 72, message = "A senha é muito longa.") String confirmacaoSenha
    ) {}

    public record LoginRequest(@NotBlank(message = "Informe seu e-mail.") @Email(message = "Informe um e-mail válido.") @Size(max = 180, message = "O e-mail é muito longo.") String email, @NotBlank(message = "Informe sua senha.") @Size(max = 72, message = "A senha é muito longa.") String senha) {}
    public record EmailRequest(@NotBlank(message = "Informe seu e-mail.") @Email(message = "Informe um e-mail válido.") @Size(max = 180, message = "O e-mail é muito longo.") String email) {}
    public record RecuperacaoRequest(
            @NotBlank(message = "Informe seu e-mail.") @Email(message = "Informe um e-mail válido.") @Size(max = 180, message = "O e-mail é muito longo.") String email,
            @NotBlank(message = "Informe o código.") @Pattern(regexp = "\\d{6}", message = "Informe o código de 6 dígitos.") String codigo
    ) {}
    public record SenhaRequest(@NotBlank(message = "Informe sua senha.") @Size(max = 72, message = "A senha é muito longa.") String senha, @NotBlank(message = "Confirme sua senha.") @Size(max = 72, message = "A senha é muito longa.") String confirmacaoSenha) {}

}
