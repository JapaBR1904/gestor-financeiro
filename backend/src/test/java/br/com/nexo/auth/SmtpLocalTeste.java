package br.com.nexo.auth;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.*;

// Servidor SMTP exclusivo de teste, restrito a loopback e sem autenticação externa.
final class SmtpLocalTeste implements AutoCloseable {
    private final ServerSocket servidor;
    private final ExecutorService conexoes = Executors.newVirtualThreadPerTaskExecutor();
    private final Map<String, BlockingQueue<String>> mensagens = new ConcurrentHashMap<>();
    private final Map<String, BlockingQueue<String>> envelopes = new ConcurrentHashMap<>();
    private volatile boolean parado;
    private final boolean saudacaoAutomatica;
    SmtpLocalTeste() { this(true); }
    SmtpLocalTeste(boolean saudacaoAutomatica) {
        this.saudacaoAutomatica = saudacaoAutomatica;
        try { servidor = new ServerSocket(0, 20, InetAddress.getLoopbackAddress()); }
        catch (IOException exception) { throw new IllegalStateException("SMTP local não iniciou.", exception); }
        conexoes.submit(() -> {
            while (!parado) {
                try { var socket = servidor.accept(); conexoes.submit(() -> atender(socket)); }
                catch (IOException exception) { if (!parado) throw new IllegalStateException("SMTP local interrompido.", exception); }
            }
        });
    }
    int porta() { return servidor.getLocalPort(); }
    String receber(String email) throws InterruptedException { return fila(email).poll(5, TimeUnit.SECONDS); }
    int quantidade(String email) { return fila(email).size(); }
    String receberEnvelope(String email) throws InterruptedException { return envelopes.computeIfAbsent(email, k -> new LinkedBlockingQueue<>()).poll(5, TimeUnit.SECONDS); }
    private BlockingQueue<String> fila(String email) { return mensagens.computeIfAbsent(email, k -> new LinkedBlockingQueue<>()); }
    private void atender(Socket socket) {
        try (socket;
             var entrada = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.US_ASCII));
             var saida = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.US_ASCII), true)) {
            if (saudacaoAutomatica) responder(saida, "220 localhost teste");
            String destinatario = null;
            String remetente = null;
            for (String linha; (linha = entrada.readLine()) != null;) {
                if (linha.startsWith("MAIL FROM:")) {
                    remetente = linha.substring(linha.indexOf('<') + 1, linha.indexOf('>'));
                    responder(saida, "250 OK");
                } else if (linha.startsWith("RCPT TO:")) {
                    destinatario = linha.substring(linha.indexOf('<') + 1, linha.indexOf('>'));
                    responder(saida, "250 OK");
                } else if (linha.equals("DATA")) {
                    responder(saida, "354 Envie a mensagem");
                    var mensagem = new StringBuilder();
                    while ((linha = entrada.readLine()) != null && !linha.equals(".")) mensagem.append(linha).append("\r\n");
                    responder(saida, "250 Aceita");
                    fila(destinatario).add(mensagem.toString());
                    envelopes.computeIfAbsent(destinatario, k -> new LinkedBlockingQueue<>()).add(remetente);
                } else if (linha.equals("QUIT")) { responder(saida, "221 Encerrado"); break; }
                else responder(saida, "250 localhost");
            }
        } catch (IOException exception) { if (!parado) throw new IllegalStateException("Conexão SMTP local falhou.", exception); }
    }
    private void responder(PrintWriter saida, String texto) { saida.print(texto + "\r\n"); saida.flush(); }
    @Override public void close() throws IOException { parado = true; servidor.close(); conexoes.shutdownNow(); }
}
