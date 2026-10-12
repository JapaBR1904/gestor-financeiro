package br.com.nexo.email;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DiagnosticoResendProcessoTest {
    @Test void prodDefaultEPerfisMistosRecusamComandoSemBancoOuEnvio() throws Exception {
        for (String perfil : List.of("default", "prod", "production", "dev,prod", "test,production")) {
            var resultado = executar(perfil, "true", ResendHttpTeste.CHAVE, "fixture@example.com");
            assertEquals(2, resultado.status()); assertTrue(resultado.log().contains("etapa=perfil_bloqueado")); seguro(resultado.log());
        }
    }
    @Test void devSemDestinatarioNaoChamaApiMesmoHabilitado() throws Exception {
        var resultado = executar("dev", "true", ResendHttpTeste.CHAVE, "");
        assertEquals(1, resultado.status()); assertTrue(resultado.log().contains("motivo=destinatario_ausente_ou_invalido")); seguro(resultado.log());
    }
    @Test void desabilitadoRecusaDiagnostico() throws Exception {
        var resultado = executar("test", "false", "", "fixture@example.com");
        assertEquals(1, resultado.status()); assertTrue(resultado.log().contains("motivo=resend_nao_habilitado")); seguro(resultado.log());
    }
    @Test void startupSemChaveFalhaSeguroENaoAceitaChavePorArgumento() throws Exception {
        var resultado = executar("dev", "true", "", "fixture@example.com", "--nexo.resend.api-key=chave-resend-fixture");
        assertEquals(2, resultado.status()); assertTrue(resultado.log().contains("etapa=falha_inicializacao")); seguro(resultado.log());
    }
    private Resultado executar(String perfil, String habilitado, String chave, String destino, String... args) throws Exception {
        var log = Files.createTempFile("nexo-resend-processo-", ".log");
        Path java = Path.of(System.getProperty("java.home"), "bin", "java");
        if (!Files.exists(java)) java = java.resolveSibling("java.exe");
        var comando = new java.util.ArrayList<>(List.of(java.toString(), "-cp", System.getProperty("surefire.test.class.path", System.getProperty("java.class.path")), "br.com.nexo.diagnostico.DiagnosticoResendAplicacao"));
        comando.addAll(List.of(args));
        var builder = new ProcessBuilder(comando).redirectErrorStream(true).redirectOutput(log.toFile());
        var env = builder.environment();
        env.put("SPRING_PROFILES_ACTIVE", perfil); env.put("NEXO_EMAIL_PROVIDER", "resend");
        env.put("RESEND_ENABLED", habilitado); env.put("RESEND_API_KEY", chave); env.put("RESEND_FROM", "onboarding@resend.dev"); env.put("RESEND_REPLY_TO", "");
        env.put("NEXO_RESEND_DIAGNOSTIC_TO", destino);
        env.put("DB_URL", "jdbc:postgresql://127.0.0.1:1/banco_inacessivel"); env.remove("DB_PASSWORD");
        var processo = builder.start();
        try {
            assertTrue(processo.waitFor(20, TimeUnit.SECONDS), "Diagnóstico não terminou.");
            return new Resultado(processo.exitValue(), Files.readString(log));
        } finally { if (processo.isAlive()) processo.destroyForcibly(); Files.deleteIfExists(log); }
    }
    private void seguro(String log) {
        for (String valor : List.of(ResendHttpTeste.CHAVE, "fixture@example.com", "onboarding@resend.dev", "Hikari", "AuthService", "Authorization", "Bearer")) assertFalse(log.contains(valor));
    }
    private record Resultado(int status, String log) {}
}
