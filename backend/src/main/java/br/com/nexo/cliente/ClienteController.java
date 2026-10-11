package br.com.nexo.cliente;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {
    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @GetMapping
    public List<ClienteService.ClienteDetalhe> listar(@RequestParam Long organizacaoId) {
        return clienteService.listar(organizacaoId);
    }

    @GetMapping("/{clienteId}")
    public ClienteService.ClienteDetalhe buscar(@PathVariable Long clienteId, @RequestParam Long organizacaoId) {
        return clienteService.buscar(organizacaoId, clienteId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClienteService.ClienteDetalhe criar(@Valid @RequestBody ClienteRequest request) {
        return clienteService.criar(mapear(request));
    }

    @PutMapping("/{clienteId}")
    public ClienteService.ClienteDetalhe atualizar(@PathVariable Long clienteId, @Valid @RequestBody ClienteRequest request) {
        return clienteService.atualizar(clienteId, mapear(request));
    }

    @PatchMapping("/{clienteId}/status")
    public ClienteService.ClienteDetalhe alterarStatus(@PathVariable Long clienteId, @Valid @RequestBody AlterarStatusRequest request) {
        return clienteService.alterarStatus(request.organizacaoId(), clienteId, request.ativo());
    }

    private ClienteService.NovoCliente mapear(ClienteRequest request) {
        return new ClienteService.NovoCliente(request.organizacaoId(), request.nome(), request.telefone(), request.email(), request.observacao());
    }

    public record ClienteRequest(
            @NotNull(message = "A organização é obrigatória.") Long organizacaoId,
            @NotBlank(message = "O nome do cliente é obrigatório.")
            @Size(max = 160, message = "O nome do cliente deve ter no máximo 160 caracteres.") String nome,
            @Size(max = 30, message = "O telefone deve ter no máximo 30 caracteres.") String telefone,
            @Size(max = 180, message = "O e-mail deve ter no máximo 180 caracteres.") String email,
            String observacao
    ) {}

    public record AlterarStatusRequest(
            @NotNull(message = "A organização é obrigatória.") Long organizacaoId,
            boolean ativo
    ) {}
}
