package br.com.nexo.saas;

import java.util.List;

import br.com.nexo.auth.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/saas")
public class SaasController {
    private static final String COOKIE = "nexo_session";

    private final SaasService saasService;
    private final AuthService authService;

    public SaasController(SaasService saasService, AuthService authService) {
        this.saasService = saasService;
        this.authService = authService;
    }

    @GetMapping
    public SaasService.ConfiguracaoSaas carregar(@CookieValue(name = COOKIE, required = false) String token) {
        return saasService.carregar(organizacaoId(token));
    }

    @PutMapping("/onboarding")
    public SaasService.ConfiguracaoSaas salvarOnboarding(
            @CookieValue(name = COOKIE, required = false) String token,
            @Valid @RequestBody OnboardingRequest request
    ) {
        return saasService.salvarOnboarding(
                organizacaoId(token),
                request.perfilUso(),
                request.objetivos(),
                request.onboardingConcluido()
        );
    }

    @PutMapping("/plano")
    public SaasService.ConfiguracaoSaas alterarPlano(
            @CookieValue(name = COOKIE, required = false) String token,
            @Valid @RequestBody PlanoRequest request
    ) {
        return saasService.alterarPlano(organizacaoId(token), request.plano());
    }

    private Long organizacaoId(String token) {
        return authService.autenticarSessao(token).organizacaoId();
    }

    public record OnboardingRequest(
            @NotBlank(message = "Escolha como pretende usar o Nexo.") String perfilUso,
            List<String> objetivos,
            boolean onboardingConcluido
    ) {}

    public record PlanoRequest(
            @NotBlank(message = "Informe o plano.") String plano
    ) {}
}
