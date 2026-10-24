package br.com.nexo.auth;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CadastroManualServiceTest {
    @Test void modoDesligadoNaoConsultaTabelaNovaEPreservaEmailVerificado() {
        var jdbc=mock(JdbcTemplate.class); var service=new CadastroManualService(jdbc,false);
        assertTrue(service.acessoPermitido(7L,true)); assertFalse(service.acessoPermitido(7L,false)); verifyNoInteractions(jdbc);
        assertThrows(br.com.nexo.config.AcessoNegadoException.class,()->service.solicitar(7L));
    }
    @Test void pendenteOuRecusadoNegaAcessoMesmoComEmailVerificado() {
        var jdbc=mock(JdbcTemplate.class); var service=new CadastroManualService(jdbc,true);
        when(jdbc.queryForObject(anyString(),eq(Boolean.class),eq(7L),eq(true))).thenReturn(false);
        assertFalse(service.acessoPermitido(7L,true));
    }
    @Test void decisaoExigeConfirmacaoEPendenteNaoPodeSerReutilizado() {
        var jdbc=mock(JdbcTemplate.class); var service=new CadastroManualService(jdbc,true);
        assertThrows(IllegalArgumentException.class,()->service.decidir(7L,true,false,"operador")); verifyNoInteractions(jdbc);
        when(jdbc.update(anyString(),eq("aprovado"),eq("operador"),eq(7L))).thenReturn(1,0);
        assertDoesNotThrow(()->service.decidir(7L,true,true,"operador"));
        assertThrows(IllegalArgumentException.class,()->service.decidir(7L,true,true,"operador"));
    }
}
