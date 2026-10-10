package br.com.nexo.organizacao;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizacoes")
public class OrganizacaoController {

    private final OrganizacaoService organizacaoService;

    public OrganizacaoController(OrganizacaoService organizacaoService) {
        this.organizacaoService = organizacaoService;
    }

    @GetMapping
    public List<OrganizacaoResponse> listar() {
        return organizacaoService.listar().stream()
                .map(OrganizacaoResponse::de)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrganizacaoResponse criar(@Valid @RequestBody CriarOrganizacaoRequest request) {
        return OrganizacaoResponse.de(organizacaoService.criar(request.nome()));
    }

    public record CriarOrganizacaoRequest(
            @NotBlank(message = "O nome da organização é obrigatório.") String nome
    ) {
    }

    public record OrganizacaoResponse(Long id, String nome) {
        static OrganizacaoResponse de(Organizacao organizacao) {
            return new OrganizacaoResponse(organizacao.getId(), organizacao.getNome());
        }
    }
}
