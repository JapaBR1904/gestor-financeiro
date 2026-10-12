package br.com.nexo.auth;

import br.com.nexo.config.AutenticacaoException;
import org.springframework.stereotype.Component;

@Component
public class SessaoContexto {
    public static final String COOKIE = "nexo_session";

    private final AuthService authService;

    public SessaoContexto(AuthService authService) {
        this.authService = authService;
    }

    public AuthService.UsuarioAutenticado usuario(String token) {
        try {
            return authService.autenticarSessao(token);
        } catch (IllegalArgumentException exception) {
            throw new AutenticacaoException(exception.getMessage());
        }
    }

    public Long organizacaoId(String token) {
        return usuario(token).organizacaoId();
    }
}
