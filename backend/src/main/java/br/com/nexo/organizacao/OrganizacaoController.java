package br.com.nexo.organizacao;

import br.com.nexo.auth.AuthService;
import br.com.nexo.auth.SessaoContexto;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizacoes")
public class OrganizacaoController {
    private final SessaoContexto sessaoContexto;

    public OrganizacaoController(SessaoContexto sessaoContexto) {
        this.sessaoContexto = sessaoContexto;
    }

    @GetMapping("/atual")
    public OrganizacaoResponse atual(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        AuthService.UsuarioAutenticado usuario = sessaoContexto.usuario(token);
        return new OrganizacaoResponse(usuario.organizacaoId(), usuario.organizacaoNome());
    }

    public record OrganizacaoResponse(Long id, String nome) {}
}
