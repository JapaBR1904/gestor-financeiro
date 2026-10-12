package br.com.nexo.saas;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("(dev | test) & !prod & !production")
@ConditionalOnProperty(name = "nexo.pagamento.simulado.enabled", havingValue = "true")
public class PagamentoSimulado implements ProvedorPagamento {
    @Override
    public Resultado processar(UUID checkoutId, BigDecimal valor, Metodo metodo, Cenario cenario) {
        if (cenario == Cenario.erro) throw new IllegalStateException("Não foi possível processar a simulação. Tente novamente.");
        return cenario == Cenario.recusado ? Resultado.recusado : Resultado.aprovado;
    }
}
