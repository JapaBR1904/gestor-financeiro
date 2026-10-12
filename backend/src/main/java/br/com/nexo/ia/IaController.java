package br.com.nexo.ia;

import br.com.nexo.auth.SessaoContexto;
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
    private final IaService iaService;
    private final SessaoContexto sessaoContexto;

    public IaController(IaService iaService, SessaoContexto sessaoContexto) {
        this.iaService = iaService;
        this.sessaoContexto = sessaoContexto;
    }

    @PostMapping("/perguntar")
    public IaService.RespostaIa perguntar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @Valid @RequestBody PerguntaRequest request
    ) {
        return iaService.perguntar(sessaoContexto.organizacaoId(token), request.pergunta());
    }

    public record PerguntaRequest(
            @NotBlank(message = "Escreva o que você quer calcular ou entender.")
            @Size(max = 3000, message = "A solicitação está muito longa.")
            String pergunta
    ) {}
}
