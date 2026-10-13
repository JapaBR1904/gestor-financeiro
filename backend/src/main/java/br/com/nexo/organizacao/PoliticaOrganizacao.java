package br.com.nexo.organizacao;

import br.com.nexo.auth.AuthService.UsuarioAutenticado;
import br.com.nexo.config.AcessoNegadoException;
import org.springframework.stereotype.Component;

@Component
public class PoliticaOrganizacao {
    public boolean podeGerenciar(UsuarioAutenticado usuario) {
        return usuario.papel().equals("proprietario") || usuario.papel().equals("administrador");
    }
    public void exigirGestao(UsuarioAutenticado usuario) {
        if (!podeGerenciar(usuario)) throw new AcessoNegadoException("Somente o proprietário ou administrador pode realizar esta ação.");
    }
    public void exigirPapel(UsuarioAutenticado usuario, String papelAlvo) {
        exigirGestao(usuario);
        if (!usuario.papel().equals("proprietario") && !papelAlvo.equals("membro"))
            throw new AcessoNegadoException("Somente o proprietário pode gerenciar administradores.");
    }
}
