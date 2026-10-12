package br.com.nexo.saas;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import br.com.nexo.auth.AuthService.UsuarioAutenticado;
import br.com.nexo.config.AcessoNegadoException;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class IsolamentoSimuladorTest {
    @ParameterizedTest @CsvSource({"dev,true,true", "test,true,true", "test,false,false", "default,true,false", "prod,true,false", "production,true,false", "'dev,prod',true,false", "'test,production',true,false"})
    void simuladorExigeFlagEPerfilEProducoesTemPrecedencia(String perfis, boolean flag, boolean esperado) {
        new ApplicationContextRunner().withUserConfiguration(PagamentoSimulado.class, PoliticaAssinatura.class, AssinaturaService.class)
                .withBean(AssinaturaRepository.class, () -> mock(AssinaturaRepository.class))
                .withPropertyValues("spring.profiles.active=" + perfis, "nexo.pagamento.simulado.enabled=" + flag)
                .run(context -> {
                    assertEquals(esperado, context.containsBean("pagamentoSimulado"));
                    var politica = context.getBean(PoliticaAssinatura.class);
                    assertEquals(esperado, politica.simulacaoHabilitada());
                    var simulada = new AssinaturaRepository.Estado("pro", "ativa", 0, null, "simulado");
                    assertEquals(esperado ? Plano.PRO : Plano.FREE, politica.planoEfetivo(simulada));
                    var prototipo = new AssinaturaRepository.Estado("business", "prototipo", 0, null, null);
                    assertEquals(esperado ? Plano.BUSINESS : Plano.FREE, politica.planoEfetivo(prototipo));
                    assertEquals(Plano.PRO, politica.planoEfetivo(new AssinaturaRepository.Estado("pro", "ativa", 0, null, "futuro")));
                    if (!esperado) {
                        var usuario = new UsuarioAutenticado(1L, "Teste", "teste@example.com", "proprietario", 1L, "Teste");
                        var service = context.getBean(AssinaturaService.class);
                        assertThrows(AcessoNegadoException.class, () -> service.criar(usuario, "business", UUID.randomUUID(), false));
                        assertThrows(AcessoNegadoException.class, () -> service.confirmar(usuario, UUID.randomUUID(), ProvedorPagamento.Metodo.pix, ProvedorPagamento.Cenario.aprovado));
                        assertThrows(AcessoNegadoException.class, () -> service.cancelarCheckout(usuario, UUID.randomUUID()));
                        verifyNoInteractions(context.getBean(AssinaturaRepository.class));
                    }
                });
    }
    @Test void flagNaoInformadaDesabilitaSimulador() {
        new ApplicationContextRunner().withUserConfiguration(PagamentoSimulado.class, PoliticaAssinatura.class)
                .withPropertyValues("spring.profiles.active=dev")
                .run(context -> assertFalse(context.getBean(PoliticaAssinatura.class).simulacaoHabilitada()));
    }
}
