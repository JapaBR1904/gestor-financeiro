package br.com.nexo.auth;

import br.com.nexo.email.SmtpEmailProvider;
import br.com.nexo.email.EmailDesabilitadoProvider;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.mail.autoconfigure.MailSenderAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.io.support.ResourcePropertySource;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import static org.junit.jupiter.api.Assertions.*;

class ConfiguracaoEmailTest {
    private ApplicationContextRunner contexto() throws java.io.IOException {
        var propriedades = new ResourcePropertySource("classpath:application.properties");
        return new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(MailSenderAutoConfiguration.class))
                .withInitializer(context -> context.getEnvironment().getPropertySources().addLast(propriedades));
    }
    @Test void variaveisDoProcessoSaoVinculadasAoSenderSemUsarCredenciaisReais() throws Exception {
        contexto()
                .withPropertyValues("MAIL_ENABLED=true", "MAIL_HOST=smtp-fixture.invalid", "MAIL_PORT=587", "MAIL_USERNAME=usuario-fixture", "MAIL_PASSWORD=senha-fixture", "MAIL_FROM=remetente@example.com", "MAIL_SMTP_AUTH=true", "MAIL_STARTTLS=true", "MAIL_STARTTLS_REQUIRED=true")
                .run(context -> {
                    var sender = context.getBean(JavaMailSenderImpl.class);
                    assertEquals("smtp-fixture.invalid", sender.getHost()); assertEquals(587, sender.getPort());
                    assertEquals("usuario-fixture", sender.getUsername()); assertEquals("senha-fixture", sender.getPassword());
                    var propriedades = sender.getJavaMailProperties();
                    for (String nome : new String[]{"mail.smtp.auth", "mail.smtp.starttls.enable", "mail.smtp.starttls.required"}) assertEquals("true", propriedades.getProperty(nome));
                    assertEquals("true", context.getEnvironment().getProperty("nexo.mail.enabled"));
                    assertEquals("remetente@example.com", context.getEnvironment().getProperty("nexo.mail.from"));
                    assertEquals("5000", propriedades.getProperty("mail.smtp.connectiontimeout"));
                    assertEquals("10000", propriedades.getProperty("mail.smtp.timeout"));
                    assertEquals("10000", propriedades.getProperty("mail.smtp.writetimeout"));
                });
    }
    @Test void smtpQueNaoRespondeEncerraTentativaComTimeoutEDiagnosticoSeguro() throws Exception {
        try (var smtp = new SmtpLocalTeste(false); var logs = new LogEmailTeste()) {
            contexto().withPropertyValues("MAIL_ENABLED=true", "MAIL_HOST=localhost", "MAIL_PORT=" + smtp.porta(),
                            "MAIL_USERNAME=", "MAIL_PASSWORD=", "MAIL_SMTP_AUTH=false", "MAIL_STARTTLS=false", "MAIL_STARTTLS_REQUIRED=false",
                            "spring.mail.properties.mail.smtp.timeout=150")
                    .run(context -> {
                        var sender = context.getBean(JavaMailSenderImpl.class);
                        var service = new EmailCodigoService(new SmtpEmailProvider(sender, "teste@example.com"));
                        try {
                            assertDoesNotThrow(() -> EmailCodigoServiceTest.registrar(service, "pessoa@example.com").afterCommit());
                            logs.aguardar("etapa=falha_tarefa");
                            assertTrue(logs.contem("SocketTimeoutException"));
                            logs.semDadosSensiveis("pessoa@example.com", "123456");
                        } finally { service.encerrar(); }
                    });
        }
    }
}
