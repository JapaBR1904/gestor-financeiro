package br.com.nexo.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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

        SimpleMailMessage mensagem = new SimpleMailMessage();
        mensagem.setFrom(remetente);
        mensagem.setTo(email);
        mensagem.setSubject("Seu código de acesso ao Nexo");
        mensagem.setText("Seu código de acesso é: " + codigo + "\n\nEle expira em 10 minutos. Se você não solicitou este código, ignore esta mensagem.");
        mailSender.send(mensagem);
    }
}
