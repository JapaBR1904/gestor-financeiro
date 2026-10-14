package br.com.nexo.auth;

import java.net.URI;
import java.net.http.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import br.com.nexo.email.EmailProvider;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "nexo.email.provider=disabled", "nexo.auth.email-verification-enabled=false", "nexo.cookie.secure=true"})
@ActiveProfiles("dev")
@EnabledIfEnvironmentVariable(named = "NEXO_TEST_DB_URL", matches = ".+")
class CadastroDiretoIntegrationTest {
    @LocalServerPort int porta;
    @Autowired JdbcTemplate jdbc;
    @Autowired UsuarioRepository usuarios;
    @MockitoBean EmailProvider emails;
    private final HttpClient http = HttpClient.newHttpClient();
    private static final String SENHA = "Cadastro-Direto-Teste123!";
    @DynamicPropertySource static void banco(DynamicPropertyRegistry r) {
        var url = System.getenv("NEXO_TEST_DB_URL");
        if (url == null || !url.matches(".*[/]nexo_test(?:[?].*)?$")) throw new IllegalStateException("Use somente nexo_test.");
        r.add("spring.datasource.url", () -> url);
        r.add("spring.datasource.username", () -> System.getenv().getOrDefault("NEXO_TEST_DB_USERNAME", "nexo_app"));
        r.add("spring.datasource.password", () -> System.getenv().getOrDefault("NEXO_TEST_DB_PASSWORD", ""));
    }
    @Test void cadastraPersisteHashCriaSessaoSemCodigoNemEmail() throws Exception {
        String email = "direto-" + UUID.randomUUID() + "@example.com";
        var resposta = cadastro(email, SENHA, SENHA);
        assertEquals(200, resposta.statusCode());
        assertTrue(resposta.body().contains("\"verificacaoEmailNecessaria\":false"));
        assertFalse(resposta.body().contains(SENHA));
        assertFalse(resposta.body().contains("token"));
        var usuario = usuarios.findByEmailIgnoreCase(email).orElseThrow();
        assertTrue(usuario.emailVerificado());
        assertTrue(new BCryptPasswordEncoder().matches(SENHA, usuario.getSenhaHash()));
        assertEquals(0, jdbc.queryForObject("select count(*) from codigos_autenticacao where email=?", Integer.class, email));
        assertEquals(1, jdbc.queryForObject("select count(*) from membros_organizacao where usuario_id=?", Integer.class, usuario.getId()));
        verifyNoInteractions(emails);
        String cookie = resposta.headers().firstValue("Set-Cookie").orElseThrow();
        assertTrue(cookie.contains("HttpOnly")); assertTrue(cookie.contains("Secure")); assertTrue(cookie.contains("SameSite=Lax"));
        String sessao = cookie.split(";", 2)[0];
        for (int i=0;i<2;i++) assertEquals(200, get("/me", sessao).statusCode());
        var logout = post("/logout", "{}", sessao);
        assertEquals(200, logout.statusCode());
        assertTrue(logout.headers().firstValue("Set-Cookie").orElseThrow().contains("Max-Age=0"));
        assertEquals(401, get("/me", sessao).statusCode());
        assertEquals(200, post("/login", "{\"email\":\""+email+"\",\"senha\":\""+SENHA+"\"}", null).statusCode());
        assertEquals(400, cadastro(email, SENHA, SENHA).statusCode());
        verifyNoInteractions(emails);
    }
    @Test void dispensaNaoEnfraquecePoliticaConfirmacaoOuEntradas() throws Exception {
        String email = "invalido-"+UUID.randomUUID()+"@example.com";
        assertEquals(400, cadastro(email, "fraca", "fraca").statusCode());
        assertEquals(400, cadastro(email, SENHA, SENHA+"x").statusCode());
        assertEquals(400, cadastro("email-invalido", SENHA, SENHA).statusCode());
        assertFalse(usuarios.existsByEmailIgnoreCase(email));
        verifyNoInteractions(emails);
    }
    private HttpResponse<String> cadastro(String email,String senha,String confirmacao) throws Exception {
        return post("/cadastro", "{\"nome\":\"Pessoa Sintética\",\"email\":\"%s\",\"senha\":\"%s\",\"confirmacaoSenha\":\"%s\"}".formatted(email,senha,confirmacao), null);
    }
    private URI uri(String p) { return URI.create("http://localhost:"+porta+"/api/auth"+p); }
    private HttpResponse<String> post(String p,String body,String cookie) throws Exception {
        var b = HttpRequest.newBuilder(uri(p)).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(body));
        if(cookie!=null)b.header("Cookie",cookie);
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> get(String p,String cookie) throws Exception {
        return http.send(HttpRequest.newBuilder(uri(p)).header("Cookie",cookie).GET().build(),HttpResponse.BodyHandlers.ofString());
    }
}
