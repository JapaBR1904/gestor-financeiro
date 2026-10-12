package br.com.nexo.relatorio;

import br.com.nexo.auth.SessaoContexto;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/relatorios")
public class RelatorioController {
    private final RelatorioService relatorioService;
    private final SessaoContexto sessaoContexto;
    private final br.com.nexo.saas.AcessoPlanoService acessoPlano;

    public RelatorioController(RelatorioService relatorioService, SessaoContexto sessaoContexto, br.com.nexo.saas.AcessoPlanoService acessoPlano) {
        this.relatorioService = relatorioService;
        this.sessaoContexto = sessaoContexto;
        this.acessoPlano = acessoPlano;
    }

    @GetMapping("/fluxo-caixa")
    public RelatorioService.RelatorioResumo fluxoCaixa(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        Long organizacaoId = sessaoContexto.organizacaoId(token);
        acessoPlano.exigir(organizacaoId, br.com.nexo.saas.RecursoPlano.FLUXO_CAIXA);
        return relatorioService.gerar(organizacaoId);
    }

    @GetMapping("/resumo")
    public RelatorioService.RelatorioResumo resumo(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        return relatorioService.gerar(sessaoContexto.organizacaoId(token));
    }
}
