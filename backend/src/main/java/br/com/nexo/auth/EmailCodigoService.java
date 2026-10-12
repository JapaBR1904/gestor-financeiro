package br.com.nexo.auth;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailCodigoService {
    private static final Logger log = LoggerFactory.getLogger(EmailCodigoService.class);

    private final JavaMailSender mailSender;
    private final boolean habilitado;
    private final String remetente;

    public EmailCodigoService(
            JavaMailSender mailSender,
            @Value("${nexo.mail.enabled:false}") boolean habilitado,
            @Value("${nexo.mail.from:no-reply@nexo.local}") String remetente
    ) {
        this.mailSender = mailSender;
        this.habilitado = habilitado;
        this.remetente = remetente;
    }

    public void enviarCodigo(String email, String codigo) {
        if (!habilitado) {
            log.warn("MAIL_ENABLED=false. Codigo de desenvolvimento para {}: {}", email, codigo);
            return;
        }

        try {
            MimeMessage mensagem = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensagem, true, "UTF-8");
            helper.setFrom(remetente);
            helper.setTo(email);
            helper.setSubject("Seu código de acesso ao Nexo");
            helper.setText(texto(codigo), html(codigo));
            mailSender.send(mensagem);
        } catch (MessagingException | MailException exception) {
            log.error("Falha ao enviar código de autenticação por e-mail: {}", exception.getMessage(), exception);
            throw new IllegalStateException("Não foi possível enviar o código por e-mail agora.", exception);
        }
    }

    private String texto(String codigo) {
        return "Seu código de acesso ao Nexo é: " + codigo
                + "\n\nEle expira em 10 minutos e só pode ser usado uma vez."
                + "\nSe você não solicitou este código, ignore esta mensagem.";
    }

    private String html(String codigo) {
        return """
                <!doctype html>
                <html lang="pt-BR">
                  <body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033">
                    <div style="max-width:560px;margin:32px auto;padding:0 16px">
                      <div style="background:#ffffff;border:1px solid #e5eaf2;border-radius:18px;padding:32px">
                        <div style="font-size:22px;font-weight:800;margin-bottom:18px">Nexo</div>
                        <h1 style="font-size:24px;margin:0 0 10px">Seu código de acesso</h1>
                        <p style="color:#64748b;line-height:1.6">Use o código abaixo para continuar. Ele expira em 10 minutos e só pode ser usado uma vez.</p>
                        <div style="font-size:34px;font-weight:800;letter-spacing:8px;text-align:center;background:#f1f5ff;border-radius:14px;padding:18px;margin:24px 0">%s</div>
                        <p style="color:#64748b;font-size:13px;line-height:1.6">Se você não solicitou este código, ignore esta mensagem. Nunca compartilhe este código com outra pessoa.</p>
                      </div>
                    </div>
                  </body>
                </html>
                """.formatted(codigo);
    }
}
