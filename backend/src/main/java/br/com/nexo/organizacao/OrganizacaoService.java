package br.com.nexo.organizacao;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizacaoService {

    private final OrganizacaoRepository organizacaoRepository;

    public OrganizacaoService(OrganizacaoRepository organizacaoRepository) {
        this.organizacaoRepository = organizacaoRepository;
    }

    @Transactional
    public Organizacao criar(String nome) {
        String nomeNormalizado = nome == null ? "" : nome.trim();

        if (nomeNormalizado.isBlank()) {
            throw new IllegalArgumentException("O nome da organização é obrigatório.");
        }

        return organizacaoRepository.save(new Organizacao(nomeNormalizado));
    }

    @Transactional(readOnly = true)
    public List<Organizacao> listar() {
        return organizacaoRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Organizacao buscarPorId(Long id) {
        return organizacaoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Organização não encontrada."));
    }
}
