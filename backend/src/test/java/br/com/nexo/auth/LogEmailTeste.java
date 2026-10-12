package br.com.nexo.auth;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;
import org.slf4j.LoggerFactory;
import static org.junit.jupiter.api.Assertions.*;

public final class LogEmailTeste extends AppenderBase<ILoggingEvent> implements AutoCloseable {
    private final java.util.Map<Logger, Level> loggers = new java.util.HashMap<>();
    private final List<ILoggingEvent> eventos = new CopyOnWriteArrayList<>();
    private final LinkedBlockingQueue<ILoggingEvent> sinais = new LinkedBlockingQueue<>();
    public LogEmailTeste() { this(EmailCodigoService.class, br.com.nexo.email.SmtpEmailProvider.class, br.com.nexo.email.EmailDesabilitadoProvider.class); }
    public LogEmailTeste(Class<?>... tipos) {
        start();
        for (Class<?> tipo : tipos) {
            var logger = (Logger) LoggerFactory.getLogger(tipo);
            loggers.put(logger, logger.getLevel()); logger.setLevel(Level.DEBUG); logger.addAppender(this);
        }
    }
    @Override protected void append(ILoggingEvent evento) { eventos.add(evento); sinais.add(evento); }
    public boolean contem(String texto) { return eventos.stream().anyMatch(e -> e.getFormattedMessage().contains(texto)); }
    public void aguardar(String texto) throws InterruptedException {
        long prazo = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (!contem(texto)) {
            long restante = prazo - System.nanoTime();
            assertTrue(restante > 0 && sinais.poll(restante, TimeUnit.NANOSECONDS) != null, "Etapa não registrada: " + texto);
        }
    }
    public void semDadosSensiveis(String... valores) {
        for (var evento : eventos) {
            assertNull(evento.getThrowableProxy(), "Não anexar stack trace que possa conter dados SMTP.");
            for (String valor : valores) assertFalse(evento.getFormattedMessage().contains(valor), "Log contém dado de teste sensível.");
        }
    }
    @Override public void close() { loggers.forEach((logger, anterior) -> { logger.detachAppender(this); logger.setLevel(anterior); }); stop(); }
}
