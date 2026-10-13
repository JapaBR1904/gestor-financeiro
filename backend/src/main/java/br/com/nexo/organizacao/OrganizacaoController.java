package br.com.nexo.organizacao;

import br.com.nexo.auth.AuthService;
import br.com.nexo.auth.SessaoContexto;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/organizacoes")
public class OrganizacaoController {
    private final SessaoContexto sessaoContexto;
    private final MembroRepository membros;
    private final AuthService auth;
    private final OrganizacaoService organizacoes;

    public OrganizacaoController(SessaoContexto sessaoContexto, MembroRepository membros, AuthService auth, OrganizacaoService organizacoes) {
        this.sessaoContexto = sessaoContexto;
        this.membros = membros; this.auth = auth;
        this.organizacoes = organizacoes;
    }

    @GetMapping("/atual")
    public OrganizacaoResponse atual(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        AuthService.UsuarioAutenticado usuario = sessaoContexto.usuario(token);
        return new OrganizacaoResponse(usuario.organizacaoId(), usuario.organizacaoNome());
    }

    public record OrganizacaoResponse(Long id, String nome) {}

    @GetMapping("/minhas")
    public java.util.List<MembroRepository.Vinculo> minhas(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        return membros.organizacoes(sessaoContexto.usuario(token).id());
    }
    @PostMapping("/selecionar")
    public AuthService.UsuarioAutenticado selecionar(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @RequestBody SelecionarRequest request) {
        sessaoContexto.usuario(token);
        if (request.organizacaoId() == null) throw new IllegalArgumentException("Escolha uma organização.");
        return auth.selecionarOrganizacao(token, request.organizacaoId());
    }
    public record SelecionarRequest(Long organizacaoId) {}

    @org.springframework.web.bind.annotation.PutMapping("/atual")
    public OrganizacaoResponse renomear(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @RequestBody NomeRequest request) {
        var atual = organizacoes.renomear(sessaoContexto.usuario(token), request.nome());
        return new OrganizacaoResponse(atual.getId(), atual.getNome());
    }
    public record NomeRequest(String nome) {}
    @PostMapping("/pessoal")
    public MembroRepository.Vinculo pessoal(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        return organizacoes.pessoal(sessaoContexto.usuario(token));
    }
}
