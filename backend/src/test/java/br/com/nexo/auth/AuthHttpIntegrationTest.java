package br.com.nexo.auth;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(AuthIntegrationTest.EmailConfig.class)
@EnabledIfEnvironmentVariable(named = "NEXO_TEST_DB_URL", matches = ".+")
class AuthHttpIntegrationTest {
    @LocalServerPort int porta;
    @Autowired AuthIntegrationTest.EmailTeste emails;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    private final HttpClient http = HttpClient.newHttpClient();

    @DynamicPropertySource
    static void configuracao(DynamicPropertyRegistry registry) {
        AuthIntegrationTest.banco(registry);
        registry.add("nexo.cookie.secure", () -> true);
    }

    @Test
    void fluxoHttpCompletoProtegeCookiesERevogaSessao() throws Exception {
        String email = "http-" + UUID.randomUUID() + "@example.com";
        String dados = "{\"nome\":\"Pessoa Teste\",\"email\":\"%s\",\"senha\":\"Senha-Segura-Teste123!\",\"confirmacaoSenha\":\"Senha-Segura-Teste123!\"}".formatted(email);
        assertEquals(200, post("/cadastro", dados, null).statusCode());
        String login = "{\"email\":\"%s\",\"senha\":\"Senha-Segura-Teste123!\"}".formatted(email);
        assertEquals(400, post("/login", login, null).statusCode());
        var verificacao = post("/verificar", "{\"email\":\"%s\",\"codigo\":\"%s\",\"finalidade\":\"verificacao_email\"}".formatted(email, emails.codigo(email)), null);
        assertEquals(200, verificacao.statusCode());
        String sessao = cookie(verificacao, "nexo_session");
        String header = verificacao.headers().firstValue("Set-Cookie").orElseThrow();
        assertTrue(header.contains("HttpOnly"));
        assertTrue(header.contains("Secure"));
        assertTrue(header.contains("SameSite=Lax"));
        assertTrue(header.contains("Max-Age=2592000"));
        assertFalse(verificacao.body().contains("senha"));
        assertEquals(200, get("/me", sessao).statusCode());
        var existente = post("/recuperacao", "{\"email\":\"%s\"}".formatted(email), null);
        var inexistente = post("/recuperacao", "{\"email\":\"ausente-%s@example.com\"}".formatted(UUID.randomUUID()), null);
        assertEquals(200, existente.statusCode());
        assertEquals(existente.body(), inexistente.body());
        assertEquals(existente.body(), post("/recuperacao", "{\"email\":\"%s\"}".formatted(email), null).body());
        var recuperacao = post("/recuperacao/verificar", "{\"email\":\"%s\",\"codigo\":\"%s\"}".formatted(email, emails.codigo(email)), null);
        assertEquals(200, recuperacao.statusCode());
        String prova = cookie(recuperacao, "nexo_recovery");
        String provaHeader = recuperacao.headers().firstValue("Set-Cookie").orElseThrow();
        assertTrue(provaHeader.contains("HttpOnly"));
        assertTrue(provaHeader.contains("Secure"));
        assertTrue(provaHeader.contains("SameSite=Strict"));
        assertTrue(provaHeader.contains("Max-Age=600"));
        assertFalse(recuperacao.body().contains("prova"));
        String novasSenhas = "{\"senha\":\"Outra-Senha-Teste456!\",\"confirmacaoSenha\":\"Outra-Senha-Teste456!\"}";
        assertEquals(400, post("/recuperacao/redefinir", novasSenhas, null).statusCode());
        var redefinicao = post("/recuperacao/redefinir", novasSenhas, prova);
        assertEquals(200, redefinicao.statusCode());
        assertEquals(2, redefinicao.headers().allValues("Set-Cookie").size());
        assertEquals(401, get("/me", sessao).statusCode());
        assertEquals(400, post("/recuperacao/redefinir", novasSenhas, prova).statusCode());
        var novoLogin = post("/login", login.replace("Senha-Segura-Teste123!", "Outra-Senha-Teste456!"), null);
        assertEquals(200, novoLogin.statusCode());
        String novaSessao = cookie(novoLogin, "nexo_session");
        assertEquals(200, post("/logout", "{}", novaSessao).statusCode());
        assertEquals(401, get("/me", novaSessao).statusCode());
    }

    @Test
    void rejeitaOrigemExternaELoginPorCodigoAntigo() throws Exception {
        var request = HttpRequest.newBuilder(uri("/login")).header("Content-Type", "application/json")
                .header("Origin", "https://origem-invalida.example.com")
                .POST(HttpRequest.BodyPublishers.ofString("{\"email\":\"teste@example.com\",\"senha\":\"senha-segura\"}")).build();
        assertEquals(403, http.send(request, HttpResponse.BodyHandlers.ofString()).statusCode());
        assertEquals(400, post("/codigo", "{\"email\":\"teste@example.com\",\"finalidade\":\"login\"}", null).statusCode());
    }

    @Test
    void politicaForteEConfirmacaoSaoObrigatoriasNaApi() throws Exception {
        for (String senha : new String[]{"Abcdefg1!", "abcdefghijklmn1!", "ABCDEFGHIJKLMN1!", "Abcdefghijklmno!", "Abcdefghijklmn12"}) {
            String email = "politica-" + UUID.randomUUID() + "@example.com";
            var resposta = post("/cadastro", "{\"nome\":\"Teste\",\"email\":\"%s\",\"senha\":\"%s\",\"confirmacaoSenha\":\"%s\"}".formatted(email, senha, senha), null);
            assertEquals(400, resposta.statusCode());
            assertFalse(resposta.body().contains(senha));
            assertFalse(emails.codigos.containsKey(email));
        }
        assertEquals(400, post("/cadastro", "{\"nome\":\"Teste\",\"email\":\"politica@example.com\",\"senha\":\"Senha-Segura-Teste123!\",\"confirmacaoSenha\":\"Outra-Senha-Teste456!\"}", null).statusCode());
        assertEquals(400, post("/login", "{\"email\":\"\",\"senha\":\"\"}", null).statusCode());
    }

    @Test
    void recuperacaoNaoDiferenciaContaInativaELoginNaoRevelaContaBloqueada() throws Exception {
        String email = "neutra-" + UUID.randomUUID() + "@example.com";
        String cadastro = "{\"nome\":\"Teste\",\"email\":\"%s\",\"senha\":\"Senha-Segura-Teste123!\",\"confirmacaoSenha\":\"Senha-Segura-Teste123!\"}".formatted(email);
        assertEquals(200, post("/cadastro", cadastro, null).statusCode());
        jdbc.update("update usuarios set ativo = false where email = ?", email);
        var inativa = post("/recuperacao", "{\"email\":\"%s\"}".formatted(email), null);
        var ausente = post("/recuperacao", "{\"email\":\"ausente-%s@example.com\"}".formatted(UUID.randomUUID()), null);
        assertEquals(ausente.statusCode(), inativa.statusCode());
        assertEquals(ausente.body(), inativa.body());
        String login = "{\"email\":\"%s\",\"senha\":\"Senha-Segura-Teste123!\"}";
        var falhaInativa = post("/login", login.formatted(email), null);
        var falhaAusente = post("/login", login.formatted("ausente@example.com"), null);
        jdbc.update("update usuarios set ativo = true, tentativas_login = 10, login_janela_em = now() where email = ?", email);
        var bloqueada = post("/login", login.formatted(email), null);
        assertEquals(falhaAusente.statusCode(), falhaInativa.statusCode());
        assertEquals(falhaAusente.body(), falhaInativa.body());
        assertEquals(falhaAusente.body(), bloqueada.body());
    }

    private URI uri(String caminho) { return URI.create("http://localhost:" + porta + "/api/auth" + caminho); }
    private HttpResponse<String> post(String caminho, String corpo, String cookie) throws Exception {
        var request = HttpRequest.newBuilder(uri(caminho)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(corpo));
        if (cookie != null) request.header("Cookie", cookie);
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> get(String caminho, String cookie) throws Exception {
        return http.send(HttpRequest.newBuilder(uri(caminho)).header("Cookie", cookie).GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    private String cookie(HttpResponse<String> response, String nome) {
        return response.headers().allValues("Set-Cookie").stream()
                .filter(valor -> valor.startsWith(nome + "=")).findFirst().orElseThrow().split(";", 2)[0];
    }
}
