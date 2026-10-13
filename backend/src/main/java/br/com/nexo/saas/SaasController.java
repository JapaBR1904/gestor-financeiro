package br.com.nexo.saas;

import java.util.List;

import br.com.nexo.auth.SessaoContexto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/saas")
public class SaasController {
    private final SaasService saasService;
    private final SessaoContexto sessaoContexto;
    private final AcessoPlanoService acessoPlano;
    private final AssinaturaRepository assinaturas;
    private final br.com.nexo.organizacao.PoliticaOrganizacao politica;

    public SaasController(SaasService saasService, SessaoContexto sessaoContexto, AcessoPlanoService acessoPlano, AssinaturaRepository assinaturas, br.com.nexo.organizacao.PoliticaOrganizacao politica) {
        this.saasService = saasService;
        this.sessaoContexto = sessaoContexto;
        this.acessoPlano = acessoPlano;
        this.assinaturas = assinaturas;
        this.politica = politica;
    }

    @GetMapping
    public SaasService.ConfiguracaoSaas carregar(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        return saasService.carregar(sessaoContexto.organizacaoId(token));
    }

    @PutMapping("/onboarding")
    public SaasService.ConfiguracaoSaas salvarOnboarding(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @Valid @RequestBody OnboardingRequest request
    ) {
        politica.exigirGestao(sessaoContexto.usuario(token));
        return saasService.salvarOnboarding(
                sessaoContexto.organizacaoId(token),
                request.perfilUso(),
                request.objetivos(),
                request.onboardingConcluido()
        );
    }

    @GetMapping("/equipe")
    public List<AssinaturaRepository.Membro> equipe(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        Long organizacaoId = sessaoContexto.organizacaoId(token);
        acessoPlano.exigir(organizacaoId, RecursoPlano.EQUIPE);
        return assinaturas.membros(organizacaoId);
    }

    @PutMapping("/plano")
    public SaasService.ConfiguracaoSaas alterarPlano(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @Valid @RequestBody PlanoRequest request
    ) {
        return saasService.alterarPlano(sessaoContexto.organizacaoId(token), request.plano());
    }

    public record OnboardingRequest(
            @NotBlank(message = "Escolha como pretende usar o Nexo.") String perfilUso,
            @Size(max = 12, message = "Escolha no máximo 12 objetivos.") List<@Size(max = 120, message = "Objetivo muito longo.") String> objetivos,
            boolean onboardingConcluido
    ) {}

    public record PlanoRequest(@NotBlank(message = "Informe o plano.") String plano) {}
}
