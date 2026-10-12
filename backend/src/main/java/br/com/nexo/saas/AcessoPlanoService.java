package br.com.nexo.saas;

import br.com.nexo.config.AcessoNegadoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AcessoPlanoService {
    private final AssinaturaRepository repository;
    private final PoliticaAssinatura politica;
    public AcessoPlanoService(AssinaturaRepository repository, PoliticaAssinatura politica) { this.repository = repository; this.politica = politica; }

    @Transactional
    public void exigir(Long organizacaoId, RecursoPlano recurso) {
        var estado = repository.carregar(organizacaoId, false);
        if (!politica.planoEfetivo(estado).permite(recurso)) {
            throw new AcessoNegadoException("Este recurso está disponível no plano " + Plano.de(recurso.planoMinimo()).nome() + ". Veja os planos para fazer upgrade.");
        }
    }
    @Transactional
    public boolean permite(Long organizacaoId, RecursoPlano recurso) {
        var estado = repository.carregar(organizacaoId, false);
        return politica.planoEfetivo(estado).permite(recurso);
    }
}
