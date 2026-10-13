package br.com.nexo.saas;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;

class LogNavegadorTest {
    @TempDir Path temporario;
    @Test void ocultaCookieInteiroECodigoSemApagarDiagnostico() throws Exception {
        var arquivo = temporario.resolve("browser.log");
        Files.writeString(arquivo, "Set-Cookie: sessao=valor_sintetico_com_r_e_n; HttpOnly\nCódigo: 123456\nFalha de rede\n");
        String log = ReflectionTestUtils.invokeMethod(new AssinaturaBrowserTest(), "lerLog", arquivo);
        assertNotNull(log);
        assertFalse(log.contains("valor_sintetico"));
        assertFalse(log.contains("123456"));
        assertTrue(log.contains("Set-Cookie: [oculto]"));
        assertTrue(log.contains("Falha de rede"));
    }
    @Test void ocultaTokenBase64UrlComHifensNasExtremidades() throws Exception {
        var arquivo = temporario.resolve("browser.log");
        var token = "-" + "a".repeat(41) + "-"; // Dado inexistente, exclusivamente para verificar a máscara.
        Files.writeString(arquivo, "Link /convite#" + token + "\nContinua seguro\n");
        String log = ReflectionTestUtils.invokeMethod(new AssinaturaBrowserTest(), "lerLog", arquivo);
        assertNotNull(log);
        assertFalse(log.contains(token));
        assertTrue(log.contains("[identificador omitido]"));
        assertTrue(log.contains("Continua seguro"));
    }
}
