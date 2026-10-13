package br.com.nexo.documento;

import br.com.nexo.auth.SessaoContexto;
import org.springframework.http.ContentDisposition;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController @RequestMapping("/api/documentos")
public class DocumentoController {
    private final DocumentoService documentos; private final SessaoContexto sessao;
    public DocumentoController(DocumentoService documentos,SessaoContexto sessao){this.documentos=documentos;this.sessao=sessao;}
    @GetMapping public java.util.List<DocumentoService.Documento> listar(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token){return documentos.listar(sessao.organizacaoId(token));}
    @PostMapping(consumes="multipart/form-data") public DocumentoService.Documento enviar(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token,
            @RequestParam MultipartFile arquivo,@RequestParam(defaultValue="")String descricao) throws java.io.IOException {
        var usuario=sessao.usuario(token);return documentos.salvar(usuario,arquivo.getOriginalFilename(),descricao,arquivo.getBytes());
    }
    @GetMapping("/{id}/arquivo") public ResponseEntity<byte[]> arquivo(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token,@PathVariable Long id) {
        var arquivo=documentos.arquivo(sessao.organizacaoId(token),id);
        return ResponseEntity.ok().header("Content-Type",arquivo.tipo()).header("Content-Disposition",ContentDisposition.attachment().filename(arquivo.nome(),java.nio.charset.StandardCharsets.UTF_8).build().toString()).body(arquivo.conteudo());
    }
    @DeleteMapping("/{id}") public ResponseEntity<Void> remover(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token,@PathVariable Long id){documentos.remover(sessao.usuario(token),id);return ResponseEntity.noContent().build();}
}
