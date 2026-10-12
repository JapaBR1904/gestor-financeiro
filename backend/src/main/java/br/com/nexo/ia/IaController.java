package br.com.nexo.ia;

import br.com.nexo.auth.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ia")
public class IaController {
    private static final String COOKIE = "nexo_session";

    private final IaService iaService;
    private final AuthService authService;

    public IaController(IaService iaService, AuthService authService) {
        this.iaService = iaService;
        this.authService = authService;
    }

    @PostMapping("/perguntar")
    public IaService.RespostaIa perguntar(
            @CookieValue(name = COOKIE, required = false) String token,
            @Valid @RequestBody PerguntaRequest request
    ) {
        Long organizacaoId = authService.autenticarSessao(token).organizacaoId();
        return iaService.perguntar(organizacaoId, request.pergunta());
    }

    public record PerguntaRequest(
            @NotBlank(message = "Escreva o que você quer calcular ou entender.")
            @Size(max = 3000, message = "A solicitação está muito longa.")
            String pergunta
    ) {}
}
