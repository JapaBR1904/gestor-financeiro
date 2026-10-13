package br.com.nexo.saas;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import br.com.nexo.auth.AuthService.UsuarioAutenticado;
import br.com.nexo.config.AcessoNegadoException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssinaturaService {
    private final AssinaturaRepository repository;
    private final ObjectProvider<ProvedorPagamento> provedor;
    private final PoliticaAssinatura politica;
    public AssinaturaService(AssinaturaRepository repository, ObjectProvider<ProvedorPagamento> provedor, PoliticaAssinatura politica) {
        this.repository = repository; this.provedor = provedor; this.politica = politica;
    }
    public boolean simulacaoHabilitada() { return politica.simulacaoHabilitada(); }

    @Transactional
    public Detalhe carregar(UsuarioAutenticado usuario) {
        repository.garantir(usuario.organizacaoId());
        var estado = repository.carregar(usuario.organizacaoId(), false);
        var plano = politica.planoEfetivo(estado);
        return new Detalhe(plano.detalhe(), estado.status(), estado.atualizadoEm(), repository.usuarios(usuario.organizacaoId()),
                "proprietario".equals(usuario.papel()), simulacaoHabilitada(), politica.ambienteDesenvolvimento(), repository.historico(usuario.organizacaoId()));
    }
    public List<Plano.Detalhe> planos() { return Arrays.stream(Plano.values()).map(Plano::detalhe).toList(); }

    @Transactional
    public CheckoutDetalhe criar(UsuarioAutenticado usuario, String destinoInformado, UUID chave, boolean cancelarAssinatura) {
        exigirGerenciamento(usuario);
        if (chave == null) throw new IllegalArgumentException("Informe a identificação da solicitação.");
        Plano destino = cancelarAssinatura ? Plano.FREE : Plano.de(destinoInformado);
        // Toda operação bloqueia assinatura antes de checkout, evitando ordem inversa de bloqueios.
        var atual = repository.carregar(usuario.organizacaoId(), true);
        var anterior = repository.porChave(usuario.organizacaoId(), chave);
        if (anterior != null) {
            if (!anterior.planoDestino().equals(destino.id()) || cancelarAssinatura != "cancelamento".equals(anterior.tipo()) || !anterior.usuarioId().equals(usuario.id())) {
                throw new IllegalArgumentException("Esta solicitação já foi usada para outra operação.");
            }
            return detalhe(anterior);
        }
        if (atual.provedor() != null && !atual.provedor().equals("simulado")) {
            throw new AcessoNegadoException("Esta assinatura precisa ser gerenciada pelo seu provedor de pagamento.");
        }
        Plano origem = politica.planoEfetivo(atual);
        if (origem == destino) throw new IllegalArgumentException("Este já é o seu plano atual.");
        String tipo = cancelarAssinatura ? "cancelamento" : destino.ordinal() > origem.ordinal() ? "upgrade" : "downgrade";
        return detalhe(repository.criar(usuario.organizacaoId(), usuario.id(), chave, atual, destino, tipo));
    }
    @Transactional
    public CheckoutDetalhe buscar(UsuarioAutenticado usuario, UUID id) {
        return detalhe(exigirCheckout(usuario.organizacaoId(), id, false));
    }
    @Transactional
    public CheckoutDetalhe confirmar(UsuarioAutenticado usuario, UUID id, ProvedorPagamento.Metodo metodo, ProvedorPagamento.Cenario cenario) {
        exigirGerenciamento(usuario);
        if (metodo == null || cenario == null) throw new IllegalArgumentException("Escolha o método e o resultado da simulação.");
        var atual = repository.carregar(usuario.organizacaoId(), true);
        var checkout = exigirCheckout(usuario.organizacaoId(), id, true);
        if (!checkout.usuarioId().equals(usuario.id())) throw new AcessoNegadoException("Confirme o checkout com a conta que o iniciou.");
        if (!checkout.status().equals("pendente")) return detalhe(checkout);
        if (!OffsetDateTime.now().isBefore(checkout.expiraEm())) repository.concluir(checkout, "expirado", null);
        else if (atual.versao() != checkout.versao() || (atual.provedor() != null && !atual.provedor().equals("simulado"))) repository.concluir(checkout, "desatualizado", null);
        else {
            var resultado = provedor.getObject().processar(checkout.id(), checkout.valor(), metodo, cenario);
            if (resultado == ProvedorPagamento.Resultado.aprovado) {
                repository.aplicar(checkout, usuario.id());
                repository.concluir(checkout, "aprovado", metodo);
            } else repository.concluir(checkout, "recusado", metodo);
        }
        return detalhe(repository.checkout(usuario.organizacaoId(), id, false));
    }
    @Transactional
    public CheckoutDetalhe cancelarCheckout(UsuarioAutenticado usuario, UUID id) {
        exigirGerenciamento(usuario);
        repository.carregar(usuario.organizacaoId(), true);
        var checkout = exigirCheckout(usuario.organizacaoId(), id, true);
        if (!checkout.usuarioId().equals(usuario.id())) throw new AcessoNegadoException("Cancele o checkout com a conta que o iniciou.");
        if (checkout.status().equals("pendente")) repository.concluir(checkout, "cancelado", null);
        return detalhe(repository.checkout(usuario.organizacaoId(), id, false));
    }
    private void exigirGerenciamento(UsuarioAutenticado usuario) {
        if (!"proprietario".equals(usuario.papel())) throw new AcessoNegadoException("Somente o dono da organização pode gerenciar a assinatura.");
        if (!simulacaoHabilitada()) throw new AcessoNegadoException("A simulação de assinatura está disponível somente no ambiente de desenvolvimento habilitado.");
    }
    private AssinaturaRepository.Checkout exigirCheckout(Long organizacaoId, UUID id, boolean bloquear) {
        var checkout = repository.checkout(organizacaoId, id, bloquear);
        if (checkout == null) throw new IllegalArgumentException("Checkout não encontrado.");
        return checkout;
    }
    private CheckoutDetalhe detalhe(AssinaturaRepository.Checkout checkout) {
        return new CheckoutDetalhe(checkout.id(), checkout.planoAnterior(), Plano.de(checkout.planoDestino()).detalhe(), checkout.tipo(), checkout.valor(), checkout.status(), checkout.metodo(), checkout.expiraEm());
    }
    public record Detalhe(Plano.Detalhe plano, String status, OffsetDateTime ultimaAlteracao, int usuariosAtivos,
                          boolean podeGerenciar, boolean simulacaoHabilitada, boolean ambienteDesenvolvimento, List<AssinaturaRepository.Historico> historico) {}
    public record CheckoutDetalhe(UUID id, String planoAnterior, Plano.Detalhe plano, String tipo, java.math.BigDecimal total,
                                  String status, String metodo, OffsetDateTime expiraEm) {}
}
