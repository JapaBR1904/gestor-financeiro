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
        return iaService.perguntar(sessaoContexto.organizacaoId(token), request.pergunta(), Boolean.TRUE.equals(request.incluirResumo()), request.contexto());
    }

    public record PerguntaRequest(
            @NotBlank(message = "Escreva o que você quer calcular ou entender.")
            @Size(max = 3000, message = "A solicitação está muito longa.")
            String pergunta,
            Boolean incluirResumo,
            ContextoIaService.Entrada contexto
    ) {}
    @org.springframework.web.bind.annotation.GetMapping("/status")
    public IaService.StatusIa status(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token){return iaService.status(sessaoContexto.organizacaoId(token));}
    @PostMapping("/documento")
    public IaService.RespostaIa documento(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token,@Valid @RequestBody DocumentoRequest request){
        return iaService.documento(sessaoContexto.organizacaoId(token),request.documentoId(),request.pergunta(),request.autorizado());
    }
    public record DocumentoRequest(@jakarta.validation.constraints.NotNull Long documentoId,@NotBlank @Size(max=3000)String pergunta,boolean autorizado){}
}
