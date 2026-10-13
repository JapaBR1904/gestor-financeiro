package br.com.nexo.documento;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import br.com.nexo.auth.AuthService.UsuarioAutenticado;
import br.com.nexo.organizacao.PoliticaOrganizacao;
import br.com.nexo.saas.AcessoPlanoService;
import br.com.nexo.saas.AssinaturaRepository;
import br.com.nexo.saas.RecursoPlano;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentoService {
    private final JdbcTemplate jdbc;
    private final AcessoPlanoService acesso;
    private final PoliticaOrganizacao politica;
    private final AssinaturaRepository assinaturas;
    private final br.com.nexo.organizacao.MembroRepository membros;
    public DocumentoService(JdbcTemplate jdbc,AcessoPlanoService acesso,PoliticaOrganizacao politica,AssinaturaRepository assinaturas,br.com.nexo.organizacao.MembroRepository membros){this.jdbc=jdbc;this.acesso=acesso;this.politica=politica;this.assinaturas=assinaturas;this.membros=membros;}
    @Transactional(readOnly=true) public List<Documento> listar(Long org) {
        acesso.exigir(org,RecursoPlano.DOCUMENTOS);
        return jdbc.query("SELECT id,nome,descricao,tipo,octet_length(conteudo) AS tamanho,criado_em FROM documentos_organizacao WHERE organizacao_id=? ORDER BY criado_em DESC,id DESC",
                (rs,n)->new Documento(rs.getLong("id"),rs.getString("nome"),rs.getString("descricao"),rs.getString("tipo"),rs.getLong("tamanho"),rs.getObject("criado_em",OffsetDateTime.class)),org);
    }
    @Transactional public Documento salvar(UsuarioAutenticado usuario,String nome,String descricao,byte[] conteudo) {
        assinaturas.carregar(usuario.organizacaoId(),true);
        usuario=membros.usuarioAtual(usuario);
        acesso.exigir(usuario.organizacaoId(),RecursoPlano.DOCUMENTOS);politica.exigirGestao(usuario);
        String arquivo=nome==null?"":nome.replace('\\','/'); arquivo=arquivo.substring(arquivo.lastIndexOf('/')+1).replaceAll("[\\r\\n]"," ").trim();
        if(arquivo.isBlank() || arquivo.length()>180) throw new IllegalArgumentException("Escolha um arquivo com nome de até 180 caracteres.");
        if(conteudo==null || conteudo.length==0 || conteudo.length>5*1024*1024) throw new IllegalArgumentException("O arquivo deve ter entre 1 byte e 5 MB.");
        String tipo=tipo(arquivo,conteudo);String texto=descricao==null?"":descricao.trim();
        if(texto.length()>500) throw new IllegalArgumentException("A descrição deve ter no máximo 500 caracteres.");
        long total=jdbc.queryForObject("SELECT COALESCE(sum(octet_length(conteudo)),0) FROM documentos_organizacao WHERE organizacao_id=?",Long.class,usuario.organizacaoId());
        if(total+conteudo.length>50L*1024*1024) throw new IllegalArgumentException("O espaço de documentos atingiu 50 MB. Remova arquivos que não precisa manter.");
        Long id=jdbc.queryForObject("INSERT INTO documentos_organizacao (organizacao_id,usuario_id,nome,descricao,tipo,conteudo) VALUES (?,?,?,?,?,?) RETURNING id",Long.class,usuario.organizacaoId(),usuario.id(),arquivo,texto,tipo,conteudo);
        return new Documento(id,arquivo,texto,tipo,conteudo.length,OffsetDateTime.now());
    }
    private String tipo(String nome,byte[] bytes) {
        String ext=nome.substring(nome.lastIndexOf('.')+1).toLowerCase(java.util.Locale.ROOT);
        return switch(ext) {
            case "txt","csv" -> { try { StandardCharsets.UTF_8.newDecoder().onMalformedInput(java.nio.charset.CodingErrorAction.REPORT).decode(java.nio.ByteBuffer.wrap(bytes)); } catch(java.nio.charset.CharacterCodingException e){throw new IllegalArgumentException("Salve o arquivo de texto em UTF-8.");} yield ext.equals("csv")?"text/csv":"text/plain"; }
            case "pdf" -> { if(bytes.length<5 || !new String(bytes,0,5,StandardCharsets.US_ASCII).equals("%PDF-")) throw new IllegalArgumentException("O arquivo PDF não é válido."); yield "application/pdf"; }
            case "png" -> { if(bytes.length<8 || !java.util.Arrays.equals(java.util.Arrays.copyOf(bytes,8),new byte[]{(byte)137,80,78,71,13,10,26,10})) throw new IllegalArgumentException("A imagem PNG não é válida."); yield "image/png"; }
            case "jpg","jpeg" -> { if(bytes.length<3 || bytes[0]!=(byte)255 || bytes[1]!=(byte)216 || bytes[2]!=(byte)255) throw new IllegalArgumentException("A imagem JPEG não é válida."); yield "image/jpeg"; }
            default -> throw new IllegalArgumentException("Use PDF, TXT, CSV, PNG ou JPEG. O limite por arquivo é 5 MB.");
        };
    }
    @Transactional(readOnly=true) public Arquivo arquivo(Long org,Long id) {
        acesso.exigir(org,RecursoPlano.DOCUMENTOS);
        var itens=jdbc.query("SELECT nome,tipo,conteudo FROM documentos_organizacao WHERE id=? AND organizacao_id=?",(rs,n)->new Arquivo(rs.getString("nome"),rs.getString("tipo"),rs.getBytes("conteudo")),id,org);
        if(itens.isEmpty()) throw new IllegalArgumentException("Documento não encontrado."); return itens.getFirst();
    }
    public String texto(Long org,Long id) {
        var arquivo=arquivo(org,id);
        if(!arquivo.tipo().startsWith("text/")) throw new IllegalArgumentException("A leitura com IA aceita TXT e CSV. PDFs e imagens permanecem disponíveis para download.");
        String texto=new String(arquivo.conteudo(),StandardCharsets.UTF_8);
        if(texto.length()>12000) throw new IllegalArgumentException("Para a análise com IA, use um documento de até 12 mil caracteres.");
        return texto;
    }
    @Transactional public void remover(UsuarioAutenticado usuario,Long id) {
        assinaturas.carregar(usuario.organizacaoId(),true);usuario=membros.usuarioAtual(usuario);acesso.exigir(usuario.organizacaoId(),RecursoPlano.DOCUMENTOS);politica.exigirGestao(usuario);
        if(jdbc.update("DELETE FROM documentos_organizacao WHERE organizacao_id=? AND id=?",usuario.organizacaoId(),id)==0) throw new IllegalArgumentException("Documento não encontrado.");
    }
    public record Documento(Long id,String nome,String descricao,String tipo,long tamanho,OffsetDateTime criadoEm){}
    public record Arquivo(String nome,String tipo,byte[] conteudo){@Override public String toString(){return "Arquivo[conteudo protegido]";}}
}
