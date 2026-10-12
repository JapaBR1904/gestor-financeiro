package br.com.nexo.auth;

import br.com.nexo.email.SmtpEmailProvider;
import br.com.nexo.email.EmailDesabilitadoProvider;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.MailSendException;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmailCodigoServiceTest {
    @Test void workerNaoHerdaDaemonDaThreadQueConcluiuTransacao() throws Exception {
        var terminou = new CountDownLatch(1);
        var daemon = new java.util.concurrent.atomic.AtomicReference<Boolean>();
        var sender = sender();
        doAnswer(inv -> { daemon.set(Thread.currentThread().isDaemon()); terminou.countDown(); return null; }).when(sender).send(any(MimeMessage.class));
        var service = new EmailCodigoService(new SmtpEmailProvider(sender, "teste@example.com"));
        var request = new Thread(() -> registrar(service, "pessoa@example.com").afterCommit());
        request.setDaemon(true);
        try {
            request.start(); assertTrue(terminou.await(5, TimeUnit.SECONDS));
            assertEquals(Boolean.FALSE, daemon.get());
        } finally { request.join(5000); service.encerrar(); }
    }
    @Test void registraPosCommitMasNaoEnviaAntesDoCallback() throws Exception {
        var sender = sender();
        try (var logs = new LogEmailTeste()) {
            var service = new EmailCodigoService(new SmtpEmailProvider(sender, "teste@example.com"));
            try {
                var callback = registrar(service, "pessoa@example.com");
                assertTrue(logs.contem("etapa=pos_commit_registrado"));
                verify(sender, never()).send(any(MimeMessage.class));
                callback.afterCommit();
                logs.aguardar("etapa=smtp_aceitou");
                assertTrue(logs.contem("etapa=pos_commit_executado"));
                assertTrue(logs.contem("etapa=tarefa_iniciada"));
                assertTrue(logs.contem("etapa=chamada_java_mail_sender"));
                logs.aguardar("etapa=tarefa_aceita");
                logs.semDadosSensiveis("pessoa@example.com", "123456");
            } finally { service.encerrar(); }
        }
    }
    @Test void rejeitaEnvioSemTransacaoReal() {
        var sender = sender();
        var service = new EmailCodigoService(new SmtpEmailProvider(sender, "teste@example.com"));
        try {
            assertThrows(IllegalStateException.class, () -> service.enviarRecuperacao("pessoa@example.com", "123456"));
            TransactionSynchronizationManager.initSynchronization();
            try { assertThrows(IllegalStateException.class, () -> service.enviarRecuperacao("pessoa@example.com", "123456")); }
            finally { TransactionSynchronizationManager.clearSynchronization(); }
            verify(sender, never()).send(any(MimeMessage.class));
        } finally { service.encerrar(); }
    }
    @Test void rollbackRegistradoNaoExecutaTarefa() {
        var sender = sender();
        try (var logs = new LogEmailTeste()) {
            var service = new EmailCodigoService(new SmtpEmailProvider(sender, "teste@example.com"));
            try {
                registrar(service, "pessoa@example.com").afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
                assertTrue(logs.contem("etapa=transacao_nao_confirmada"));
                assertFalse(logs.contem("etapa=tarefa_aceita"));
                verify(sender, never()).send(any(MimeMessage.class));
            } finally { service.encerrar(); }
        }
    }
    @Test void falhaSmtpMostraClassesSemVazarExcecaoOuMensagem() throws Exception {
        var sender = sender();
        String dados = "pessoa@example.com 123456 senha-fixture token-fixture chave-fixture";
        doThrow(new MailSendException(dados, new java.net.SocketTimeoutException(dados))).when(sender).send(any(MimeMessage.class));
        try (var logs = new LogEmailTeste()) {
            var service = new EmailCodigoService(new SmtpEmailProvider(sender, "teste@example.com"));
            try {
                assertDoesNotThrow(() -> registrar(service, "pessoa@example.com").afterCommit());
                logs.aguardar("etapa=falha_tarefa");
                assertTrue(logs.contem("MailSendException -> SocketTimeoutException"));
                logs.semDadosSensiveis("pessoa@example.com", "123456", "senha-fixture", "token-fixture", "chave-fixture");
            } finally { service.encerrar(); }
        }
    }
    @Test void excecaoInesperadaNaoEscapaDaThreadNemPerdeDiagnostico() throws Exception {
        var sender = sender();
        when(sender.createMimeMessage()).thenThrow(new NullPointerException("123456 token-fixture chave-fixture"));
        try (var logs = new LogEmailTeste()) {
            var service = new EmailCodigoService(new SmtpEmailProvider(sender, "teste@example.com"));
            try {
                registrar(service, "pessoa@example.com").afterCommit();
                logs.aguardar("etapa=falha_tarefa");
                assertTrue(logs.contem("NullPointerException"));
                logs.semDadosSensiveis("pessoa@example.com", "123456", "token-fixture", "chave-fixture");
            } finally { service.encerrar(); }
        }
    }
    @Test void mailDesabilitadoTemDiagnosticoExplicitoENaoChamaSender() throws Exception {
        var sender = sender();
        try (var logs = new LogEmailTeste()) {
            var service = new EmailCodigoService(new EmailDesabilitadoProvider());
            try {
                registrar(service, "pessoa@example.com").afterCommit();
                logs.aguardar("etapa=falha_tarefa");
                assertTrue(logs.contem("etapa=envio_desabilitado"));
                verify(sender, never()).send(any(MimeMessage.class));
            } finally { service.encerrar(); }
        }
    }
    @Test void executorEncerradoRegistraRejeicaoSemPropagarParaHttp() {
        var sender = sender();
        try (var logs = new LogEmailTeste()) {
            var service = new EmailCodigoService(new SmtpEmailProvider(sender, "teste@example.com"));
            service.encerrar();
            assertDoesNotThrow(() -> registrar(service, "pessoa@example.com").afterCommit());
            assertTrue(logs.contem("etapa=fila_rejeitada encerrando=true"));
            verify(sender, never()).send(any(MimeMessage.class));
        }
    }
    @Test void encerramentoEsperaTarefasAceitas() throws Exception {
        var iniciou = new CountDownLatch(1); var liberar = new CountDownLatch(1);
        var sender = sender();
        doAnswer(inv -> { iniciou.countDown(); assertTrue(liberar.await(5, TimeUnit.SECONDS)); return null; }).when(sender).send(any(MimeMessage.class));
        var service = new EmailCodigoService(new SmtpEmailProvider(sender, "teste@example.com"));
        var encerrou = new CountDownLatch(1);
        registrar(service, "pessoa@example.com").afterCommit();
        assertTrue(iniciou.await(5, TimeUnit.SECONDS));
        var thread = new Thread(() -> { service.encerrar(); encerrou.countDown(); }); thread.start();
        try {
            assertFalse(encerrou.await(100, TimeUnit.MILLISECONDS));
        } finally { liberar.countDown(); assertTrue(encerrou.await(5, TimeUnit.SECONDS)); thread.join(); }
    }
    static JavaMailSender sender() {
        var sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenAnswer(inv -> new MimeMessage(Session.getInstance(new java.util.Properties())));
        return sender;
    }
    @Test void segundoEnvioComecaMesmoQuandoPrimeiroSmtpEstaBloqueado() throws Exception {
        var primeiro = new CountDownLatch(1); var segundo = new CountDownLatch(1); var liberar = new CountDownLatch(1);
        var chamadas = new AtomicInteger();
        var sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenAnswer(inv -> new MimeMessage(Session.getInstance(new java.util.Properties())));
        doAnswer(inv -> {
            if (chamadas.incrementAndGet() == 1) { primeiro.countDown(); assertTrue(liberar.await(5, TimeUnit.SECONDS)); }
            else segundo.countDown();
            return null;
        }).when(sender).send(any(MimeMessage.class));
        var service = new EmailCodigoService(new SmtpEmailProvider(sender, "teste@example.com"));
        try {
            registrar(service, "primeiro@example.com").afterCommit();
            assertTrue(primeiro.await(5, TimeUnit.SECONDS));
            registrar(service, "segundo@example.com").afterCommit();
            assertTrue(segundo.await(2, TimeUnit.SECONDS), "Segundo worker deve começar sem esperar a fila encher.");
        } finally { liberar.countDown(); assertTrue(segundo.await(5, TimeUnit.SECONDS)); service.encerrar(); }
    }
    static TransactionSynchronization registrar(EmailCodigoService service, String email) {
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
        try {
            service.enviarRecuperacao(email, "123456");
            return TransactionSynchronizationManager.getSynchronizations().getFirst();
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
            TransactionSynchronizationManager.setActualTransactionActive(false);
        }
    }
}
