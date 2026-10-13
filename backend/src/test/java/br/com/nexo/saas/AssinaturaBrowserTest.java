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
    @Autowired AssinaturaService assinatura;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @org.springframework.test.context.bean.override.mockito.MockitoBean br.com.nexo.email.EmailProvider emailProvider;
    @DynamicPropertySource static void banco(DynamicPropertyRegistry registry) { BancoAssinaturaTeste.configurar(registry); }

    @Test void jornadaNoNavegadorComBackendEBancoReaisSemEnviarEmail() throws Exception {
        var caixa = Files.createTempFile("nexo-email-browser-", ".json");
        var mensagens = new java.util.HashMap<String,String>();
        var json = tools.jackson.databind.json.JsonMapper.builder().build();
        Files.writeString(caixa, "{}");
        org.mockito.Mockito.when(emailProvider.enviar(org.mockito.ArgumentMatchers.any())).thenAnswer(chamada -> {
            br.com.nexo.email.EmailMensagem mensagem = chamada.getArgument(0);
            if (!mensagem.destinatario().endsWith("@example.com")) throw new IllegalArgumentException("Use apenas contas sintéticas no teste.");
            if (mensagem.texto().contains("Seu código do Nexo")) synchronized (mensagens) {
                mensagens.put(mensagem.destinatario() + "|" + mensagem.assunto(), mensagem.texto());
                Files.writeString(caixa, json.writeValueAsString(mensagens));
            }
            return "envio-sintetico";
        });
        var emails = new ArrayList<String>();
        BancoAssinaturaTeste.Conta donoLegado=null;
        for (int i = 0; i < 12; i++) {
            var conta = BancoAssinaturaTeste.criar(organizacoes, usuarios, auth);
            saas.salvarOnboarding(conta.usuario().organizacaoId(), "empresa", java.util.List.of(), true);
            emails.add(conta.email());
            if(i==10)donoLegado=conta;
        }
        var checkout=assinatura.criar(donoLegado.usuario(),"business",java.util.UUID.randomUUID(),false);
        assinatura.confirmar(donoLegado.usuario(),checkout.id(),ProvedorPagamento.Metodo.pix,ProvedorPagamento.Cenario.aprovado);
        var legado=new br.com.nexo.auth.Usuario(organizacoes.buscarPorId(donoLegado.usuario().organizacaoId()),"Pessoa legada","assinatura-"+java.util.UUID.randomUUID()+"@example.com",new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(4).encode(BancoAssinaturaTeste.SENHA));
        legado.verificarEmail();usuarios.save(legado);jdbc.update("UPDATE usuarios SET papel='membro' WHERE id=?",legado.getId());emails.add(legado.getEmail());
        var frontend = Path.of(System.getProperty("user.dir")).resolve("../frontend").normalize();
        assertTrue(Files.exists(frontend.resolve("package.json")), "Frontend deve estar ao lado do backend.");
        var log = Files.createTempFile("nexo-assinatura-browser-", ".log");
        var comando = new ProcessBuilder("npm", "run", "test:e2e").directory(frontend.toFile()).redirectErrorStream(true).redirectOutput(log.toFile());
        comando.environment().put("NEXO_E2E_API_URL", "http://localhost:" + porta);
        comando.environment().put("NEXT_PUBLIC_API_URL", "http://localhost:" + porta);
        comando.environment().put("NEXO_E2E_EMAIL_INBOX", caixa.toString());
        comando.environment().put("NEXO_E2E_EMAILS", String.join(",", emails));
        var processo = comando.start();
        try {
            assertTrue(processo.waitFor(10, TimeUnit.MINUTES), "Navegador não terminou. Consulte " + log);
            assertEquals(0, processo.exitValue(), () -> "Falha no navegador: " + log + "\n" + lerLog(log));
            System.out.println(lerLog(log));
        } finally { if (processo.isAlive()) processo.destroyForcibly(); Files.deleteIfExists(caixa); }
    }
    private String lerLog(Path caminho) {
        try { return Files.readString(caminho).replaceAll("(?i)(cookie: )[^\\r\\n]+", "$1[oculto]"); }
        catch (java.io.IOException exception) { return "Não foi possível ler o relatório do navegador."; }
    }
}
