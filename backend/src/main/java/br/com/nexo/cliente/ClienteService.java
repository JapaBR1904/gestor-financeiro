package br.com.nexo.cliente;

import java.time.OffsetDateTime;
import java.util.List;

import br.com.nexo.organizacao.Organizacao;
import br.com.nexo.organizacao.OrganizacaoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClienteService {
    private final OrganizacaoService organizacaoService;
    private final ClienteRepository clienteRepository;

    public ClienteService(OrganizacaoService organizacaoService, ClienteRepository clienteRepository) {
        this.organizacaoService = organizacaoService;
        this.clienteRepository = clienteRepository;
    }

    @Transactional
    public ClienteDetalhe criar(NovoCliente dados) {
        validar(dados);
        Organizacao organizacao = organizacaoService.buscarPorId(dados.organizacaoId());
        Cliente cliente = clienteRepository.save(new Cliente(
                organizacao,
                dados.nome().trim(),
                normalizarTexto(dados.telefone()),
                normalizarTexto(dados.email()),
                normalizarTexto(dados.observacao())
        ));
        return montarDetalhe(cliente);
    }

    @Transactional
    public ClienteDetalhe atualizar(Long clienteId, NovoCliente dados) {
        validar(dados);
        organizacaoService.buscarPorId(dados.organizacaoId());
        Cliente cliente = buscarEntidade(dados.organizacaoId(), clienteId);
        cliente.atualizarDados(
                dados.nome().trim(),
                normalizarTexto(dados.telefone()),
                normalizarTexto(dados.email()),
                normalizarTexto(dados.observacao())
        );
        return montarDetalhe(clienteRepository.save(cliente));
    }

    @Transactional
    public ClienteDetalhe alterarStatus(Long organizacaoId, Long clienteId, boolean ativo) {
        organizacaoService.buscarPorId(organizacaoId);
        Cliente cliente = buscarEntidade(organizacaoId, clienteId);
        cliente.alterarAtivo(ativo);
        return montarDetalhe(clienteRepository.save(cliente));
    }

    @Transactional(readOnly = true)
    public List<ClienteDetalhe> listar(Long organizacaoId) {
        organizacaoService.buscarPorId(organizacaoId);
        return clienteRepository.findByOrganizacaoIdOrderByNomeAsc(organizacaoId).stream()
                .map(this::montarDetalhe)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClienteDetalhe buscar(Long organizacaoId, Long clienteId) {
        organizacaoService.buscarPorId(organizacaoId);
        return montarDetalhe(buscarEntidade(organizacaoId, clienteId));
    }

    public Cliente buscarEntidade(Long organizacaoId, Long clienteId) {
        return clienteRepository.findByIdAndOrganizacaoId(clienteId, organizacaoId)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado para esta organização."));
    }

    private void validar(NovoCliente dados) {
        if (dados == null || dados.organizacaoId() == null) throw new IllegalArgumentException("A organização é obrigatória.");
        if (dados.nome() == null || dados.nome().trim().isBlank()) throw new IllegalArgumentException("O nome do cliente é obrigatório.");
        if (dados.nome().trim().length() > 160) throw new IllegalArgumentException("O nome do cliente deve ter no máximo 160 caracteres.");
        if (dados.telefone() != null && dados.telefone().trim().length() > 30) throw new IllegalArgumentException("O telefone deve ter no máximo 30 caracteres.");
        if (dados.email() != null && dados.email().trim().length() > 180) throw new IllegalArgumentException("O e-mail deve ter no máximo 180 caracteres.");
    }

    private String normalizarTexto(String valor) {
        return valor == null || valor.trim().isBlank() ? null : valor.trim();
    }

    private ClienteDetalhe montarDetalhe(Cliente cliente) {
        return new ClienteDetalhe(
                cliente.getId(),
                cliente.getNome(),
                cliente.getTelefone(),
                cliente.getEmail(),
                cliente.getObservacao(),
                cliente.isAtivo(),
                cliente.getCriadoEm(),
                cliente.getAtualizadoEm()
        );
    }

    public record NovoCliente(Long organizacaoId, String nome, String telefone, String email, String observacao) {}
    public record ClienteDetalhe(Long id, String nome, String telefone, String email, String observacao, boolean ativo, OffsetDateTime criadoEm, OffsetDateTime atualizadoEm) {}
}
