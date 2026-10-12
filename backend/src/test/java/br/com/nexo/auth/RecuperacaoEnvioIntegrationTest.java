package br.com.nexo.auth;

import java.util.UUID;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.OffsetDateTime;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import br.com.nexo.organizacao.OrganizacaoService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(named = "NEXO_TEST_DB_URL", matches = ".+")
class RecuperacaoEnvioIntegrationTest {
    private static final SmtpLocalTeste smtp = new SmtpLocalTeste();
    @Autowired AuthService auth;
    @Autowired UsuarioRepository usuarios;
    @Autowired OrganizacaoService organizacoes;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transacoes;
    @MockitoSpyBean EmailCodigoService emails;
    @MockitoSpyBean JavaMailSender sender;
    @Autowired CodigoAutenticacaoRepository codigos;
    @LocalServerPort int porta;
    @DynamicPropertySource static void configurar(DynamicPropertyRegistry registry) {
        AuthIntegrationTest.banco(registry);
        registry.add("nexo.mail.enabled", () -> true);
        registry.add("nexo.mail.from", () -> "teste@example.com");
        registry.add("spring.mail.host", () -> "localhost");
        registry.add("spring.mail.port", smtp::porta);
        registry.add("spring.mail.username", () -> "");
        registry.add("spring.mail.password", () -> "");
        registry.add("spring.mail.properties.mail.smtp.auth", () -> false);
        registry.add("spring.mail.properties.mail.smtp.starttls.enable", () -> false);
        registry.add("spring.mail.properties.mail.smtp.starttls.required", () -> false);
        registry.add("spring.mail.test-connection", () -> false);
    }
    @AfterAll static void encerrarSmtp() throws Exception { smtp.close(); }

    @Test void servicoRealEnviaSmtpSomenteDepoisDoCommit() throws Exception {
        String email = conta();
        try (var logs = new LogEmailTeste()) {
            new TransactionTemplate(transacoes).executeWithoutResult(status -> {
                auth.solicitarCodigo(email, "recuperacao_senha");
                assertTrue(logs.contem("etapa=pos_commit_registrado"));
                assertFalse(logs.contem("etapa=pos_commit_executado"));
                assertEquals(0, smtp.quantidade(email));
                verify(sender, never()).send(any(MimeMessage.class));
                assertEquals(1, quantidadeCodigos(email));
            });
            String mensagem = smtp.receber(email);
            assertNotNull(mensagem, "O serviço real deve alcançar o SMTP depois do commit.");
            logs.aguardar("etapa=smtp_aceitou");
            assertTrue(logs.contem("etapa=pos_commit_executado"));
            String codigo = codigoDaMensagem(new MimeMessage(Session.getInstance(new java.util.Properties()),
                    new java.io.ByteArrayInputStream(mensagem.getBytes(java.nio.charset.StandardCharsets.US_ASCII))));
            assertTrue(new BCryptPasswordEncoder().matches(codigo, jdbc.queryForObject("select codigo_hash from codigos_autenticacao where email = ?", String.class, email)));
            assertTrue(jdbc.queryForObject("select usado_em is null from codigos_autenticacao where email = ?", Boolean.class, email));
            logs.semDadosSensiveis(email, codigo, "Senha-Fixture-Teste123!");
        }
    }
    @Test void rollbackNaoDisparaMensagem() {
        String email = conta();
        new TransactionTemplate(transacoes).executeWithoutResult(status -> {
            auth.solicitarCodigo(email, "recuperacao_senha");
            status.setRollbackOnly();
        });
        assertEquals(0, smtp.quantidade(email));
        assertEquals(0, jdbc.queryForObject("select count(*) from codigos_autenticacao where email = ?", Integer.class, email));
        verify(sender, never()).send(any(MimeMessage.class));
    }
    @Test void falhaSmtpPreservaRespostaHttpNeutraERegistraDiagnosticoSeguro() throws Exception {
        String email = conta();
        var codigo = new AtomicReference<String>();
        doAnswer(inv -> {
            codigo.set(codigoDaMensagem(inv.getArgument(0)));
            throw new MailSendException(email + " " + codigo.get() + " senha-fixture token-fixture chave-fixture",
                    new java.net.SocketTimeoutException("chave-fixture"));
        }).when(sender).send(any(MimeMessage.class));
        try (var logs = new LogEmailTeste()) {
            var existente = recuperar(email);
            logs.aguardar("etapa=falha_tarefa");
            var ausente = recuperar("ausente-" + UUID.randomUUID() + "@example.com");
            assertEquals(200, existente.statusCode());
            assertEquals(existente.statusCode(), ausente.statusCode());
            assertEquals(existente.body(), ausente.body());
            assertEquals(1, quantidadeCodigos(email));
            assertTrue(logs.contem("MailSendException -> SocketTimeoutException"));
            logs.semDadosSensiveis(email, codigo.get(), "senha-fixture", "token-fixture", "chave-fixture");
        }
    }
    @Test void contaAusenteEInativaNaoAgendamEmailETemMesmaResposta() throws Exception {
        String email = conta(); jdbc.update("update usuarios set ativo = false where email = ?", email);
        String ausente = "ausente-" + UUID.randomUUID() + "@example.com";
        var inativa = recuperar(email); var inexistente = recuperar(ausente);
        assertEquals(200, inativa.statusCode()); assertEquals(inativa.body(), inexistente.body());
        assertEquals(1, quantidadeCodigos(email)); assertEquals(1, quantidadeCodigos(ausente));
        verify(emails, never()).enviarRecuperacao(eq(email), anyString());
        verify(emails, never()).enviarRecuperacao(eq(ausente), anyString());
        verify(sender, never()).send(any(MimeMessage.class));
    }
    @Test void cooldownNaoCriaOutroCodigoNemOutroEnvio() throws Exception {
        String email = conta();
        var primeiro = recuperar(email);
        assertNotNull(smtp.receber(email)); aguardarFila();
        var segundo = recuperar(email);
        assertEquals(primeiro.body(), segundo.body()); assertEquals(1, quantidadeCodigos(email));
        verify(emails, times(1)).enviarRecuperacao(eq(email), anyString());
        verify(sender, times(1)).send(any(MimeMessage.class));
    }
    @Test void limitePorHoraNaoCriaCodigoNemEnviaEmail() throws Exception {
        String email = conta();
        for (int i = 0; i < 6; i++) codigos.save(new CodigoAutenticacao(email, new BCryptPasswordEncoder(4).encode("123456"), "recuperacao_senha", OffsetDateTime.now().plusMinutes(10)));
        jdbc.update("update codigos_autenticacao set criado_em = now() - interval '46 seconds' where email = ?", email);
        var resposta = recuperar(email);
        assertEquals(200, resposta.statusCode()); assertEquals(6, quantidadeCodigos(email));
        verify(emails, never()).enviarRecuperacao(eq(email), anyString());
        verify(sender, never()).send(any(MimeMessage.class));
    }
    @Test void novoEnvioInvalidaCodigoEProvaAnteriores() throws Exception {
        String email = conta(); recuperar(email);
        String mensagem = smtp.receber(email); assertNotNull(mensagem); aguardarFila();
        String codigo = codigoDaMensagem(new MimeMessage(Session.getInstance(new java.util.Properties()), new java.io.ByteArrayInputStream(mensagem.getBytes(java.nio.charset.StandardCharsets.US_ASCII))));
        String prova = auth.verificarRecuperacao(email, codigo);
        jdbc.update("update codigos_autenticacao set criado_em = now() - interval '46 seconds' where email = ?", email);
        recuperar(email); assertNotNull(smtp.receber(email)); aguardarFila();
        assertEquals(2, quantidadeCodigos(email));
        assertEquals(1, jdbc.queryForObject("select count(*) from codigos_autenticacao where email = ? and usado_em is null", Integer.class, email));
        assertTrue(jdbc.queryForObject("select prova_usada_em is not null from codigos_autenticacao where prova_hash is not null and email = ?", Boolean.class, email));
        assertThrows(IllegalArgumentException.class, () -> auth.redefinirSenha(prova, "Senha-Fixture-Teste123!", "Senha-Fixture-Teste123!"));
    }
    @Test void smtpLentoNaoRetemRespostaHttp() throws Exception {
        String email = conta(); var entrou = new CountDownLatch(1); var liberar = new CountDownLatch(1);
        doAnswer(inv -> { entrou.countDown(); assertTrue(liberar.await(5, TimeUnit.SECONDS)); return null; }).when(sender).send(any(MimeMessage.class));
        try {
            var resposta = recuperar(email);
            assertEquals(200, resposta.statusCode());
            assertTrue(entrou.await(5, TimeUnit.SECONDS));
            assertEquals(1L, liberar.getCount(), "Resposta HTTP já terminou enquanto SMTP continua bloqueado.");
            assertEquals(resposta.body(), recuperar("ausente-" + UUID.randomUUID() + "@example.com").body());
        } finally { liberar.countDown(); aguardarFila(); }
    }
    @Test void filaCheiaNaoFalhaHttpNemDescartaSilenciosamente() throws Exception {
        String email = conta(); var liberar = new CountDownLatch(1); var iniciadas = new CountDownLatch(2);
        var executor = executor();
        Runnable bloquear = () -> { iniciadas.countDown(); try { liberar.await(5, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } };
        executor.execute(bloquear); executor.execute(bloquear);
        assertTrue(iniciadas.await(5, TimeUnit.SECONDS));
        int capacidade = executor.getQueue().remainingCapacity();
        for (int i = 0; i < capacidade; i++) assertTrue(executor.getQueue().offer(() -> {}));
        try (var logs = new LogEmailTeste()) {
            try {
                var resposta = recuperar(email);
                assertEquals(200, resposta.statusCode());
                logs.aguardar("etapa=fila_rejeitada");
                assertEquals(resposta.body(), recuperar("ausente-" + UUID.randomUUID() + "@example.com").body());
                assertEquals(1, quantidadeCodigos(email));
                verify(sender, never()).send(any(MimeMessage.class));
                logs.semDadosSensiveis(email);
            } finally { liberar.countDown(); aguardarFila(); }
        }
    }
    private int quantidadeCodigos(String email) { return jdbc.queryForObject("select count(*) from codigos_autenticacao where email = ?", Integer.class, email); }
    private ThreadPoolExecutor executor() { return (ThreadPoolExecutor) ReflectionTestUtils.getField(emails, "recuperacoes"); }
    private void aguardarFila() throws InterruptedException {
        long prazo = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (executor().getActiveCount() > 0 || !executor().getQueue().isEmpty()) {
            assertTrue(System.nanoTime() < prazo, "Fila de teste não terminou."); Thread.sleep(10);
        }
    }
    private HttpResponse<String> recuperar(String email) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + "/api/auth/recuperacao"))
                .timeout(java.time.Duration.ofSeconds(5)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"email\":\"%s\"}".formatted(email))).build();
        return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    }
    private static String codigoDaMensagem(Part parte) throws Exception {
        Object conteudo = parte.getContent();
        if (conteudo instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) { String codigo = codigoDaMensagem(multipart.getBodyPart(i)); if (codigo != null) return codigo; }
        } else if (conteudo instanceof String texto) {
            var resultado = Pattern.compile("\\b\\d{6}\\b").matcher(texto); if (resultado.find()) return resultado.group();
        }
        return null;
    }
    private String conta() {
        String email = "despacho-" + UUID.randomUUID() + "@example.com";
        var usuario = new Usuario(organizacoes.criar("Teste recuperação"), "Pessoa Teste", email, new BCryptPasswordEncoder(4).encode("Senha-Fixture-Teste123!"));
        usuario.verificarEmail(); usuarios.save(usuario);
        return email;
    }
}
