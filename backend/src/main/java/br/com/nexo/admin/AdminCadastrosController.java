package br.com.nexo.admin;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import br.com.nexo.auth.CadastroManualService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/cadastros")
public class AdminCadastrosController {
    private final AdminCadastrosService admin;
    private final CadastroManualService cadastros;
    public AdminCadastrosController(AdminCadastrosService admin,CadastroManualService cadastros) { this.admin=admin; this.cadastros=cadastros; }
    @GetMapping("/disponibilidade") public Map<String,Boolean> disponibilidade() { return Map.of("disponivel",admin.habilitado()); }
    @PostMapping("/login") public ResponseEntity<Map<String,String>> entrar(HttpServletRequest request,@Valid @RequestBody Login dados) {
        String token=admin.entrar(request,dados.usuario(),dados.senha());
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE,cookie(token,900).toString()).body(Map.of("mensagem","Administração aberta."));
    }
    @PostMapping("/logout") public ResponseEntity<Map<String,String>> sair(HttpServletRequest request,@CookieValue(name=AdminCadastrosService.COOKIE,required=false) String token) {
        admin.sair(request,token);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE,cookie("",0).toString()).body(Map.of("mensagem","Administração encerrada."));
    }
    @GetMapping public List<CadastroManualService.Pedido> pendentes(HttpServletRequest request,@CookieValue(name=AdminCadastrosService.COOKIE,required=false) String token) {
        admin.exigirSessao(request,token); return cadastros.pendentes();
    }
    @PostMapping("/{id}") public Map<String,String> decidir(HttpServletRequest request,@CookieValue(name=AdminCadastrosService.COOKIE,required=false) String token,@PathVariable Long id,@Valid @RequestBody Decisao decisao) {
        admin.exigirSessao(request,token); cadastros.decidir(id,decisao.aprovar(),decisao.identidadeConfirmada(),admin.usuario());
        return Map.of("mensagem",decisao.aprovar() ? "Cadastro aprovado. A pessoa já pode entrar." : "Cadastro recusado.");
    }
    private ResponseCookie cookie(String token,int segundos) { return ResponseCookie.from(AdminCadastrosService.COOKIE,token).httpOnly(true).secure(admin.seguro()).sameSite("Strict").path("/api/admin/cadastros").maxAge(Duration.ofSeconds(segundos)).build(); }
    public record Login(@NotBlank @Size(max=100) String usuario,@NotBlank @Size(max=72) String senha) {}
    public record Decisao(@jakarta.validation.constraints.NotNull Boolean aprovar,boolean identidadeConfirmada) {}
}
