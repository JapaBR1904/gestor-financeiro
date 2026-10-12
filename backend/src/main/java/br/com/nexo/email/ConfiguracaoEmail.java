package br.com.nexo.email;

import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.mail.autoconfigure.MailSenderAutoConfiguration;
import org.springframework.boot.mail.autoconfigure.MailSenderValidatorAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;

@Configuration(proxyBeanMethods = false)
public class ConfiguracaoEmail {
    @Configuration(proxyBeanMethods = false)
    @ConditionalOnProperty(name = "nexo.email.provider", havingValue = "smtp")
    @Import({MailSenderAutoConfiguration.class, MailSenderValidatorAutoConfiguration.class})
    static class SmtpLegado {}

    @Bean
    public EmailProvider emailProvider(Environment ambiente, ObjectProvider<JavaMailSender> smtp) {
        String provider = ambiente.getProperty("nexo.email.provider", "resend");
        LoggerFactory.getLogger(ConfiguracaoEmail.class).info("E-mail etapa=selecao_provider");
        // Cada ramo lê apenas sua configuração; providers inativos não validam credenciais.
        return switch (provider) {
            case "disabled" -> new EmailDesabilitadoProvider();
            case "smtp" -> criarSmtp(ambiente, smtp);
            case "resend" -> criarResend(ambiente);
            default -> throw new IllegalStateException("NEXO_EMAIL_PROVIDER inválido; use resend, smtp ou disabled.");
        };
    }

    private EmailProvider criarSmtp(Environment ambiente, ObjectProvider<JavaMailSender> smtp) {
        if (!ambiente.getProperty("nexo.mail.enabled", Boolean.class, false)) return new EmailDesabilitadoProvider();
        return new SmtpEmailProvider(smtp.getObject(), ambiente.getProperty("nexo.mail.from", "no-reply@nexo.local"));
    }

    private EmailProvider criarResend(Environment ambiente) {
        if (!ambiente.getProperty("nexo.resend.enabled", Boolean.class, false)) return new EmailDesabilitadoProvider();
        return new ResendEmailProvider(ambiente.getProperty("nexo.resend.api-key", ""),
                ambiente.getProperty("nexo.resend.from", ""), ambiente.getProperty("nexo.resend.reply-to", ""),
                ambiente.matchesProfiles("(dev | test) & !prod & !production"));
    }
}
