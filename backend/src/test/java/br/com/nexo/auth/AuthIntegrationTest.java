package br.com.nexo.auth;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ConcurrentHashMap;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(AuthIntegrationTest.EmailConfig.class)
@EnabledIfEnvironmentVariable(named = "NEXO_TEST_DB_URL", matches = ".+")
class AuthIntegrationTest {
    private static final String SENHA = "senha-de-teste-segura";
    @Autowired AuthService auth;
    @Autowired UsuarioRepository usuarios;
    @Autowired JdbcTemplate jdbc;
    @Autowired EmailTeste emails;

    @DynamicPropertySource
    static void banco(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("NEXO_TEST_DB_URL"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("NEXO_TEST_DB_USERNAME", "nexo_app"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("NEXO_TEST_DB_PASSWORD", ""));
    }

    @Test
    void cadastroArmazenaHashEExigeVerificacao() {
        String email = cadastrar();
        Usuario usuario = usuarios.findByEmailIgnoreCase(email).orElseThrow();
        assertNotEquals(SENHA, usuario.getSenhaHash());
        assertTrue(new BCryptPasswordEncoder().matches(SENHA, usuario.getSenhaHash()));
        assertFalse(usuario.emailVerificado());
        assertThrows(IllegalArgumentException.class, () -> auth.login(email, SENHA));
        var sessao = auth.verificarCodigo(email, emails.codigo(email), "verificacao_email");
        assertEquals(email, auth.autenticarSessao(sessao.token()).email());
        assertTrue(usuarios.findByEmailIgnoreCase(email).orElseThrow().emailVerificado());
    }

    @Test
    void validaSenhaNoBackendInclusiveLimiteUtf8() {
        for (String senha : new String[]{"", "curta", " ".repeat(8), "é".repeat(37)}) {
            assertThrows(IllegalArgumentException.class, () -> auth.cadastrar("Teste", emailNovo(), senha, senha));
        }
        assertThrows(IllegalArgumentException.class, () -> auth.cadastrar("Teste", emailNovo(), SENHA, "outra-senha"));
    }

    @Test
    void loginValidaSenhaContaEStatus() {
        String email = contaVerificada();
        assertEquals(email, auth.login(email, SENHA).usuario().email());
        assertThrows(IllegalArgumentException.class, () -> auth.login(email, "senha-errada"));
        assertThrows(IllegalArgumentException.class, () -> auth.login(emailNovo(), SENHA));
        String token = auth.login(email, SENHA).token();
        jdbc.update("update usuarios set ativo = false where email = ?", email);
        assertThrows(IllegalArgumentException.class, () -> auth.login(email, SENHA));
        assertThrows(IllegalArgumentException.class, () -> auth.autenticarSessao(token));
    }

    @Test
    void bloqueiaLoginAposDezFalhasPersistidas() {
        String email = contaVerificada();
        for (int i = 0; i < 10; i++) assertThrows(IllegalArgumentException.class, () -> auth.login(email, "senha-errada"));
        assertEquals(10, jdbc.queryForObject("select tentativas_login from usuarios where email = ?", Integer.class, email));
        assertThrows(IllegalArgumentException.class, () -> auth.login(email, SENHA));
        jdbc.update("update usuarios set login_janela_em = now() - interval '16 minutes' where email = ?", email);
        assertEquals(email, auth.login(email, SENHA).usuario().email());
    }

    @Test
    void codigoInvalidoPersisteTentativasEBloqueia() {
        String email = cadastrar();
        String correto = emails.codigo(email);
        String errado = correto.equals("000000") ? "111111" : "000000";
        for (int i = 0; i < 5; i++) assertThrows(IllegalArgumentException.class, () -> auth.verificarCodigo(email, errado, "verificacao_email"));
        assertEquals(5, jdbc.queryForObject("select tentativas from codigos_autenticacao where email = ?", Integer.class, email));
        assertThrows(IllegalArgumentException.class, () -> auth.verificarCodigo(email, correto, "verificacao_email"));
    }

    @Test
    void rejeitaCodigoExpiradoReutilizadoEFinalidadeErrada() {
        String email = cadastrar();
        String codigo = emails.codigo(email);
        assertThrows(IllegalArgumentException.class, () -> auth.verificarRecuperacao(email, codigo));
        jdbc.update("update codigos_autenticacao set expira_em = now() - interval '1 minute' where email = ?", email);
        assertThrows(IllegalArgumentException.class, () -> auth.verificarCodigo(email, codigo, "verificacao_email"));
        String outro = cadastrar();
        auth.verificarCodigo(outro, emails.codigo(outro), "verificacao_email");
        assertThrows(IllegalArgumentException.class, () -> auth.verificarCodigo(outro, emails.codigo(outro), "verificacao_email"));
    }

    @Test
    void recuperacaoTrocaSenhaRevogaSessoesEConsomeProva() {
        String email = contaVerificada();
        String token = auth.login(email, SENHA).token();
        auth.solicitarCodigo(email, "recuperacao_senha");
        String codigo = emails.codigo(email);
        String prova = auth.verificarRecuperacao(email, codigo);
        assertThrows(IllegalArgumentException.class, () -> auth.verificarRecuperacao(email, codigo));
        assertNotEquals(prova, jdbc.queryForObject("select prova_hash from codigos_autenticacao where email = ? and finalidade = 'recuperacao_senha'", String.class, email));
        auth.redefinirSenha(prova, "senha-nova-segura", "senha-nova-segura");
        assertThrows(IllegalArgumentException.class, () -> auth.autenticarSessao(token));
        assertThrows(IllegalArgumentException.class, () -> auth.login(email, SENHA));
        assertEquals(email, auth.login(email, "senha-nova-segura").usuario().email());
        assertThrows(IllegalArgumentException.class, () -> auth.redefinirSenha(prova, SENHA, SENHA));
    }

    @Test
    void recuperacaoRejeitaProvaInvalidaExpiradaESenhasDiferentes() {
        assertThrows(IllegalArgumentException.class, () -> auth.redefinirSenha(null, SENHA, SENHA));
        assertThrows(IllegalArgumentException.class, () -> auth.redefinirSenha("x".repeat(43), SENHA, SENHA));
        String email = contaVerificada();
        auth.solicitarCodigo(email, "recuperacao_senha");
        String prova = auth.verificarRecuperacao(email, emails.codigo(email));
        assertThrows(IllegalArgumentException.class, () -> auth.redefinirSenha(prova, SENHA, "diferente"));
        jdbc.update("update codigos_autenticacao set prova_expira_em = now() - interval '1 minute' where email = ?", email);
        assertThrows(IllegalArgumentException.class, () -> auth.redefinirSenha(prova, SENHA, SENHA));
    }

    @Test
    void recuperacaoNaoRevelaContasEImpedeReenvioImediato() {
        String ausente = emailNovo();
        auth.solicitarCodigo(ausente, "recuperacao_senha");
        auth.solicitarCodigo(ausente, "recuperacao_senha");
        assertFalse(emails.codigos.containsKey(ausente));
        String email = contaVerificada();
        auth.solicitarCodigo(email, "recuperacao_senha");
        String codigo = emails.codigo(email);
        auth.solicitarCodigo(email, "recuperacao_senha");
        assertEquals(codigo, emails.codigo(email));
        assertEquals(1, jdbc.queryForObject("select count(*) from codigos_autenticacao where email = ? and finalidade = 'recuperacao_senha'", Integer.class, email));
        jdbc.update("update usuarios set ativo = false where email = ?", email);
        assertThrows(IllegalArgumentException.class, () -> auth.verificarRecuperacao(email, codigo));
    }

    @Test
    void contasAntigasDefinemSenhaSemPerderOrganizacaoELogoutRevogaSessao() {
        String email = contaVerificada();
        Long organizacao = jdbc.queryForObject("select organizacao_id from usuarios where email = ?", Long.class, email);
        jdbc.update("update usuarios set senha_hash = null where email = ?", email);
        assertThrows(IllegalArgumentException.class, () -> auth.login(email, "comparacao-sem-conta"));
        assertThrows(IllegalArgumentException.class, () -> auth.login(email, SENHA));
        auth.solicitarCodigo(email, "recuperacao_senha");
        auth.redefinirSenha(auth.verificarRecuperacao(email, emails.codigo(email)), SENHA, SENHA);
        var sessao = auth.login(email, SENHA);
        assertEquals(organizacao, sessao.usuario().organizacaoId());
        auth.encerrarSessao(sessao.token());
        assertThrows(IllegalArgumentException.class, () -> auth.autenticarSessao(sessao.token()));
    }

    @Test
    void codigoEProvaSoPodemSerConsumidosUmaVezMesmoEmParalelo() throws Exception {
        String email = cadastrar();
        String codigo = emails.codigo(email);
        assertUmaVez(() -> auth.verificarCodigo(email, codigo, "verificacao_email"));
        auth.solicitarCodigo(email, "recuperacao_senha");
        String prova = auth.verificarRecuperacao(email, emails.codigo(email));
        assertUmaVez(() -> { auth.redefinirSenha(prova, SENHA, SENHA); return null; });
    }

    @Test
    void recuperacaoRejeitaCodigoInvalidoEExpirado() {
        String email = contaVerificada();
        auth.solicitarCodigo(email, "recuperacao_senha");
        String codigo = emails.codigo(email);
        String errado = codigo.equals("000000") ? "111111" : "000000";
        assertThrows(IllegalArgumentException.class, () -> auth.verificarRecuperacao(email, errado));
        assertEquals(1, jdbc.queryForObject("select tentativas from codigos_autenticacao where email = ? and finalidade = 'recuperacao_senha'", Integer.class, email));
        jdbc.update("update codigos_autenticacao set expira_em = now() - interval '1 minute' where email = ?", email);
        assertThrows(IllegalArgumentException.class, () -> auth.verificarRecuperacao(email, codigo));
    }

    private void assertUmaVez(Callable<?> operacao) throws Exception {
        CountDownLatch largada = new CountDownLatch(1);
        Callable<Boolean> tentativa = () -> {
            assertTrue(largada.await(10, TimeUnit.SECONDS));
            try { operacao.call(); return true; }
            catch (IllegalArgumentException exception) { return false; }
        };
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeira = executor.submit(tentativa);
            var segunda = executor.submit(tentativa);
            largada.countDown();
            int sucessos = (primeira.get(20, TimeUnit.SECONDS) ? 1 : 0) + (segunda.get(20, TimeUnit.SECONDS) ? 1 : 0);
            assertEquals(1, sucessos);
        }
    }

    private String cadastrar() {
        String email = emailNovo();
        auth.cadastrar("Pessoa Teste", email, SENHA, SENHA);
        return email;
    }
    private String contaVerificada() {
        String email = cadastrar();
        auth.verificarCodigo(email, emails.codigo(email), "verificacao_email");
        return email;
    }
    private String emailNovo() { return "teste-" + UUID.randomUUID() + "@example.com"; }

    @TestConfiguration
    static class EmailConfig {
        @Bean @Primary EmailTeste emailTeste() { return new EmailTeste(); }
    }
    static class EmailTeste extends EmailCodigoService {
        final Map<String, String> codigos = new ConcurrentHashMap<>();
        EmailTeste() { super(null, true, "teste@example.com"); }
        @Override public void enviarCodigo(String email, String codigo, String finalidade) { codigos.put(email, codigo); }
        @Override public void enviarRecuperacao(String email, String codigo) { codigos.put(email, codigo); }
        String codigo(String email) { return codigos.get(email); }
    }
}
