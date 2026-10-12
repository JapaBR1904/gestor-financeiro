package br.com.nexo.auth;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import br.com.nexo.email.EmailProvider;
import br.com.nexo.email.EmailMensagem;
import static br.com.nexo.email.EmailLogs.tipos;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class EmailCodigoService {
    private static final Logger log = LoggerFactory.getLogger(EmailCodigoService.class);
    private static final AtomicLong DESPACHOS = new AtomicLong();
    private static final String MDC_DESPACHO = "nexoDespachoRecuperacao";

    private final EmailProvider provider;
    private final ThreadPoolExecutor recuperacoes = criarExecutor();

    private static ThreadPoolExecutor criarExecutor() {
        var threads = new AtomicInteger();
        // Dois envios podem começar sem esperar a fila encher. Nunca executar transporte de e-mail na thread HTTP.
        return new ThreadPoolExecutor(2, 2, 30, TimeUnit.SECONDS, new ArrayBlockingQueue<>(100), tarefa -> {
            Thread thread = new Thread(tarefa, "nexo-email-recuperacao-" + threads.incrementAndGet());
            thread.setDaemon(false);
            thread.setUncaughtExceptionHandler((t, falha) ->
                    log.error("E-mail de recuperação etapa=falha_thread tipos={}", tipos(falha)));
            return thread;
        }, new ThreadPoolExecutor.AbortPolicy());
    }

    public EmailCodigoService(EmailProvider provider) {
        this.provider = provider;
        log.info("E-mail de autenticação etapa=configuracao providerTipo={}", provider.getClass().getSimpleName());
    }

    public void enviarRecuperacao(String email, String codigo) {
        // Enviar após o commit, fora da resposta HTTP, para não revelar contas pelo tempo do transporte de e-mail.
        if (!TransactionSynchronizationManager.isActualTransactionActive() || !TransactionSynchronizationManager.isSynchronizationActive()) {
            log.error("E-mail de recuperação etapa=transacao_ausente");
            throw new IllegalStateException("A recuperação precisa de uma transação ativa.");
        }
        long despacho = DESPACHOS.incrementAndGet();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                log.debug("E-mail de recuperação despacho={} etapa=pos_commit_executado", despacho);
                try {
                    recuperacoes.execute(() -> {
                        try (var contexto = MDC.putCloseable(MDC_DESPACHO, Long.toString(despacho))) {
                            log.debug("E-mail de recuperação despacho={} etapa=tarefa_iniciada", despacho);
                            try { enviarCodigo(email, codigo, "recuperacao_senha"); }
                            catch (RuntimeException exception) {
                                log.error("E-mail de recuperação despacho={} etapa=falha_tarefa tipos={}", despacho, tipos(exception));
                            }
                        }
                    });
                    log.debug("E-mail de recuperação despacho={} etapa=tarefa_aceita fila={} ativos={}",
                            despacho, recuperacoes.getQueue().size(), recuperacoes.getActiveCount());
                } catch (RejectedExecutionException exception) {
                    log.error("E-mail de recuperação despacho={} etapa=fila_rejeitada encerrando={} fila={} ativos={}",
                            despacho, recuperacoes.isShutdown(), recuperacoes.getQueue().size(), recuperacoes.getActiveCount());
                } catch (RuntimeException exception) {
                    log.error("E-mail de recuperação despacho={} etapa=falha_despacho tipos={}", despacho, tipos(exception));
                }
            }
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) log.debug("E-mail de recuperação despacho={} etapa=transacao_nao_confirmada", despacho);
            }
        });
        log.debug("E-mail de recuperação despacho={} etapa=pos_commit_registrado", despacho);
    }

    @PreDestroy
    void encerrar() {
        recuperacoes.shutdown();
        try {
            if (!recuperacoes.awaitTermination(30, TimeUnit.SECONDS)) {
                int descartadas = recuperacoes.shutdownNow().size();
                log.error("E-mail de recuperação etapa=encerramento_incompleto pendentesDescartadas={} ativos={}", descartadas, recuperacoes.getActiveCount());
            }
        } catch (InterruptedException exception) {
            int descartadas = recuperacoes.shutdownNow().size();
            Thread.currentThread().interrupt();
            log.error("E-mail de recuperação etapa=encerramento_interrompido pendentesDescartadas={}", descartadas);
        }
    }

    public void enviarCodigo(String email, String codigo, String finalidade) {
        log.debug("E-mail de autenticação etapa=mensagem_preparando");
        String titulo = "recuperacao_senha".equals(finalidade) ? "Recupere sua senha" : "Confirme seu e-mail";
        provider.enviar(new EmailMensagem(email, titulo + " — Nexo", html(codigo, titulo), texto(codigo, titulo)));
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
