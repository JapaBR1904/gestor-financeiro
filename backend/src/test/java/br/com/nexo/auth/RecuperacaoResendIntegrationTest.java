package br.com.nexo.auth;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import br.com.nexo.email.ResendEmailProvider;
import br.com.nexo.email.ResendHttpTeste;
import br.com.nexo.organizacao.OrganizacaoService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "nexo.email.provider=resend", "nexo.resend.enabled=false", "spring.mail.test-connection=true",
        "spring.mail.host=127.0.0.1", "spring.mail.port=1"})
@Import(RecuperacaoResendIntegrationTest.EmailConfig.class)
@EnabledIfEnvironmentVariable(named = "NEXO_TEST_DB_URL", matches = ".+")
class RecuperacaoResendIntegrationTest {
    private static final ResendHttpTeste api = new ResendHttpTeste();
    @TestConfiguration static class EmailConfig {
        @Bean @Primary ResendEmailProvider resendTeste() { return api.provider(Duration.ofSeconds(2), ""); }
    }
    @Autowired AuthService auth;
    @Autowired EmailCodigoService emails;
    @Autowired UsuarioRepository usuarios;
    @Autowired OrganizacaoService organizacoes;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transacoes;
    @Autowired org.springframework.context.ApplicationContext contexto;
    @LocalServerPort int porta;
    @DynamicPropertySource static void banco(DynamicPropertyRegistry registry) { AuthIntegrationTest.banco(registry); }
    @AfterAll static void fechar() { api.close(); }
    @AfterEach void aguardarERestaurar() throws Exception {
        aguardarFila(); api.status = 200; api.resposta = "{\"id\":\"" + ResendHttpTeste.ID + "\"}";
        api.antesDaResposta = () -> {}; api.depoisDosHeaders = () -> {};
    }
    @Test void commitRealEnviaContratoECodigoArmazenadoSomenteComoHash() throws Exception {
        String email = conta(); int antes = api.quantidade();
        try (var logs = new LogEmailTeste(EmailCodigoService.class, ResendEmailProvider.class)) {
            new TransactionTemplate(transacoes).executeWithoutResult(status -> {
                auth.solicitarCodigo(email, "recuperacao_senha");
                assertTrue(logs.contem("etapa=pos_commit_registrado")); assertFalse(logs.contem("etapa=pos_commit_executado"));
                assertEquals(antes, api.quantidade()); assertEquals(1, quantidadeCodigos(email));
            });
            var requisicao = api.receber(); assertNotNull(requisicao);
            logs.aguardar("etapa=resend_aceitou");
            var corpo = requisicao.json(); String codigo = codigo(requisicao);
            assertEquals(email, corpo.path("to").get(0).asString());
            assertEquals("Recupere sua senha — Nexo", corpo.path("subject").asString());
            assertTrue(corpo.path("html").asString().contains(codigo));
            assertTrue(corpo.path("text").asString().contains("10 minutos"));
            assertTrue(corpo.path("text").asString().contains("ignore esta mensagem"));
            assertEquals(5, corpo.size());
            assertTrue(new BCryptPasswordEncoder().matches(codigo, jdbc.queryForObject("select codigo_hash from codigos_autenticacao where email = ?", String.class, email)));
            assertTrue(logs.contem("etapa=tarefa_iniciada")); assertTrue(logs.contem("etapa=pos_commit_executado"));
            logs.semDadosSensiveis(email, codigo, ResendHttpTeste.CHAVE, "Senha-Fixture-Teste123!");
        }
    }
    @Test void rollbackNaoAlcancaApiNemPersisteCodigo() throws Exception {
        String email = conta(); int antes = api.quantidade();
        new TransactionTemplate(transacoes).executeWithoutResult(status -> { auth.solicitarCodigo(email, "recuperacao_senha"); status.setRollbackOnly(); });
        aguardarFila(); assertEquals(antes, api.quantidade()); assertEquals(0, quantidadeCodigos(email));
    }
    @Test void selecaoResendNaoInicializaOuTestaSmtpAntigo() {
        assertTrue(contexto.getBeansOfType(org.springframework.mail.javamail.JavaMailSender.class).isEmpty());
    }
    @Test void cadastroEConfirmacaoTambemUsamResendSemAlterarLoginOuLogout() throws Exception {
        String email = "resend-cadastro-" + UUID.randomUUID() + "@example.com";
        String senha = "Senha-Fixture-Teste123!";
        auth.cadastrar("Conta sintética", email, senha, senha);
        var mensagem = api.receber(); assertNotNull(mensagem);
        assertEquals("Confirme seu e-mail — Nexo", mensagem.json().path("subject").asString());
        assertThrows(IllegalArgumentException.class, () -> auth.login(email, senha));
        var sessao = auth.verificarCodigo(email, codigo(mensagem), "verificacao_email");
        assertEquals(email, auth.autenticarSessao(sessao.token()).email());
        assertNotNull(auth.login(email, senha));
        auth.encerrarSessao(sessao.token());
        assertThrows(IllegalArgumentException.class, () -> auth.autenticarSessao(sessao.token()));
    }
    @Test void timeoutResendMantemRespostaNeutraECodigoPersistido() throws Exception {
        String email = conta(); var liberar = new CountDownLatch(1);
        api.antesDaResposta = () -> { try { liberar.await(5, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } };
        try (var logs = new LogEmailTeste(EmailCodigoService.class, ResendEmailProvider.class)) {
            try {
                var existente = recuperar(email); var requisicao = api.receber(); assertNotNull(requisicao);
                logs.aguardar("etapa=falha_tarefa");
                assertEquals(200, existente.statusCode());
                assertEquals(existente.body(), recuperar("ausente-" + UUID.randomUUID() + "@example.com").body());
                assertTrue(logs.contem("TimeoutException")); assertEquals(1, quantidadeCodigos(email));
                logs.semDadosSensiveis(email, codigo(requisicao), ResendHttpTeste.CHAVE);
            } finally { liberar.countDown(); }
        }
    }
    @ParameterizedTest @ValueSource(ints = {400, 401, 403, 429, 503})
    void erroResendMantemHttpNeutroSemRetriesNemPerderCodigo(int status) throws Exception {
        String email = conta(); int antes = api.quantidade();
        api.status = status; api.resposta = "{\"name\":\"validation_error\",\"message\":\"chave-resend-fixture senha-fixture token-fixture\"}";
        try (var logs = new LogEmailTeste(EmailCodigoService.class, ResendEmailProvider.class)) {
            var existente = recuperar(email); var requisicao = api.receber(); assertNotNull(requisicao);
            logs.aguardar("etapa=falha_tarefa");
            var ausente = recuperar("ausente-" + UUID.randomUUID() + "@example.com");
            assertEquals(200, existente.statusCode()); assertEquals(existente.statusCode(), ausente.statusCode()); assertEquals(existente.body(), ausente.body());
            assertEquals(1, quantidadeCodigos(email)); assertEquals(antes + 1, api.quantidade());
            assertTrue(logs.contem("status=" + status));
            logs.semDadosSensiveis(email, codigo(requisicao), ResendHttpTeste.CHAVE, "senha-fixture", "token-fixture");
        }
    }
    @Test void doisWorkersEnviamSemReterRespostaHttp() throws Exception {
        var entraram = new CountDownLatch(2); var liberar = new CountDownLatch(1);
        api.antesDaResposta = () -> { entraram.countDown(); try { liberar.await(5, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } };
        try {
            var primeiro = recuperar(conta()); var segundo = recuperar(conta());
            assertEquals(200, primeiro.statusCode()); assertEquals(primeiro.body(), segundo.body());
            assertTrue(entraram.await(1, TimeUnit.SECONDS));
            assertEquals(1, liberar.getCount(), "As duas respostas HTTP concluíram antes do provedor.");
            assertNotNull(api.receber()); assertNotNull(api.receber());
        } finally { liberar.countDown(); }
    }
    @Test void codigoDoResendRedefineSenhaUsoUnicoRevogaSessaoELoginComNovaSenha() throws Exception {
        String email = conta(); String senhaAnterior = "Senha-Fixture-Teste123!"; String nova = "Nova-Senha-Fixture123!";
        var sessaoAnterior = auth.login(email, senhaAnterior).token();
        recuperar(email); var requisicao = api.receber(); assertNotNull(requisicao); aguardarFila();
        String codigo = codigo(requisicao); String prova = auth.verificarRecuperacao(email, codigo);
        assertThrows(IllegalArgumentException.class, () -> auth.verificarRecuperacao(email, codigo));
        auth.redefinirSenha(prova, nova, nova);
        assertThrows(IllegalArgumentException.class, () -> auth.redefinirSenha(prova, nova, nova));
        assertThrows(IllegalArgumentException.class, () -> auth.login(email, senhaAnterior));
        assertNotNull(auth.login(email, nova).token());
        assertThrows(IllegalArgumentException.class, () -> auth.autenticarSessao(sessaoAnterior));
        assertTrue(jdbc.queryForObject("select usado_em is not null and prova_usada_em is not null from codigos_autenticacao where email = ?", Boolean.class, email));
    }
    private String conta() {
        String email = "resend-it-" + UUID.randomUUID() + "@example.com";
        var organizacao = organizacoes.criar("Resend teste");
        var usuario = new Usuario(organizacao, "Conta sintética", email, new BCryptPasswordEncoder(4).encode("Senha-Fixture-Teste123!"));
        usuario.verificarEmail(); usuarios.save(usuario); return email;
    }
    private int quantidadeCodigos(String email) { return jdbc.queryForObject("select count(*) from codigos_autenticacao where email = ?", Integer.class, email); }
    private void aguardarFila() throws Exception {
        var executor = (ThreadPoolExecutor) ReflectionTestUtils.getField(emails, "recuperacoes");
        long prazo = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (executor.getActiveCount() > 0 || !executor.getQueue().isEmpty()) { assertTrue(System.nanoTime() < prazo); Thread.sleep(10); }
    }
    private HttpResponse<String> recuperar(String email) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + "/api/auth/recuperacao"))
                .timeout(Duration.ofSeconds(5)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"email\":\"" + email + "\"}")).build();
        return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    }
    private String codigo(ResendHttpTeste.Requisicao requisicao) {
        var matcher = Pattern.compile("(?<![0-9])[0-9]{6}(?![0-9])").matcher(requisicao.json().path("text").asString());
        assertTrue(matcher.find()); return matcher.group();
    }
}
