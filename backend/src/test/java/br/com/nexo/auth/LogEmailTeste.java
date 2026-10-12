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

final class LogEmailTeste extends AppenderBase<ILoggingEvent> implements AutoCloseable {
    private final Logger logger;
    private final Level anterior;
    private final List<ILoggingEvent> eventos = new CopyOnWriteArrayList<>();
    private final LinkedBlockingQueue<ILoggingEvent> sinais = new LinkedBlockingQueue<>();
    LogEmailTeste() { this(EmailCodigoService.class); }
    LogEmailTeste(Class<?> tipo) {
        logger = (Logger) LoggerFactory.getLogger(tipo); anterior = logger.getLevel();
        logger.setLevel(Level.DEBUG); start(); logger.addAppender(this);
    }
    @Override protected void append(ILoggingEvent evento) { eventos.add(evento); sinais.add(evento); }
    boolean contem(String texto) { return eventos.stream().anyMatch(e -> e.getFormattedMessage().contains(texto)); }
    void aguardar(String texto) throws InterruptedException {
        long prazo = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (!contem(texto)) {
            long restante = prazo - System.nanoTime();
            assertTrue(restante > 0 && sinais.poll(restante, TimeUnit.NANOSECONDS) != null, "Etapa não registrada: " + texto);
        }
    }
    void semDadosSensiveis(String... valores) {
        for (var evento : eventos) {
            assertNull(evento.getThrowableProxy(), "Não anexar stack trace que possa conter dados SMTP.");
            for (String valor : valores) assertFalse(evento.getFormattedMessage().contains(valor), "Log contém dado de teste sensível.");
        }
    }
    @Override public void close() { logger.detachAppender(this); logger.setLevel(anterior); stop(); }
}
