package br.com.nexo.admin;
import br.com.nexo.auth.CadastroManualService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AdminCadastrosControllerTest {
    @Test void decisaoSemEscolhaExplicitaNaoRecusaContaPorAcidente() throws Exception {
        var admin=mock(AdminCadastrosService.class);var cadastros=mock(CadastroManualService.class);
        var mvc=MockMvcBuilders.standaloneSetup(new AdminCadastrosController(admin,cadastros)).build();
        mvc.perform(post("/api/admin/cadastros/7").contentType(MediaType.APPLICATION_JSON).content(JsonMapper.builder().build().writeValueAsString(java.util.Map.of("identidadeConfirmada",false))))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(admin,cadastros);
    }
    @Test void loginEntregaSomenteCookieAdministrativoSeguroSemTokenNoJson() throws Exception {
        var admin=mock(AdminCadastrosService.class);var cadastros=mock(CadastroManualService.class);
        String token="a".repeat(64);when(admin.seguro()).thenReturn(true);when(admin.entrar(any(),eq("operador"),anyString())).thenReturn(token);
        var mvc=MockMvcBuilders.standaloneSetup(new AdminCadastrosController(admin,cadastros)).build();
        String body=JsonMapper.builder().build().writeValueAsString(java.util.Map.of("usuario","operador","senha","Senha-Sintetica-Administrativa-123!"));
        var resposta=mvc.perform(post("/api/admin/cadastros/login").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andReturn().getResponse();
        String cookie=resposta.getHeader("Set-Cookie");assertNotNull(cookie);assertTrue(cookie.contains("HttpOnly"));assertTrue(cookie.contains("Secure"));assertTrue(cookie.contains("SameSite=Strict"));assertTrue(cookie.contains("Path=/api/admin/cadastros"));assertFalse(resposta.getContentAsString().contains(token));
    }
}
