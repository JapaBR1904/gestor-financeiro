package br.com.nexo.auth;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import jakarta.annotation.PreDestroy;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class EmailCodigoService {
    private static final Logger log = LoggerFactory.getLogger(EmailCodigoService.class);

    private final JavaMailSender mailSender;
    private final boolean habilitado;
    private final String remetente;
    private final ThreadPoolExecutor recuperacoes = new ThreadPoolExecutor(1, 2, 30, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(100), tarefa -> {
                Thread thread = new Thread(tarefa, "nexo-email-recuperacao");
                thread.setDaemon(true);
                return thread;
            });

    public EmailCodigoService(
            JavaMailSender mailSender,
            @Value("${nexo.mail.enabled:false}") boolean habilitado,
            @Value("${nexo.mail.from:no-reply@nexo.local}") String remetente
    ) {
        this.mailSender = mailSender;
        this.habilitado = habilitado;
        this.remetente = remetente;
    }

    public void enviarRecuperacao(String email, String codigo) {
        // Enviar após o commit, fora da resposta HTTP, para não revelar contas pelo tempo do SMTP.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    recuperacoes.execute(() -> {
                        try { enviarCodigo(email, codigo, "recuperacao_senha"); }
                        catch (IllegalStateException exception) { log.warn("Não foi possível entregar um e-mail de recuperação."); }
                    });
                } catch (RejectedExecutionException exception) {
                    log.warn("Fila de recuperação de e-mail indisponível.");
                }
            }
        });
    }

    @PreDestroy
    void encerrar() { recuperacoes.shutdown(); }

    public void enviarCodigo(String email, String codigo, String finalidade) {
        if (!habilitado) {
            throw new IllegalStateException("O envio de e-mail está indisponível. Tente novamente mais tarde.");
        }

        try {
            MimeMessage mensagem = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensagem, true, "UTF-8");
            helper.setFrom(remetente);
            helper.setTo(email);
            String titulo = "recuperacao_senha".equals(finalidade) ? "Recupere sua senha" : "Confirme seu e-mail";
            helper.setSubject(titulo + " — Nexo");
            helper.setText(texto(codigo, titulo), html(codigo, titulo));
            mailSender.send(mensagem);
        } catch (MessagingException | MailException exception) {
            log.error("Falha no serviço de envio de e-mail de autenticação.");
            throw new IllegalStateException("Não foi possível enviar o código por e-mail agora.", exception);
        }
    }

    private String texto(String codigo, String titulo) {
        return titulo + ". Seu código do Nexo é: " + codigo
                + "\n\nEle expira em 10 minutos e só pode ser usado uma vez."
                + "\nSe você não solicitou este código, ignore esta mensagem.";
    }

    private String html(String codigo, String titulo) {
        return """
                <!doctype html>
                <html lang="pt-BR">
                  <body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033">
                    <div style="max-width:560px;margin:32px auto;padding:0 16px">
                      <div style="background:#ffffff;border:1px solid #e5eaf2;border-radius:18px;padding:32px">
                        <div style="font-size:22px;font-weight:800;margin-bottom:18px">Nexo</div>
                        <h1 style="font-size:24px;margin:0 0 10px">%s</h1>
                        <p style="color:#64748b;line-height:1.6">Use o código abaixo para continuar. Ele expira em 10 minutos e só pode ser usado uma vez.</p>
                        <div style="font-size:34px;font-weight:800;letter-spacing:8px;text-align:center;background:#f1f5ff;border-radius:14px;padding:18px;margin:24px 0">%s</div>
                        <p style="color:#64748b;font-size:13px;line-height:1.6">Se você não solicitou este código, ignore esta mensagem. Nunca compartilhe este código com outra pessoa.</p>
                      </div>
                    </div>
                  </body>
                </html>
                """.formatted(titulo, codigo);
    }
}
