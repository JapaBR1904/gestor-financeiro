package br.com.nexo.auth;

import br.com.nexo.config.AutenticacaoException;
import org.springframework.stereotype.Component;

@Component
public class SessaoContexto {
    public static final String COOKIE = "nexo_session";
    public static final String CABECALHO = "X-Nexo-Organizacao";
    private static final String ATRIBUTO = SessaoContexto.class.getName() + ".usuario";

    private final AuthService authService;
    private final br.com.nexo.organizacao.MembroRepository membros;

    public SessaoContexto(AuthService authService, br.com.nexo.organizacao.MembroRepository membros) {
        this.authService = authService;
        this.membros = membros;
    }

    public AuthService.UsuarioAutenticado usuario(String token) {
        if (org.springframework.web.context.request.RequestContextHolder.getRequestAttributes() instanceof
                org.springframework.web.context.request.ServletRequestAttributes atributos) {
            var vinculado = atributos.getRequest().getAttribute(ATRIBUTO);
            if (vinculado instanceof AuthService.UsuarioAutenticado usuario) return usuario;
        }
        try {
            return authService.autenticarSessao(token);
        } catch (IllegalArgumentException exception) {
            throw new AutenticacaoException(exception.getMessage());
        }
    }

    public void vincular(jakarta.servlet.http.HttpServletRequest request, String token) {
        var usuario = usuario(token);
        String esperado = request.getHeader(CABECALHO);
        if (esperado == null || esperado.isBlank()) throw new br.com.nexo.config.ContextoDesatualizadoException();
        Long organizacao;
        try {
            organizacao = Long.valueOf(esperado);
            if (organizacao <= 0) throw new NumberFormatException();
        } catch (NumberFormatException e) { throw new IllegalArgumentException("Informe um espaço válido."); }
        if (membros.vinculo(usuario.id(), organizacao) == null)
            throw new br.com.nexo.config.AcessoNegadoException("Você não tem acesso a este espaço.");
        if (!organizacao.equals(usuario.organizacaoId())) throw new br.com.nexo.config.ContextoDesatualizadoException();
        // Uma nova leitura da sessão no controller não pode trocar o destino no meio da operação.
        request.setAttribute(ATRIBUTO, usuario);
    }

    public Long organizacaoId(String token) {
        return usuario(token).organizacaoId();
    }
}
