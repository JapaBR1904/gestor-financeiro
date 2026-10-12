package br.com.nexo.despesa;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import br.com.nexo.organizacao.Organizacao;
import br.com.nexo.organizacao.OrganizacaoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DespesaService {
    private final OrganizacaoService organizacaoService;
    private final DespesaRepository despesaRepository;

    public DespesaService(OrganizacaoService organizacaoService, DespesaRepository despesaRepository) {
        this.organizacaoService = organizacaoService;
        this.despesaRepository = despesaRepository;
    }

    @Transactional
    public DespesaDetalhe criar(NovaDespesa dados) {
        DadosValidados validados = validarDados(dados);
        Organizacao organizacao = organizacaoService.buscarPorId(dados.organizacaoId());

        Despesa despesa = despesaRepository.save(new Despesa(
                organizacao,
                validados.descricao(),
                validados.valor(),
                validados.categoria(),
                validados.dataDespesa(),
                validados.formaPagamento(),
                validados.observacao()
        ));
        return montarDetalhe(despesa);
    }

    @Transactional
    public DespesaDetalhe atualizar(Long organizacaoId, Long despesaId, NovaDespesa dados) {
        if (dados == null || organizacaoId == null) throw new IllegalArgumentException("Dados da despesa são obrigatórios.");
        DadosValidados validados = validarDados(new NovaDespesa(
                organizacaoId, dados.descricao(), dados.valor(), dados.categoria(), dados.dataDespesa(), dados.formaPagamento(), dados.observacao()
        ));

        Despesa despesa = despesaRepository.findByIdAndOrganizacaoId(despesaId, organizacaoId)
                .orElseThrow(() -> new IllegalArgumentException("Despesa não encontrada para esta organização."));
        despesa.atualizar(
                validados.descricao(),
                validados.valor(),
                validados.categoria(),
                validados.dataDespesa(),
                validados.formaPagamento(),
                validados.observacao()
        );
        return montarDetalhe(despesaRepository.save(despesa));
    }

    @Transactional
    public void excluir(Long organizacaoId, Long despesaId) {
        Despesa despesa = despesaRepository.findByIdAndOrganizacaoId(despesaId, organizacaoId)
                .orElseThrow(() -> new IllegalArgumentException("Despesa não encontrada para esta organização."));
        despesaRepository.delete(despesa);
    }

    @Transactional(readOnly = true)
    public List<DespesaDetalhe> listar(Long organizacaoId) {
        organizacaoService.buscarPorId(organizacaoId);
        return despesaRepository.findByOrganizacaoIdOrderByDataDespesaDescIdDesc(organizacaoId)
                .stream().map(this::montarDetalhe).toList();
    }

    @Transactional(readOnly = true)
    public DespesaDetalhe buscar(Long organizacaoId, Long despesaId) {
        organizacaoService.buscarPorId(organizacaoId);
        return montarDetalhe(despesaRepository.findByIdAndOrganizacaoId(despesaId, organizacaoId)
                .orElseThrow(() -> new IllegalArgumentException("Despesa não encontrada para esta organização.")));
    }

    @Transactional(readOnly = true)
    public DespesaResumo resumo(Long organizacaoId) {
        List<DespesaDetalhe> despesas = listar(organizacaoId);
        BigDecimal total = despesas.stream().map(DespesaDetalhe::valor).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        return new DespesaResumo(despesas.size(), total);
    }

    private DadosValidados validarDados(NovaDespesa dados) {
        if (dados == null || dados.organizacaoId() == null) throw new IllegalArgumentException("A organização é obrigatória.");
        String descricao = textoObrigatorio(dados.descricao(), "A descrição é obrigatória.", 180);
        String categoria = textoObrigatorio(dados.categoria(), "A categoria é obrigatória.", 80);
        BigDecimal valor = validarValor(dados.valor());
        LocalDate dataDespesa = dados.dataDespesa() == null ? LocalDate.now() : dados.dataDespesa();
        String formaPagamento = normalizarFormaPagamento(dados.formaPagamento());
        String observacao = normalizarTexto(dados.observacao(), 2000);
        return new DadosValidados(descricao, valor, categoria, dataDespesa, formaPagamento, observacao);
    }

    private DespesaDetalhe montarDetalhe(Despesa despesa) {
        return new DespesaDetalhe(
                despesa.getId(),
                despesa.getDescricao(),
                despesa.getValor(),
                despesa.getCategoria(),
                despesa.getDataDespesa(),
                despesa.getFormaPagamento(),
                despesa.getObservacao(),
                despesa.getCriadoEm(),
                despesa.getAtualizadoEm()
        );
    }

    private BigDecimal validarValor(BigDecimal valor) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("O valor deve ser maior que zero.");
        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizarFormaPagamento(String valor) {
        String normalizada = valor == null ? "" : valor.trim().toLowerCase();
        if (!List.of("pix", "dinheiro", "debito", "credito", "outro").contains(normalizada)) {
            throw new IllegalArgumentException("Forma de pagamento inválida.");
        }
        return normalizada;
    }

    private String textoObrigatorio(String valor, String mensagem, int maximo) {
        if (valor == null || valor.trim().isBlank()) throw new IllegalArgumentException(mensagem);
        String limpo = valor.trim().replaceAll("\\s+", " ");
        if (limpo.length() > maximo) throw new IllegalArgumentException("Texto excede o limite permitido.");
        return limpo;
    }

    private String normalizarTexto(String valor, int maximo) {
        if (valor == null || valor.trim().isBlank()) return null;
        String limpo = valor.trim();
        if (limpo.length() > maximo) throw new IllegalArgumentException("Observação excede o limite permitido.");
        return limpo;
    }

    private record DadosValidados(String descricao, BigDecimal valor, String categoria, LocalDate dataDespesa, String formaPagamento, String observacao) {}
    public record NovaDespesa(Long organizacaoId, String descricao, BigDecimal valor, String categoria, LocalDate dataDespesa, String formaPagamento, String observacao) {}
    public record DespesaDetalhe(Long id, String descricao, BigDecimal valor, String categoria, LocalDate dataDespesa, String formaPagamento, String observacao, OffsetDateTime criadoEm, OffsetDateTime atualizadoEm) {}
    public record DespesaResumo(int quantidadeDespesas, BigDecimal totalDespesas) {}
}
