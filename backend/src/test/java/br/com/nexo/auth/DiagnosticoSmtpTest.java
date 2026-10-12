package br.com.nexo.auth;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import br.com.nexo.diagnostico.DiagnosticoSmtpAplicacao;
import br.com.nexo.diagnostico.DiagnosticoSmtpService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.io.support.ResourcePropertySource;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DiagnosticoSmtpTest {
    private ApplicationContextRunner contexto(SmtpLocalTeste smtp) throws Exception {
        var propriedades = new ResourcePropertySource("classpath:application.properties");
        return new ApplicationContextRunner().withUserConfiguration(DiagnosticoSmtpAplicacao.Configuracao.class)
                .withInitializer(context -> context.getEnvironment().getPropertySources().addLast(propriedades))
                .withPropertyValues("spring.profiles.active=test", "MAIL_ENABLED=true", "MAIL_HOST=localhost", "MAIL_PORT=" + smtp.porta(),
                        "MAIL_USERNAME=", "MAIL_PASSWORD=", "MAIL_SMTP_AUTH=false", "MAIL_STARTTLS=false", "MAIL_STARTTLS_REQUIRED=false",
                        "MAIL_FROM=remetente-fixture@example.com", "NEXO_SMTP_DIAGNOSTIC_TO=destino-fixture@example.com");
    }

    @ParameterizedTest @CsvSource({"dev,true", "test,true", "default,false", "prod,false", "production,false", "'dev,prod',false", "'test,production',false"})
    void diagnosticoDisponivelSomenteEmDevTestSemProducao(String perfis, boolean esperado) throws Exception {
        try (var smtp = new SmtpLocalTeste()) {
            contexto(smtp).withPropertyValues("spring.profiles.active=" + perfis).run(context -> {
                assertEquals(esperado, context.getBeansOfType(DiagnosticoSmtpService.class).size() == 1);
                assertEquals(esperado, context.getBeansOfType(JavaMailSenderImpl.class).size() == 1);
                assertFalse(context.containsBean("authService"));
                assertTrue(context.getBeansOfType(javax.sql.DataSource.class).isEmpty());
            });
        }
    }

    @Test void springSenderEntregaMimeComAssuntoIdEnderecosEEnvelopeCorretos() throws Exception {
        try (var smtp = new SmtpLocalTeste(); var logs = new LogEmailTeste(DiagnosticoSmtpService.class)) {
            contexto(smtp).run(context -> {
                var resultado = context.getBean(DiagnosticoSmtpService.class).executar();
                assertTrue(resultado.aceito()); assertNotNull(resultado.diagnosticoId());
                var mensagem = mensagem(smtp.receber("destino-fixture@example.com"));
                assertEquals("remetente-fixture@example.com", mensagem.getFrom()[0].toString());
                assertEquals("destino-fixture@example.com", mensagem.getRecipients(Message.RecipientType.TO)[0].toString());
                assertEquals("Diagnóstico SMTP Nexo [" + resultado.diagnosticoId() + "]", mensagem.getSubject());
                assertTrue(mensagem.isMimeType("text/plain"));
                assertTrue(mensagem.getContent().toString().contains("diagnosticoId=" + resultado.diagnosticoId()));
                assertEquals(resultado.diagnosticoId().toString(), mensagem.getHeader("X-Nexo-Diagnostico-Id", null));
                assertNotNull(mensagem.getMessageID());
                assertEquals("remetente-fixture@example.com", smtp.receberEnvelope("destino-fixture@example.com"));
                assertTrue(logs.contem("envelopeOrigem=cabecalho_from envelopeIgualFrom=true"));
                assertTrue(logs.contem("messageIdPreservado=true"));
                assertTrue(logs.contem("etapa=sender_retornou duracaoMs="));
                assertTrue(logs.contem("id=" + resultado.diagnosticoId()));
                logs.semDadosSensiveis("remetente-fixture@example.com", "destino-fixture@example.com");
            });
        }
    }

    @Test void observaOverrideDeEnvelopeSemAlterarPropriedadeOuCabecalho() throws Exception {
        try (var smtp = new SmtpLocalTeste(); var logs = new LogEmailTeste(DiagnosticoSmtpService.class)) {
            contexto(smtp).withPropertyValues("spring.mail.properties.mail.smtp.from=envelope-fixture@example.com").run(context -> {
                var sender = context.getBean(JavaMailSenderImpl.class);
                var resultado = context.getBean(DiagnosticoSmtpService.class).executar(); assertTrue(resultado.aceito());
                var mensagem = mensagem(smtp.receber("destino-fixture@example.com"));
                assertEquals("remetente-fixture@example.com", mensagem.getFrom()[0].toString());
                assertEquals("envelope-fixture@example.com", smtp.receberEnvelope("destino-fixture@example.com"));
                assertEquals("envelope-fixture@example.com", sender.getJavaMailProperties().getProperty("mail.smtp.from"));
                assertTrue(logs.contem("envelopeOrigem=propriedade_smtp envelopeIgualFrom=false"));
                logs.semDadosSensiveis("envelope-fixture@example.com", "remetente-fixture@example.com", "destino-fixture@example.com");
            });
        }
    }

    @Test void envelopeDaMensagemAngusTemPrecedenciaSobrePropriedade() throws Exception {
        try (var smtp = new SmtpLocalTeste(); var logs = new LogEmailTeste(DiagnosticoSmtpService.class)) {
            contexto(smtp).withPropertyValues("spring.mail.properties.mail.smtp.from=propriedade-fixture@example.com").run(context -> {
                var sender = spy(context.getBean(JavaMailSenderImpl.class));
                var tipo = Class.forName("org.eclipse.angus.mail.smtp.SMTPMessage");
                var mensagem = (MimeMessage) tipo.getConstructor(Session.class).newInstance(sender.getSession());
                tipo.getMethod("setEnvelopeFrom", String.class).invoke(mensagem, "mensagem-fixture@example.com");
                doReturn(mensagem).when(sender).createMimeMessage();
                assertTrue(new DiagnosticoSmtpService(sender, true, "remetente-fixture@example.com", "destino-fixture@example.com").executar().aceito());
                assertNotNull(smtp.receber("destino-fixture@example.com"));
                assertEquals("mensagem-fixture@example.com", smtp.receberEnvelope("destino-fixture@example.com"));
                assertTrue(logs.contem("envelopeOrigem=smtp_message envelopeIgualFrom=false"));
                logs.semDadosSensiveis("mensagem-fixture@example.com", "propriedade-fixture@example.com", "remetente-fixture@example.com", "destino-fixture@example.com");
            });
        }
    }

    @ParameterizedTest @CsvSource({"NEXO_SMTP_DIAGNOSTIC_TO,'',destinatario_ausente", "MAIL_ENABLED,false,envio_desabilitado", "MAIL_FROM,'',remetente_ausente",
            "NEXO_SMTP_DIAGNOSTIC_TO,endereco-invalido,falha_operacao", "NEXO_SMTP_DIAGNOSTIC_TO,'a@example.com,b@example.com',endereco_deve_ser_unico",
            "spring.mail.properties.mail.debug,true,debug_protocolo_bloqueado", "spring.mail.properties.mail.debug.auth,true,debug_protocolo_bloqueado",
            "spring.mail.properties.mail.smtp.timeout,0,timeouts_invalidos"})
    void configuracaoInseguraOuAusenteBloqueiaEnvio(String chave, String valor, String motivo) throws Exception {
        try (var smtp = new SmtpLocalTeste(); var logs = new LogEmailTeste(DiagnosticoSmtpService.class)) {
            contexto(smtp).withPropertyValues(chave + "=" + valor).run(context -> {
                var resultado = context.getBean(DiagnosticoSmtpService.class).executar();
                assertFalse(resultado.aceito()); assertTrue(logs.contem("motivo=" + motivo));
                assertFalse(logs.contem("etapa=chamada_sender"));
                assertEquals(0, smtp.quantidade("destino-fixture@example.com"));
                logs.semDadosSensiveis("remetente-fixture@example.com", "destino-fixture@example.com");
            });
        }
    }

    @Test void starttlsObrigatorioNaoRecuaParaTextoClaroNoSmtpFake() throws Exception {
        try (var smtp = new SmtpLocalTeste(); var logs = new LogEmailTeste(DiagnosticoSmtpService.class)) {
            contexto(smtp).withPropertyValues("MAIL_STARTTLS=true", "MAIL_STARTTLS_REQUIRED=true").run(context -> {
                assertFalse(context.getBean(DiagnosticoSmtpService.class).executar().aceito());
                assertEquals(0, smtp.quantidade("destino-fixture@example.com"));
                assertTrue(logs.contem("starttls=true starttlsRequired=true"));
                assertTrue(logs.contem("fase=chamada_sender"));
                logs.semDadosSensiveis("remetente-fixture@example.com", "destino-fixture@example.com");
            });
        }
    }

    @Test void timeoutDoSpringSenderContinuaAtivoESemDadosNoLog() throws Exception {
        try (var smtp = new SmtpLocalTeste(false); var logs = new LogEmailTeste(DiagnosticoSmtpService.class)) {
            contexto(smtp).withPropertyValues("spring.mail.properties.mail.smtp.timeout=150").run(context -> {
                assertFalse(context.getBean(DiagnosticoSmtpService.class).executar().aceito());
                assertTrue(logs.contem("SocketTimeoutException"));
                assertTrue(logs.contem("fase=chamada_sender"));
                logs.semDadosSensiveis("remetente-fixture@example.com", "destino-fixture@example.com");
            });
        }
    }

    @Test void falhaComCredenciaisNaExcecaoNaoExpoeDadosNosLogs() throws Exception {
        var sender = spy(new JavaMailSenderImpl()); sender.setHost("localhost"); sender.setPort(587);
        sender.setUsername("usuario-fixture@example.com"); sender.setPassword("chave-fixture");
        Properties propriedades = sender.getJavaMailProperties();
        propriedades.setProperty("mail.smtp.connectiontimeout", "5000"); propriedades.setProperty("mail.smtp.timeout", "10000"); propriedades.setProperty("mail.smtp.writetimeout", "10000");
        propriedades.setProperty("mail.smtp.auth", "true"); propriedades.setProperty("mail.smtp.starttls.enable", "true"); propriedades.setProperty("mail.smtp.starttls.required", "true");
        doThrow(new MailSendException("usuario-fixture@example.com chave-fixture senha-fixture token-fixture 654321", new java.net.SocketTimeoutException("senha-fixture"))).when(sender).send(any(MimeMessage.class));
        try (var logs = new LogEmailTeste(DiagnosticoSmtpService.class)) {
            var service = new DiagnosticoSmtpService(sender, true, "remetente-fixture@example.com", "destino-fixture@example.com");
            assertFalse(service.executar().aceito());
            assertTrue(logs.contem("MailSendException -> SocketTimeoutException"));
            assertTrue(logs.contem("usernameConfigurado=true passwordConfigurada=true auth=true starttls=true starttlsRequired=true"));
            logs.semDadosSensiveis("usuario-fixture@example.com", "remetente-fixture@example.com", "destino-fixture@example.com", "chave-fixture", "senha-fixture", "token-fixture", "654321");
        }
    }

    private static MimeMessage mensagem(String fonte) throws Exception {
        assertNotNull(fonte, "SMTP fake precisa receber a mensagem.");
        return new MimeMessage(Session.getInstance(new Properties()), new ByteArrayInputStream(fonte.getBytes(StandardCharsets.US_ASCII)));
    }
}
