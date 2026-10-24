package br.com.nexo.admin;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import br.com.nexo.config.AcessoNegadoException;
import static org.junit.jupiter.api.Assertions.*;

class AdminCadastrosServiceTest {
    private static final String SENHA="Senha-Sintetica-Administrativa-123!";
    private AdminCadastrosService criar() { return new AdminCadastrosService(new MockEnvironment().withProperty("spring.profiles.active","prod"),true,"operador",SENHA,"https://nexo.example",true); }
    private MockHttpServletRequest request(String metodo,String origem) { var r=new MockHttpServletRequest(metodo,"/api/admin/cadastros"); if(origem!=null)r.addHeader("Origin",origem); return r; }
    @Test void producaoExigeSegredoForteHttpsECookieSeguro() {
        var env=new MockEnvironment(); env.setActiveProfiles("dev","prod");
        assertThrows(IllegalStateException.class,()->new AdminCadastrosService(env,true,"admin","admin","https://nexo.example",true));
        assertThrows(IllegalStateException.class,()->new AdminCadastrosService(env,true,"operador",SENHA,"http://localhost:3000",false));
        assertThrows(IllegalStateException.class,()->new AdminCadastrosService(env,true,"operador",SENHA,"https://nexo.example",false));
        assertThrows(IllegalStateException.class,()->new AdminCadastrosService(env,true,"operador",SENHA,"https://nexo.example/externo",true));
        var desligado=new AdminCadastrosService(env,false,"","","http://localhost:3000",false);
        assertThrows(AcessoNegadoException.class,()->desligado.entrar(request("POST","http://localhost:3000"),"admin","admin"));
    }
    @Test void origemFalsaOuAusenteNaoAutorizaENaoAceitaSessaoComum() {
        var service=criar();
        assertThrows(AcessoNegadoException.class,()->service.entrar(request("POST",null),"operador",SENHA));
        var falsa=request("POST","https://outro.example"); falsa.addHeader("X-Forwarded-For","127.0.0.1");
        assertThrows(AcessoNegadoException.class,()->service.entrar(falsa,"operador",SENHA));
        assertThrows(AcessoNegadoException.class,()->service.exigirSessao(request("GET",null),"sessao-comum-do-usuario"));
    }
    @Test void sessaoExpiraLogoutEReentradaInvalidamAcessoAnterior() {
        var service=criar(); var req=request("POST","https://nexo.example");
        String primeiro=service.entrar(req,"operador",SENHA); assertDoesNotThrow(()->service.exigirSessao(req,primeiro));
        String segundo=service.entrar(req,"operador",SENHA); assertThrows(AcessoNegadoException.class,()->service.exigirSessao(req,primeiro));
        org.springframework.test.util.ReflectionTestUtils.setField(service,"expira",java.time.Instant.now().minusSeconds(1));
        assertThrows(AcessoNegadoException.class,()->service.exigirSessao(req,segundo));
        String terceiro=service.entrar(req,"operador",SENHA); service.sair(req,terceiro);
        assertThrows(AcessoNegadoException.class,()->service.exigirSessao(req,terceiro));
    }
    @Test void cincoFalhasBloqueiamAteCredencialCorreta() {
        var service=criar(); var req=request("POST","https://nexo.example");
        for(int i=0;i<5;i++) assertThrows(AcessoNegadoException.class,()->service.entrar(req,"operador","errada"));
        assertThrows(AcessoNegadoException.class,()->service.entrar(req,"operador",SENHA));
    }
}
