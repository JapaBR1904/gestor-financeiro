package br.com.nexo.saas;

import java.util.UUID;
import br.com.nexo.auth.AuthService;
import br.com.nexo.auth.Usuario;
import br.com.nexo.auth.UsuarioRepository;
import br.com.nexo.organizacao.OrganizacaoService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;

final class BancoAssinaturaTeste {
    // Contas sintéticas verificadas diretamente: estes testes não enviam e-mails.
    static final String SENHA = "Assinatura-Teste123!";
    private static final String HASH = new BCryptPasswordEncoder(4).encode(SENHA);
    static void configurar(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("NEXO_TEST_DB_URL"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("NEXO_TEST_DB_USERNAME", "nexo_app"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("NEXO_TEST_DB_PASSWORD", ""));
    }
    static Conta criar(OrganizacaoService organizacoes, UsuarioRepository usuarios, AuthService auth) {
        String email = "assinatura-" + UUID.randomUUID() + "@example.com";
        var usuario = new Usuario(organizacoes.criar("Organização sintética"), "Pessoa Teste", email, HASH);
        usuario.verificarEmail();
        usuarios.save(usuario);
        var login = auth.login(email, SENHA);
        return new Conta(login.usuario(), login.token(), email);
    }
    record Conta(AuthService.UsuarioAutenticado usuario, String token, String email) {}
}
