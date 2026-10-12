package br.com.nexo.saas;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.concurrent.TimeUnit;
import br.com.nexo.auth.AuthService;
import br.com.nexo.auth.UsuarioRepository;
import br.com.nexo.organizacao.OrganizacaoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {"nexo.pagamento.simulado.enabled=true", "nexo.email.provider=disabled"})
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "NEXO_TEST_DB_URL", matches = ".+")
@EnabledIfEnvironmentVariable(named = "NEXO_E2E", matches = "true")
class AssinaturaBrowserTest {
    @LocalServerPort int porta;
    @Autowired AuthService auth;
    @Autowired UsuarioRepository usuarios;
    @Autowired OrganizacaoService organizacoes;
    @Autowired SaasService saas;
    @DynamicPropertySource static void banco(DynamicPropertyRegistry registry) { BancoAssinaturaTeste.configurar(registry); }

    @Test void jornadaNoNavegadorComBackendEBancoReaisSemEnviarEmail() throws Exception {
        var emails = new ArrayList<String>();
        for (int i = 0; i < 8; i++) {
            var conta = BancoAssinaturaTeste.criar(organizacoes, usuarios, auth);
            saas.salvarOnboarding(conta.usuario().organizacaoId(), "empresa", java.util.List.of(), true);
            emails.add(conta.email());
        }
        var frontend = Path.of(System.getProperty("user.dir")).resolve("../frontend").normalize();
        assertTrue(Files.exists(frontend.resolve("package.json")), "Frontend deve estar ao lado do backend.");
        var log = Files.createTempFile("nexo-assinatura-browser-", ".log");
        var comando = new ProcessBuilder("npm", "run", "test:e2e").directory(frontend.toFile()).redirectErrorStream(true).redirectOutput(log.toFile());
        comando.environment().put("NEXO_E2E_API_URL", "http://localhost:" + porta);
        comando.environment().put("NEXO_E2E_EMAILS", String.join(",", emails));
        var processo = comando.start();
        try {
            assertTrue(processo.waitFor(5, TimeUnit.MINUTES), "Navegador não terminou. Consulte " + log);
            assertEquals(0, processo.exitValue(), () -> "Falha no navegador: " + log + "\n" + lerLog(log));
            System.out.println(lerLog(log));
        } finally { if (processo.isAlive()) processo.destroyForcibly(); }
    }
    private String lerLog(Path caminho) {
        try { return Files.readString(caminho).replaceAll("(?i)(cookie: )[^\\r\\n]+", "$1[oculto]"); }
        catch (java.io.IOException exception) { return "Não foi possível ler o relatório do navegador."; }
    }
}
