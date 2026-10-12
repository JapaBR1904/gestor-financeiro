package br.com.nexo.email;

import java.util.StringJoiner;
import jakarta.mail.MessagingException;
import org.slf4j.MDC;
import org.springframework.mail.MailSendException;

public final class EmailLogs {
    private EmailLogs() {}
    public static String despacho() {
        String id = MDC.get("nexoDespachoRecuperacao");
        return id == null ? "sem_despacho" : id;
    }
    public static String tipos(Throwable falha) {
        var tipos = new StringJoiner(" -> ");
        for (int i = 0; falha != null && i < 8; i++) {
            tipos.add(falha.getClass().getSimpleName());
            if (falha.getCause() != null) falha = falha.getCause();
            else if (falha instanceof MailSendException envio && envio.getMessageExceptions().length > 0) falha = envio.getMessageExceptions()[0];
            else if (falha instanceof MessagingException mensagem) falha = mensagem.getNextException();
            else falha = null;
        }
        return tipos.toString();
    }
}
