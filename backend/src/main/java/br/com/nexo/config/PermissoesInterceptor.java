package br.com.nexo.config;

import br.com.nexo.auth.SessaoContexto;
import br.com.nexo.organizacao.PoliticaOrganizacao;
import br.com.nexo.saas.AcessoPlanoService;
import br.com.nexo.saas.RecursoPlano;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** Política comum aos módulos financeiros: o membro registra operação, a gestão altera estrutura. */
@Component
public class PermissoesInterceptor implements HandlerInterceptor {
    private final SessaoContexto sessao;
    private final PoliticaOrganizacao politica;
    private final AcessoPlanoService planos;
    public PermissoesInterceptor(SessaoContexto sessao, PoliticaOrganizacao politica, AcessoPlanoService planos) {
        this.sessao = sessao; this.politica = politica; this.planos = planos;
    }
    @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (request.getMethod().equals("OPTIONS")) return true;
        String token = null;
        if (request.getCookies() != null) for (var cookie : request.getCookies()) if (cookie.getName().equals(SessaoContexto.COOKIE)) token = cookie.getValue();
        var usuario = sessao.usuario(token);
        if (!usuario.papel().equals("proprietario")) planos.exigir(usuario.organizacaoId(), RecursoPlano.EQUIPE);
        boolean leitura = request.getMethod().equals("GET") || request.getMethod().equals("HEAD");
        boolean registro = request.getMethod().equals("POST") && request.getRequestURI().matches("/api/(vendas|despesas|clientes|financeiro/movimentacoes)");
        boolean consultaIa = request.getMethod().equals("POST") && request.getRequestURI().equals("/api/ia/perguntar");
        if (!leitura && !registro && !consultaIa) politica.exigirGestao(usuario);
        return true;
    }
}
