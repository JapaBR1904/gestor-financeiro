package br.com.nexo.config;

import br.com.nexo.auth.SessaoContexto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** O espaço informado é uma pré-condição, nunca uma autorização de acesso. */
@Component
public class ContextoOrganizacaoInterceptor implements HandlerInterceptor {
    private final SessaoContexto sessao;
    public ContextoOrganizacaoInterceptor(SessaoContexto sessao) { this.sessao = sessao; }

    @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (request.getMethod().equals("OPTIONS")) return true;
        String token = null;
        if (request.getCookies() != null) for (var cookie : request.getCookies())
            if (cookie.getName().equals(SessaoContexto.COOKIE)) token = cookie.getValue();
        sessao.vincular(request, token);
        return true;
    }
}
