package br.com.nexo.organizacao;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizacaoService {

    private final OrganizacaoRepository organizacaoRepository;
    private final PoliticaOrganizacao politica;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    private final MembroRepository membros;

    public OrganizacaoService(OrganizacaoRepository organizacaoRepository, PoliticaOrganizacao politica, org.springframework.jdbc.core.JdbcTemplate jdbc, MembroRepository membros) {
        this.organizacaoRepository = organizacaoRepository;
        this.politica = politica; this.jdbc=jdbc; this.membros=membros;
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

    @Transactional
    public Organizacao renomear(br.com.nexo.auth.AuthService.UsuarioAutenticado usuario, String nome) {
        politica.exigirGestao(usuario);
        String normalizado = nome == null ? "" : nome.trim().replaceAll("\\s+", " ");
        if (normalizado.isBlank() || normalizado.length() > 160)
            throw new IllegalArgumentException("Informe um nome de até 160 caracteres para o espaço.");
        var organizacao = buscarPorId(usuario.organizacaoId());
        organizacao.alterarNome(normalizado);
        return organizacaoRepository.save(organizacao);
    }
    @org.springframework.transaction.annotation.Transactional
    public MembroRepository.Vinculo pessoal(br.com.nexo.auth.AuthService.UsuarioAutenticado autenticado) {
        Long usuario=autenticado.id();
        var atuais = jdbc.query("""
                SELECT u.organizacao_id,o.nome,u.papel FROM usuarios u JOIN organizacoes o ON o.id=u.organizacao_id
                WHERE u.id=? AND u.ativo AND u.email_verificado_em IS NOT NULL FOR UPDATE OF u
                """, (rs,n)->new MembroRepository.Vinculo(rs.getLong("organizacao_id"),rs.getString("nome"),rs.getString("papel")),usuario);
        if (atuais.isEmpty()) throw new br.com.nexo.config.AcessoNegadoException("Não foi possível criar seu espaço pessoal.");
        var original=atuais.getFirst();
        if (original.papel().equals("proprietario")) return original;
        membros.garantirOriginal(usuario);
        // O papel original permanece no vínculo da empresa; o novo proprietário só gerencia seu espaço.
        jdbc.update("UPDATE membros_organizacao SET papel=? WHERE usuario_id=? AND organizacao_id=?",
                java.util.List.of("administrador","membro").contains(original.papel())?original.papel():"membro",usuario,original.id());
        Long id=jdbc.queryForObject("INSERT INTO organizacoes(nome) VALUES ('Meu espaço') RETURNING id",Long.class);
        jdbc.update("UPDATE usuarios SET organizacao_id=?,papel='proprietario' WHERE id=?",id,usuario);
        jdbc.update("INSERT INTO membros_organizacao(organizacao_id,usuario_id,papel) VALUES (?,?,'proprietario')",id,usuario);
        return new MembroRepository.Vinculo(id,"Meu espaço","proprietario");
    }
}
