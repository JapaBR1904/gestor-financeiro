package br.com.nexo.saas;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

@Component
public class PoliticaAssinatura {
    private final ObjectProvider<ProvedorPagamento> provedor;
    public PoliticaAssinatura(ObjectProvider<ProvedorPagamento> provedor) { this.provedor = provedor; }
    public boolean simulacaoHabilitada() { return provedor.getIfAvailable() instanceof PagamentoSimulado; }
    public Plano planoEfetivo(AssinaturaRepository.Estado estado) {
        boolean simulada = "simulado".equals(estado.provedor()) || "prototipo".equals(estado.status());
        if (simulada && !simulacaoHabilitada()) return Plano.FREE;
        return Plano.efetivo(estado.plano(), estado.status());
    }
}
