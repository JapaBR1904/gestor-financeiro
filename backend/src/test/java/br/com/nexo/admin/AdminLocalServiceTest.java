package br.com.nexo.admin;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.junit.jupiter.api.Assertions.*;

class AdminLocalServiceTest {
    private AdminLocalService service(String perfil, String banco) {
        var ambiente = new MockEnvironment(); ambiente.setActiveProfiles(perfil.split(","));
        return new AdminLocalService(ambiente, banco);
    }
    private MockHttpServletRequest request(String ip) { var r = new MockHttpServletRequest(); r.setRemoteAddr(ip); return r; }
    @Test void credencialTemporariaNaoExisteEmProducaoNoBancoRealOuParaAcessoRemoto() {
        String banco = "jdbc:postgresql://localhost:55433/nexo_test";
        for (String perfil : new String[]{"prod", "production", "dev,prod", "test,production", "default"}) {
            var admin = service(perfil, banco);
            assertFalse(admin.disponivel(request("127.0.0.1")));
            assertThrows(RuntimeException.class, () -> admin.entrar(request("127.0.0.1"), "admin", "admin"));
        }
        for (String url : new String[]{"jdbc:postgresql://localhost:5432/nexo", "jdbc:postgresql://db.example.com/nexo_test", "jdbc:postgresql://localhost/nexo_test?currentSchema=real", "", "invalido"})
            assertFalse(service("dev",url).disponivel(request("127.0.0.1")));
        assertFalse(service("test",banco).disponivel(request("203.0.113.1")));
        var origem = request("127.0.0.1"); origem.addHeader("Origin", "https://site.example.com");
        assertFalse(service("test",banco).disponivel(origem));
    }
    @Test void sessaoAdministrativaSeparadaExpiraELogoutRevoga() {
        var admin = service("test", "jdbc:postgresql://127.0.0.1:55433/nexo_test"); var r = request("127.0.0.1");
        assertThrows(RuntimeException.class, () -> admin.exigirSessao(r, null));
        String token = admin.entrar(r, "admin", "admin"); assertDoesNotThrow(() -> admin.exigirSessao(r, token));
        assertThrows(RuntimeException.class, () -> admin.exigirSessao(r, "a".repeat(64)));
        org.springframework.test.util.ReflectionTestUtils.setField(admin, "expira", java.time.Instant.now().minusSeconds(1));
        assertThrows(RuntimeException.class, () -> admin.exigirSessao(r, token));
        String novo = admin.entrar(r,"admin","admin"); admin.sair(r,novo);
        assertThrows(RuntimeException.class, () -> admin.exigirSessao(r,novo));
    }
    @Test void bloqueiaCincoFalhasSemAceitarCredencialForaDoAmbiente() {
        var admin = service("dev", "jdbc:postgresql://127.0.0.1:55433/nexo_test"); var r = request("127.0.0.1");
        for (int i=0;i<5;i++) assertThrows(RuntimeException.class, () -> admin.entrar(r,"admin","incorreta"));
        assertThrows(RuntimeException.class, () -> admin.entrar(r,"admin","admin"));
    }
}
