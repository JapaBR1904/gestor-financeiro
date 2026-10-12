package br.com.nexo.auth;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DiagnosticoSmtpProcessoTest {
    @Test void comandoIsoladoEnviaSemBancoAuthOuOverrideSmtpPorArgumento() throws Exception {
        try (var smtp = new SmtpLocalTeste()) {
            var resultado = executar(smtp, "dev", "destino-fixture@example.com", "--spring.mail.host=servidor-nao-permitido.invalid");
            assertEquals(0, resultado.status());
            assertTrue(resultado.log().contains("etapa=sucesso"));
            String mensagem = smtp.receber("destino-fixture@example.com"); assertNotNull(mensagem);
            assertEquals("remetente-fixture@example.com", smtp.receberEnvelope("destino-fixture@example.com"));
            assertTrue(mensagem.contains("X-Nexo-Diagnostico-Id:"));
            assertFalse(resultado.log().contains("Hikari")); assertFalse(resultado.log().contains("AuthService"));
            seguro(resultado.log());
        }
    }
    @Test void comandoProducoesInclusivePerfilMistoNaoEnvia() throws Exception {
        try (var smtp = new SmtpLocalTeste()) {
            for (String perfil : List.of("prod", "production", "dev,prod", "test,production", "default")) {
                var resultado = executar(smtp, perfil, "destino-fixture@example.com");
                assertEquals(2, resultado.status()); assertTrue(resultado.log().contains("etapa=perfil_bloqueado"));
                assertFalse(resultado.log().contains("etapa=chamada_sender")); seguro(resultado.log());
            }
            assertEquals(0, smtp.quantidade("destino-fixture@example.com"));
        }
    }
    @Test void comandoSemDestinatarioSaiComFalhaClara() throws Exception {
        try (var smtp = new SmtpLocalTeste()) {
            var resultado = executar(smtp, "test", "");
            assertEquals(1, resultado.status()); assertTrue(resultado.log().contains("motivo=destinatario_ausente"));
            assertFalse(resultado.log().contains("etapa=chamada_sender")); seguro(resultado.log());
        }
    }
    private Resultado executar(SmtpLocalTeste smtp, String perfil, String destino, String... args) throws Exception {
        var log = Files.createTempFile("nexo-diagnostico-processo-", ".log");
        Path java = Path.of(System.getProperty("java.home"), "bin", "java");
        if (!Files.exists(java)) java = java.resolveSibling("java.exe");
        var comando = new java.util.ArrayList<>(List.of(java.toString(), "-cp", System.getProperty("surefire.test.class.path", System.getProperty("java.class.path")), "br.com.nexo.diagnostico.DiagnosticoSmtpAplicacao"));
        comando.addAll(List.of(args));
        var builder = new ProcessBuilder(comando).redirectErrorStream(true).redirectOutput(log.toFile());
        var env = builder.environment();
        env.put("SPRING_PROFILES_ACTIVE", perfil); env.put("NEXO_SMTP_DIAGNOSTIC_TO", destino);
        env.put("MAIL_ENABLED", "true"); env.put("MAIL_HOST", "localhost"); env.put("MAIL_PORT", Integer.toString(smtp.porta()));
        env.put("MAIL_FROM", "remetente-fixture@example.com"); env.put("MAIL_USERNAME", ""); env.put("MAIL_PASSWORD", "");
        env.put("MAIL_SMTP_AUTH", "false"); env.put("MAIL_STARTTLS", "false"); env.put("MAIL_STARTTLS_REQUIRED", "false");
        env.put("DB_URL", "jdbc:postgresql://127.0.0.1:1/banco_inacessivel"); env.remove("DB_PASSWORD");
        var processo = builder.start();
        try {
            assertTrue(processo.waitFor(20, TimeUnit.SECONDS), "Comando diagnóstico não terminou.");
            return new Resultado(processo.exitValue(), Files.readString(log));
        } finally { if (processo.isAlive()) processo.destroyForcibly(); Files.deleteIfExists(log); }
    }
    private void seguro(String log) {
        for (String dado : List.of("remetente-fixture@example.com", "destino-fixture@example.com", "MAIL_PASSWORD", "MimeMessage@")) assertFalse(log.contains(dado));
    }
    private record Resultado(int status, String log) {}
}
