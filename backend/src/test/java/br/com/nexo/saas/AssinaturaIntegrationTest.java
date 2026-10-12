package br.com.nexo.saas;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import br.com.nexo.auth.AuthService;
import br.com.nexo.auth.UsuarioRepository;
import br.com.nexo.cliente.ClienteService;
import br.com.nexo.config.AcessoNegadoException;
import br.com.nexo.meta.MetaService;
import br.com.nexo.organizacao.OrganizacaoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import static org.junit.jupiter.api.Assertions.*;
import static br.com.nexo.saas.ProvedorPagamento.Cenario.*;
import static br.com.nexo.saas.ProvedorPagamento.Metodo.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"nexo.email.provider=disabled", "nexo.pagamento.simulado.enabled=true", "nexo.saas.prototype-plan-switch=true"})
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "NEXO_TEST_DB_URL", matches = ".+")
class AssinaturaIntegrationTest {
    @LocalServerPort int porta;
    @Autowired AssinaturaService service;
    @Autowired AcessoPlanoService acesso;
    @Autowired SaasService saas;
    @Autowired AuthService auth;
    @Autowired UsuarioRepository usuarios;
    @Autowired OrganizacaoService organizacoes;
    @Autowired JdbcTemplate jdbc;
    @Autowired MetaService metas;
    @Autowired ClienteService clientes;
    private final HttpClient http = HttpClient.newHttpClient();
    @DynamicPropertySource static void banco(DynamicPropertyRegistry registry) { BancoAssinaturaTeste.configurar(registry); }
    private BancoAssinaturaTeste.Conta conta() { return BancoAssinaturaTeste.criar(organizacoes, usuarios, auth); }
    private AssinaturaService.CheckoutDetalhe mudar(BancoAssinaturaTeste.Conta conta, String destino) {
        var checkout = service.criar(conta.usuario(), destino, UUID.randomUUID(), false);
        return service.confirmar(conta.usuario(), checkout.id(), pix, aprovado);
    }

    @ParameterizedTest @CsvSource({"free,pro,39,upgrade", "free,business,99,upgrade", "pro,business,99,upgrade",
            "business,pro,39,downgrade", "business,free,0,downgrade", "pro,free,0,downgrade"})
    void seisTransicoesPersistemPlanoPrecoLimitesEHistorico(String origem, String destino, int valor, String tipo) {
        var conta = conta();
        if (!origem.equals("free")) mudar(conta, origem);
        int antes = service.carregar(conta.usuario()).historico().size();
        var checkout = service.criar(conta.usuario(), destino, UUID.randomUUID(), false);
        assertEquals(origem, checkout.planoAnterior());
        assertEquals(tipo, checkout.tipo());
        assertEquals(0, checkout.total().compareTo(BigDecimal.valueOf(valor)));
        assertEquals("pendente", checkout.status());
        assertEquals(origem, service.carregar(conta.usuario()).plano().id());
        assertEquals("aprovado", service.confirmar(conta.usuario(), checkout.id(), cartao, aprovado).status());
        var atual = service.carregar(auth.login(conta.email(), BancoAssinaturaTeste.SENHA).usuario());
        assertEquals(destino, atual.plano().id());
        assertEquals(Plano.de(destino).limiteUsuarios(), atual.plano().limiteUsuarios());
        assertEquals(antes + 1, atual.historico().size());
        assertEquals(destino, saas.carregar(conta.usuario().organizacaoId()).plano());
        assertEquals("simulado", atual.historico().getFirst().origem());
        assertEquals(tipo, atual.historico().getFirst().tipo());
    }

    @Test void catalogoPreservaPrecosRecursosELimitesExistentes() {
        assertEquals(3, service.planos().size());
        assertEquals(1, Plano.FREE.limiteUsuarios());
        assertEquals(3, Plano.PRO.limiteUsuarios());
        assertEquals(10, Plano.BUSINESS.limiteUsuarios());
        assertFalse(Plano.FREE.permite(RecursoPlano.METAS));
        assertTrue(Plano.PRO.permite(RecursoPlano.METAS));
        assertFalse(Plano.PRO.permite(RecursoPlano.EQUIPE));
        assertTrue(Plano.BUSINESS.permite(RecursoPlano.EQUIPE));
    }

    @Test void recusaCancelamentoDoCheckoutEErroNaoAlteramAssinatura() {
        var conta = conta();
        var recusado = service.criar(conta.usuario(), "pro", UUID.randomUUID(), false);
        assertEquals("recusado", service.confirmar(conta.usuario(), recusado.id(), boleto, ProvedorPagamento.Cenario.recusado).status());
        assertEquals("recusado", service.confirmar(conta.usuario(), recusado.id(), pix, aprovado).status());
        var cancelado = service.criar(conta.usuario(), "business", UUID.randomUUID(), false);
        assertEquals("cancelado", service.cancelarCheckout(conta.usuario(), cancelado.id()).status());
        assertEquals("cancelado", service.confirmar(conta.usuario(), cancelado.id(), pix, aprovado).status());
        var falha = service.criar(conta.usuario(), "pro", UUID.randomUUID(), false);
        assertThrows(IllegalStateException.class, () -> service.confirmar(conta.usuario(), falha.id(), pix, erro));
        assertEquals("pendente", service.buscar(conta.usuario(), falha.id()).status());
        assertEquals("free", service.carregar(conta.usuario()).plano().id());
        assertTrue(service.carregar(conta.usuario()).historico().isEmpty());
        assertEquals("aprovado", service.confirmar(conta.usuario(), falha.id(), pix, aprovado).status());
    }

    @Test void cancelaAssinaturaImediatamenteSemPeriodoPagoInventado() {
        var conta = conta(); mudar(conta, "business");
        var cancelamento = service.criar(conta.usuario(), "free", UUID.randomUUID(), true);
        assertEquals("cancelamento", cancelamento.tipo());
        assertEquals(0, cancelamento.total().compareTo(BigDecimal.ZERO));
        service.confirmar(conta.usuario(), cancelamento.id(), pix, aprovado);
        var atual = service.carregar(conta.usuario());
        assertEquals("free", atual.plano().id()); assertEquals("cancelada", atual.status());
        assertEquals("cancelamento", atual.historico().getFirst().tipo());
    }

    @Test void checkoutExpiradoOuDesatualizadoNaoPodePromoverConta() {
        var conta = conta();
        var expirado = service.criar(conta.usuario(), "business", UUID.randomUUID(), false);
        jdbc.update("update checkouts_assinatura set expira_em = now() - interval '1 second' where id = ?", expirado.id());
        assertEquals("expirado", service.confirmar(conta.usuario(), expirado.id(), pix, aprovado).status());
        var antigo = service.criar(conta.usuario(), "business", UUID.randomUUID(), false);
        mudar(conta, "pro");
        assertEquals("desatualizado", service.confirmar(conta.usuario(), antigo.id(), pix, aprovado).status());
        assertEquals("pro", service.carregar(conta.usuario()).plano().id());
        assertEquals(1, service.carregar(conta.usuario()).historico().size());
    }

    @Test void idempotenciaNaAberturaEConfirmacaoConcorrenteEvitaDuplaMudanca() throws Exception {
        var conta = conta(); UUID chave = UUID.randomUUID();
        var checkout = service.criar(conta.usuario(), "pro", chave, false);
        assertEquals(checkout.id(), service.criar(conta.usuario(), "pro", chave, false).id());
        assertThrows(IllegalArgumentException.class, () -> service.criar(conta.usuario(), "business", chave, false));
        var largada = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { assertTrue(largada.await(10, TimeUnit.SECONDS)); return service.confirmar(conta.usuario(), checkout.id(), pix, aprovado); });
            var b = executor.submit(() -> { assertTrue(largada.await(10, TimeUnit.SECONDS)); return service.confirmar(conta.usuario(), checkout.id(), cartao, aprovado); });
            largada.countDown();
            assertEquals("aprovado", a.get(20, TimeUnit.SECONDS).status());
            assertEquals("aprovado", b.get(20, TimeUnit.SECONDS).status());
        }
        assertEquals(1, service.carregar(conta.usuario()).historico().size());
        assertEquals(1L, jdbc.queryForObject("select versao from assinaturas where organizacao_id = ?", Long.class, conta.usuario().organizacaoId()));
        assertEquals(checkout.id(), service.criar(conta.usuario(), "pro", chave, false).id());
    }

    @Test void downgradePreservaClienteMetaEUsuariosAcimaDoLimite() {
        var conta = conta(); var org = conta.usuario().organizacaoId(); mudar(conta, "business");
        var cliente = clientes.criar(new ClienteService.NovoCliente(org, "Cliente preservado", null, null, null));
        var meta = metas.criar(org, "Meta preservada", "moeda", BigDecimal.TEN, BigDecimal.ZERO, null);
        jdbc.update("insert into usuarios (organizacao_id, nome, email, papel) values (?, 'Membro sintético', ?, 'membro')", org, UUID.randomUUID() + "@example.com");
        mudar(conta, "free");
        assertEquals(cliente.id(), clientes.listar(org).getFirst().id());
        assertEquals(1, jdbc.queryForObject("select count(*) from metas where id = ? and organizacao_id = ?", Integer.class, meta.id(), org));
        assertEquals(2, service.carregar(conta.usuario()).usuariosAtivos());
        assertThrows(AcessoNegadoException.class, () -> metas.listar(org));
        mudar(conta, "pro"); assertEquals(meta.id(), metas.listar(org).getFirst().id());
    }

    @Test void backendBloqueiaRecursosEIsolaOrganizacoes() throws Exception {
        var conta = conta(); var outra = conta();
        assertEquals(403, requisicao("GET", "/api/metas", null, conta.token()).statusCode());
        assertEquals(403, requisicao("GET", "/api/relatorios/fluxo-caixa", null, conta.token()).statusCode());
        assertEquals(200, requisicao("GET", "/api/relatorios/resumo", null, conta.token()).statusCode());
        mudar(conta, "pro");
        assertEquals(200, requisicao("GET", "/api/metas", null, conta.token()).statusCode());
        assertEquals(200, requisicao("GET", "/api/relatorios/fluxo-caixa", null, conta.token()).statusCode());
        assertEquals(403, requisicao("GET", "/api/saas/equipe", null, conta.token()).statusCode());
        mudar(conta, "business");
        assertEquals(200, requisicao("GET", "/api/saas/equipe", null, conta.token()).statusCode());
        assertEquals(403, requisicao("GET", "/api/metas", null, outra.token()).statusCode());
        var checkout = service.criar(conta.usuario(), "pro", UUID.randomUUID(), false);
        assertEquals(400, requisicao("GET", "/api/assinatura/checkout/" + checkout.id(), null, outra.token()).statusCode());
        assertEquals(400, requisicao("POST", "/api/assinatura/checkout/" + checkout.id() + "/confirmar", "{\"metodo\":\"pix\",\"cenario\":\"aprovado\"}", outra.token()).statusCode());
        assertEquals("free", service.carregar(outra.usuario()).plano().id());
    }

    @Test void apiNaoConfiaEmPrecoPlanoOuOrganizacaoEnviadosPeloCliente() throws Exception {
        var conta = conta(); var org = conta.usuario().organizacaoId();
        assertEquals(401, requisicao("GET", "/api/assinatura", null, null).statusCode());
        assertEquals(403, requisicao("PUT", "/api/saas/plano", "{\"plano\":\"business\"}", conta.token()).statusCode());
        assertEquals("free", saas.carregar(org).plano());
        var quote = requisicao("POST", "/api/assinatura/checkout", "{\"plano\":\"pro\",\"chaveIdempotencia\":\"%s\",\"total\":0,\"organizacaoId\":0,\"status\":\"aprovado\"}".formatted(UUID.randomUUID()), conta.token());
        assertEquals(200, quote.statusCode());
        assertTrue(quote.body().contains("\"total\":39")); assertTrue(quote.body().contains("\"status\":\"pendente\""));
        assertEquals("free", saas.carregar(org).plano());
        assertEquals(400, requisicao("POST", "/api/assinatura/checkout", "{\"plano\":\"premium\",\"chaveIdempotencia\":\"%s\"}".formatted(UUID.randomUUID()), conta.token()).statusCode());
        assertEquals(400, requisicao("POST", "/api/assinatura/checkout", "{\"plano\":\"pro\"}", conta.token()).statusCode());
        assertEquals(400, requisicao("GET", "/api/assinatura/checkout/id-invalido", null, conta.token()).statusCode());
        var checkout = service.criar(conta.usuario(), "business", UUID.randomUUID(), false);
        assertEquals(400, requisicao("POST", "/api/assinatura/checkout/" + checkout.id() + "/confirmar", "{\"metodo\":\"cripto\",\"cenario\":\"aprovado\"}", conta.token()).statusCode());
        assertEquals(400, requisicao("POST", "/api/assinatura/checkout/" + checkout.id() + "/confirmar", "{}", conta.token()).statusCode());
        var pro = service.criar(conta.usuario(), "pro", UUID.randomUUID(), false);
        assertEquals(200, requisicao("POST", "/api/assinatura/checkout/" + pro.id() + "/confirmar", "{\"metodo\":\"pix\",\"cenario\":\"aprovado\",\"plano\":\"business\",\"total\":0,\"organizacaoId\":0}", conta.token()).statusCode());
        assertEquals("pro", saas.carregar(org).plano());
    }

    @Test void somenteProprietarioGerenciaENaoSobrescreveProvedorReal() throws Exception {
        var conta = conta(); var checkout = service.criar(conta.usuario(), "pro", UUID.randomUUID(), false);
        jdbc.update("update usuarios set papel = 'membro' where id = ?", conta.usuario().id());
        var membro = auth.autenticarSessao(conta.token());
        assertFalse(service.carregar(membro).podeGerenciar());
        assertThrows(AcessoNegadoException.class, () -> service.criar(membro, "business", UUID.randomUUID(), false));
        assertThrows(AcessoNegadoException.class, () -> service.confirmar(membro, checkout.id(), pix, aprovado));
        assertEquals(403, requisicao("POST", "/api/assinatura/checkout/" + checkout.id() + "/cancelar", "{}", conta.token()).statusCode());
        var outra = conta(); var pendente = service.criar(outra.usuario(), "pro", UUID.randomUUID(), false);
        jdbc.update("update assinaturas set provedor = 'provedor_futuro', status = 'ativa', plano = 'pro' where organizacao_id = ?", outra.usuario().organizacaoId());
        assertThrows(AcessoNegadoException.class, () -> service.criar(outra.usuario(), "business", UUID.randomUUID(), false));
        assertEquals("desatualizado", service.confirmar(outra.usuario(), pendente.id(), pix, aprovado).status());
        assertEquals("provedor_futuro", jdbc.queryForObject("select provedor from assinaturas where organizacao_id = ?", String.class, outra.usuario().organizacaoId()));
    }

    @ParameterizedTest @CsvSource({"ativa,pro", "trial,pro", "pendente,free", "vencida,free", "cancelada,free", "pagamento_falhou,free", "atrasada,free"})
    void somenteStatusValidosLiberamRecursos(String status, String esperado) {
        var conta = conta(); service.carregar(conta.usuario());
        jdbc.update("update assinaturas set plano = 'pro', status = ?, provedor = 'simulado' where organizacao_id = ?", status, conta.usuario().organizacaoId());
        assertEquals(esperado, service.carregar(conta.usuario()).plano().id());
        assertEquals(esperado.equals("pro"), acesso.permite(conta.usuario().organizacaoId(), RecursoPlano.METAS));
    }

    private HttpResponse<String> requisicao(String metodo, String caminho, String corpo, String token) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + caminho)).header("Content-Type", "application/json");
        if (token != null) request.header("Cookie", "nexo_session=" + token);
        request.method(metodo, corpo == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(corpo));
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
