package br.com.nexo.auth;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RecuperacaoAssistidaServiceTest {
    private final CodigoAutenticacaoRepository codigos = mock(CodigoAutenticacaoRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final RecuperacaoAssistidaService service = new RecuperacaoAssistidaService(codigos,usuarios);
    private final Usuario usuario = new Usuario(new br.com.nexo.organizacao.Organizacao("Teste"), "Teste", "pessoa@example.com", "hash-fixture");
    private RecuperacaoAssistidaService.Solicitacao solicitar() {
        ReflectionTestUtils.setField(usuario,"id",9L);
        when(usuarios.buscarParaAutenticacao("pessoa@example.com")).thenReturn(Optional.of(usuario));
        when(codigos.findFirstByEmailIgnoreCaseAndFinalidadeOrderByCriadoEmDesc(anyString(),anyString())).thenReturn(Optional.empty());
        when(codigos.saveAndFlush(any(CodigoAutenticacao.class))).thenAnswer(inv -> {
            CodigoAutenticacao c=inv.getArgument(0); ReflectionTestUtils.setField(c,"id",41L); c.aoCriar();
            when(codigos.findById(41L)).thenReturn(Optional.of(c));
            when(codigos.buscarAssistidaBloqueada(41L)).thenReturn(Optional.of(c));
            when(codigos.findLockedByProvaHash(anyString())).thenReturn(Optional.of(c));
            when(codigos.buscarEmailDaProva(anyString())).thenReturn(Optional.of(c.getEmail()));
            return c;
        });
        return service.solicitar("pessoa@example.com",null);
    }
    @Test void navegadorPendenteNaoPodeRedefinirAntesDeIdentidadeConfirmada() {
        var pedido=solicitar(); var registro=codigos.findById(41L).orElseThrow();
        assertEquals("aguardando",service.consultar(pedido.prova()).estado()); assertFalse(registro.provaValida());
        var sessoes=mock(SessaoUsuarioRepository.class);
        var auth=new AuthService(usuarios,codigos,sessoes,mock(br.com.nexo.organizacao.OrganizacaoService.class),mock(EmailCodigoService.class),mock(br.com.nexo.organizacao.MembroRepository.class),mock(ConfiguracaoCadastro.class));
        assertThrows(IllegalArgumentException.class,()->auth.redefinirSenha(pedido.prova(),"Senha-Segura-Teste123!","Senha-Segura-Teste123!"));
        verify(sessoes,never()).revogarDoUsuario(anyLong(),any());
        assertThrows(IllegalArgumentException.class,()->service.decidir(41L,true,false)); assertFalse(registro.provaValida());
        service.decidir(41L,true,true); assertEquals("liberada",service.consultar(pedido.prova()).estado());
        auth.redefinirSenha(pedido.prova(),"Senha-Segura-Teste123!","Senha-Segura-Teste123!");
        verify(sessoes).revogarDoUsuario(eq(9L),any());
        assertThrows(IllegalArgumentException.class,()->auth.redefinirSenha(pedido.prova(),"Outra-Senha-Teste123!","Outra-Senha-Teste123!"));
    }
    @Test void recusaExpiracaoEContaAusenteNuncaLiberamProva() {
        var pedido=solicitar(); service.decidir(41L,false,false); assertEquals("expirada",service.consultar(pedido.prova()).estado());
        var outro=solicitar(); var c=codigos.findById(41L).orElseThrow(); ReflectionTestUtils.setField(c,"provaExpiraEm",OffsetDateTime.now().minusSeconds(1));
        assertThrows(IllegalArgumentException.class,()->service.decidir(41L,true,true)); assertFalse(c.provaValida());
        var ultimo=solicitar(); when(usuarios.buscarParaAutenticacao(anyString())).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class,()->service.decidir(41L,true,true)); assertEquals("aguardando",service.consultar(ultimo.prova()).estado());
        assertFalse(ultimo.toString().contains(ultimo.prova()));
    }
    @Test void pedidoRepeteSomenteNoNavegadorQuePossuiProvaEStatusNaoRevelaEmail() {
        var pedido=solicitar(); assertEquals(pedido.protocolo(),service.solicitar("pessoa@example.com",pedido.prova()).protocolo());
        assertEquals("ausente",service.consultar(null).estado()); assertEquals("ausente",service.consultar("curto").estado());
        assertFalse(service.consultar(pedido.prova()).toString().contains("pessoa@example.com"));
    }
}
