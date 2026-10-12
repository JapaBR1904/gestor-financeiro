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

    public RelatorioController(RelatorioService relatorioService, SessaoContexto sessaoContexto) {
        this.relatorioService = relatorioService;
        this.sessaoContexto = sessaoContexto;
    }

    @GetMapping("/resumo")
    public RelatorioService.RelatorioResumo resumo(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        return relatorioService.gerar(sessaoContexto.organizacaoId(token));
    }
}
