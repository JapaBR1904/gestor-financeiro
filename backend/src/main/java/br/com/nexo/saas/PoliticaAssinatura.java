package br.com.nexo.saas;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.slf4j.LoggerFactory;

@Component
public class PoliticaAssinatura {
    private final ObjectProvider<ProvedorPagamento> provedor;
    private final Environment ambiente;
    public PoliticaAssinatura(ObjectProvider<ProvedorPagamento> provedor, Environment ambiente) {
        this.provedor = provedor; this.ambiente = ambiente;
    }
    public boolean ambienteDesenvolvimento() {
        return ambiente.acceptsProfiles(Profiles.of("(dev | test) & !prod & !production"));
    }
    @EventListener(ApplicationReadyEvent.class)
    public void informarDisponibilidade() {
        LoggerFactory.getLogger(PoliticaAssinatura.class).info("Pagamento simulado de desenvolvimento: {}",
                simulacaoHabilitada() ? "habilitado" : "desabilitado");
    }
    public boolean simulacaoHabilitada() { return provedor.getIfAvailable() instanceof PagamentoSimulado; }
    public Plano planoEfetivo(AssinaturaRepository.Estado estado) {
        boolean simulada = "simulado".equals(estado.provedor()) || "prototipo".equals(estado.status());
        if (simulada && !simulacaoHabilitada()) return Plano.FREE;
        return Plano.efetivo(estado.plano(), estado.status());
    }
}
