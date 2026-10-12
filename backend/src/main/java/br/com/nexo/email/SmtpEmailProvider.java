package br.com.nexo.email;

import jakarta.mail.MessagingException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

/** Compatibilidade temporária: selecionada somente com NEXO_EMAIL_PROVIDER=smtp. */
public final class SmtpEmailProvider implements EmailProvider {
    private static final Logger log = LoggerFactory.getLogger(SmtpEmailProvider.class);
    private final JavaMailSender sender;
    private final String remetente;
    public SmtpEmailProvider(JavaMailSender sender, String remetente) {
        this.sender = sender;
        this.remetente = remetente;
    }
    @Override public String enviar(EmailMensagem email) {
        try {
            var mensagem = sender.createMimeMessage();
            var helper = new MimeMessageHelper(mensagem, true, "UTF-8");
            helper.setFrom(remetente); helper.setTo(email.destinatario());
            helper.setSubject(email.assunto()); helper.setText(email.texto(), email.html());
            log.debug("E-mail despacho={} etapa=chamada_java_mail_sender", EmailLogs.despacho());
            sender.send(mensagem);
            log.debug("E-mail despacho={} etapa=smtp_aceitou", EmailLogs.despacho());
            return null;
        } catch (MessagingException | RuntimeException exception) {
            log.error("E-mail despacho={} etapa=falha_envio tipos={}", EmailLogs.despacho(), EmailLogs.tipos(exception));
            throw new IllegalStateException("Não foi possível enviar o código por e-mail agora.", exception);
        }
    }
}
