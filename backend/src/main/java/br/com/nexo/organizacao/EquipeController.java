package br.com.nexo.organizacao;

import br.com.nexo.auth.SessaoContexto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/equipe")
public class EquipeController {
    private final EquipeService equipe;
    private final SessaoContexto sessao;
    public EquipeController(EquipeService equipe,SessaoContexto sessao){this.equipe=equipe;this.sessao=sessao;}
    @GetMapping public EquipeService.Equipe listar(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token){return equipe.listar(sessao.usuario(token));}
    @PostMapping("/convites") public EquipeService.ConviteCriado convidar(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token,@RequestBody NovoConvite dados){return equipe.convidar(sessao.usuario(token),dados.email(),dados.papel());}
    @PostMapping("/convites/consulta") public EquipeService.InformacaoConvite consultar(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token,@RequestBody Aceite dados){return equipe.consultar(sessao.usuario(token),dados.token());}
    @PostMapping("/convites/aceitar") public EquipeService.InformacaoConvite aceitar(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token,@RequestBody Aceite dados){return equipe.aceitar(sessao.usuario(token),dados.token());}
    @DeleteMapping("/convites/{id}") public ResponseEntity<Void> revogar(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token,@PathVariable Long id){equipe.revogarConvite(sessao.usuario(token),id);return ResponseEntity.noContent().build();}
    @PutMapping("/membros/{id}") public ResponseEntity<Void> papel(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token,@PathVariable Long id,@RequestBody Papel dados){equipe.alterarMembro(sessao.usuario(token),id,dados.papel(),false);return ResponseEntity.noContent().build();}
    @DeleteMapping("/membros/{id}") public ResponseEntity<Void> remover(@CookieValue(name=SessaoContexto.COOKIE,required=false)String token,@PathVariable Long id){equipe.alterarMembro(sessao.usuario(token),id,null,true);return ResponseEntity.noContent().build();}
    public record NovoConvite(String email,String papel){}
    public record Papel(String papel){}
    public record Aceite(String token){@Override public String toString(){return "Aceite[token protegido]";}}
}
