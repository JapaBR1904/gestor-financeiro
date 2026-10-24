package br.com.nexo.auth;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import br.com.nexo.organizacao.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CadastroManualAuthTest {
    private final UsuarioRepository usuarios=mock(UsuarioRepository.class);
    private final CodigoAutenticacaoRepository codigos=mock(CodigoAutenticacaoRepository.class);
    private final SessaoUsuarioRepository sessoes=mock(SessaoUsuarioRepository.class);
    private final OrganizacaoService organizacoes=mock(OrganizacaoService.class);
    private final EmailCodigoService email=mock(EmailCodigoService.class);
    private final MembroRepository membros=mock(MembroRepository.class);
    private final CadastroManualService manual=mock(CadastroManualService.class);
    private AuthService auth;
    private Usuario usuario;
    private static final String SENHA="Senha-Sintetica-123!";
    @BeforeEach void preparar() {
        var org=mock(Organizacao.class); when(org.getId()).thenReturn(10L);
        usuario=new Usuario(org,"Pessoa","pessoa@example.com",new BCryptPasswordEncoder(12).encode(SENHA)); ReflectionTestUtils.setField(usuario,"id",7L);
        when(usuarios.buscarParaAutenticacao(anyString())).thenReturn(Optional.of(usuario));
        when(organizacoes.criar(anyString())).thenReturn(org);
        when(usuarios.save(any(Usuario.class))).thenAnswer(inv->{ Usuario u=inv.getArgument(0); ReflectionTestUtils.setField(u,"id",7L);return u; });
        when(membros.vinculo(7L,10L)).thenReturn(new MembroRepository.Vinculo(10L,"Espaço","DONO"));
        when(manual.habilitado()).thenReturn(true);
        auth=new AuthService(usuarios,codigos,sessoes,organizacoes,email,membros,mock(ConfiguracaoCadastro.class),manual);
    }
    @Test void cadastroFicaPendenteSemEmailNemSessao() {
        var resultado=auth.cadastrar("Pessoa","pessoa@example.com",SENHA,SENHA);
        assertTrue(resultado.aprovacaoManualNecessaria()); assertNull(resultado.autenticacao());
        verify(manual).solicitar(7L); verifyNoInteractions(email,sessoes);
        var captura=org.mockito.ArgumentCaptor.forClass(Usuario.class); verify(usuarios).save(captura.capture()); assertFalse(captura.getValue().emailVerificado());
    }
    @Test void senhaCorretaNaoLiberaPendenteEContaAprovadaNaoFingeEmailVerificado() {
        assertThrows(IllegalArgumentException.class,()->auth.login("pessoa@example.com",SENHA)); verifyNoInteractions(sessoes);
        when(manual.acessoPermitido(7L,false)).thenReturn(true);
        assertNotNull(auth.login("pessoa@example.com",SENHA).token()); assertFalse(usuario.emailVerificado()); verifyNoInteractions(email);
    }
    @Test void sessaoExistenteNaoIgnoraRecusaOuPendencia() {
        var sessao=new SessaoUsuario(usuario,AuthService.sha256("token"),java.time.OffsetDateTime.now().plusDays(1));
        when(sessoes.findByTokenHash(anyString())).thenReturn(Optional.of(sessao));
        assertThrows(IllegalArgumentException.class,()->auth.autenticarSessao("token"));
        verify(sessoes,never()).registrarAcesso(anyString(),any());
    }
    @Test void verificarCodigoNaoContornaAprovacaoManual() {
        var registro=new CodigoAutenticacao("pessoa@example.com",new BCryptPasswordEncoder(12).encode("123456"),"verificacao_email",java.time.OffsetDateTime.now().plusMinutes(10));
        when(codigos.findFirstByEmailIgnoreCaseAndFinalidadeOrderByCriadoEmDesc(anyString(),anyString())).thenReturn(Optional.of(registro));
        assertThrows(IllegalArgumentException.class,()->auth.verificarCodigo("pessoa@example.com","123456","verificacao_email"));
        verifyNoInteractions(sessoes);
    }
}
