package br.com.nexo.cliente;

import java.util.List;

import br.com.nexo.auth.SessaoContexto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {
    private final ClienteService clienteService;
    private final SessaoContexto sessaoContexto;

    public ClienteController(ClienteService clienteService, SessaoContexto sessaoContexto) {
        this.clienteService = clienteService;
        this.sessaoContexto = sessaoContexto;
    }

    @GetMapping
    public List<ClienteService.ClienteDetalhe> listar(@CookieValue(name = SessaoContexto.COOKIE, required = false) String token) {
        return clienteService.listar(sessaoContexto.organizacaoId(token));
    }

    @GetMapping("/{clienteId}")
    public ClienteService.ClienteDetalhe buscar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @PathVariable Long clienteId
    ) {
        return clienteService.buscar(sessaoContexto.organizacaoId(token), clienteId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClienteService.ClienteDetalhe criar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @Valid @RequestBody ClienteRequest request
    ) {
        return clienteService.criar(mapear(sessaoContexto.organizacaoId(token), request));
    }

    @PutMapping("/{clienteId}")
    public ClienteService.ClienteDetalhe atualizar(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @PathVariable Long clienteId,
            @Valid @RequestBody ClienteRequest request
    ) {
        return clienteService.atualizar(clienteId, mapear(sessaoContexto.organizacaoId(token), request));
    }

    @PatchMapping("/{clienteId}/status")
    public ClienteService.ClienteDetalhe alterarStatus(
            @CookieValue(name = SessaoContexto.COOKIE, required = false) String token,
            @PathVariable Long clienteId,
            @Valid @RequestBody AlterarStatusRequest request
    ) {
        return clienteService.alterarStatus(sessaoContexto.organizacaoId(token), clienteId, request.ativo());
    }

    private ClienteService.NovoCliente mapear(Long organizacaoId, ClienteRequest request) {
        return new ClienteService.NovoCliente(organizacaoId, request.nome(), request.telefone(), request.email(), request.observacao());
    }

    public record ClienteRequest(
            @NotBlank(message = "O nome do cliente é obrigatório.")
            @Size(max = 160, message = "O nome do cliente deve ter no máximo 160 caracteres.") String nome,
            @Size(max = 30, message = "O telefone deve ter no máximo 30 caracteres.") String telefone,
            @Email(message = "Informe um e-mail válido.")
            @Size(max = 180, message = "O e-mail deve ter no máximo 180 caracteres.") String email,
            @Size(max = 2000, message = "A observação deve ter no máximo 2000 caracteres.") String observacao
    ) {}

    public record AlterarStatusRequest(boolean ativo) {}
}
