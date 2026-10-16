package br.com.nexo.saas;

import br.com.nexo.auth.*;
import br.com.nexo.organizacao.OrganizacaoService;
import br.com.nexo.financeiro.FinanceiroService;
import java.net.URI;
import java.net.http.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={"nexo.email.provider=disabled","nexo.ia.api-key="})
@ActiveProfiles("dev")
@EnabledIfEnvironmentVariable(named="NEXO_TEST_DB_URL",matches=".+")
class ContextoOrganizacaoIntegrationTest {
    @Autowired AuthService auth;
    @Autowired UsuarioRepository usuarios;
    @Autowired OrganizacaoService organizacoes;
    @Autowired JdbcTemplate jdbc;
    @MockitoSpyBean FinanceiroService financeiro;
    @LocalServerPort int porta;
    private final HttpClient http=HttpClient.newHttpClient();
    private static final String DADOS="{\"tipo\":\"receita\",\"descricao\":\"Contexto sintético\",\"valor\":77,\"data\":\"2026-10-10\",\"categoria\":\"Serviços\",\"conta\":\"Principal\"}";
    @DynamicPropertySource static void banco(DynamicPropertyRegistry r){BancoAssinaturaTeste.configurar(r);}
    private BancoAssinaturaTeste.Conta conta(){return BancoAssinaturaTeste.criar(organizacoes,usuarios,auth);}
    private long outroEspaco(BancoAssinaturaTeste.Conta c){
        var org=organizacoes.criar("Espaço B sintético");
        jdbc.update("INSERT INTO membros_organizacao (organizacao_id,usuario_id,papel,ativo) VALUES (?,?,'proprietario',true)",org.getId(),c.usuario().id());
        return org.getId();
    }
    private HttpResponse<String> requisicao(String metodo,String caminho,String corpo,String token,Long esperado)throws Exception{
        var b=HttpRequest.newBuilder(URI.create("http://localhost:"+porta+caminho)).header("Content-Type","application/json");
        if(token!=null)b.header("Cookie","nexo_session="+token);
        if(esperado!=null)b.header("X-Nexo-Organizacao",esperado.toString());
        return http.send(b.method(metodo,corpo==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(corpo)).build(),HttpResponse.BodyHandlers.ofString());
    }
    @Test void contextoAusenteOuForjadoNaoAutorizaNemGrava()throws Exception{
        var a=conta();var b=conta();
        assertEquals(401,requisicao("POST","/api/financeiro/movimentacoes",DADOS,null,a.usuario().organizacaoId()).statusCode());
        assertEquals(409,requisicao("POST","/api/financeiro/movimentacoes",DADOS,a.token(),null).statusCode());
        assertEquals(403,requisicao("POST","/api/financeiro/movimentacoes",DADOS,a.token(),b.usuario().organizacaoId()).statusCode());
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM movimentacoes WHERE organizacao_id IN (?,?)",Integer.class,a.usuario().organizacaoId(),b.usuario().organizacaoId()));
    }
    @Test void duasDirecoesBloqueiamOperacoesExportacaoEIaComConsentimentoAntigo()throws Exception{
        var c=conta();long a=c.usuario().organizacaoId(),b=outroEspaco(c);
        for(long destino:new long[]{b,a}){
            long antigo=destino==b?a:b;
            auth.selecionarOrganizacao(c.token(),destino);
            for(String[] rota:new String[][]{{"POST","/api/financeiro/movimentacoes"},{"PUT","/api/financeiro/movimentacoes/1"},{"DELETE","/api/financeiro/movimentacoes/1"},{"POST","/api/vendas"},{"POST","/api/despesas"},{"POST","/api/produtos"},{"GET","/api/financeiro/exportar"},{"POST","/api/ia/perguntar"},{"POST","/api/ia/documento"},{"GET","/api/documentos"},{"GET","/api/documentos/1/arquivo"},{"DELETE","/api/documentos/1"}}){
                var resposta=requisicao(rota[0],rota[1],rota[0].equals("GET")||rota[0].equals("DELETE")?null:"{\"incluirResumo\":true}",c.token(),antigo);
                assertEquals(409,resposta.statusCode(),rota[0]+" "+rota[1]);assertTrue(resposta.body().contains("contexto_desatualizado"));
            }
            String multipart="--nexo-boundary\r\nContent-Disposition: form-data; name=\"arquivo\"; filename=\"teste.txt\"\r\nContent-Type: text/plain\r\n\r\nArquivo sintético\r\n--nexo-boundary--\r\n";
            var upload=HttpRequest.newBuilder(URI.create("http://localhost:"+porta+"/api/documentos"))
                    .header("Cookie","nexo_session="+c.token()).header("X-Nexo-Organizacao",Long.toString(antigo))
                    .header("Content-Type","multipart/form-data; boundary=nexo-boundary")
                    .POST(HttpRequest.BodyPublishers.ofString(multipart)).build();
            assertEquals(409,http.send(upload,HttpResponse.BodyHandlers.ofString()).statusCode());
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM documentos_organizacao WHERE organizacao_id IN (?,?)",Integer.class,a,b));
            assertEquals(200,requisicao("POST","/api/financeiro/movimentacoes",DADOS,c.token(),destino).statusCode());
        }
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM movimentacoes WHERE organizacao_id=?",Integer.class,a));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM movimentacoes WHERE organizacao_id=?",Integer.class,b));
    }
    @Test void trocaDuranteRequisicaoNaoRedirecionaOperacaoJaAutorizada()throws Exception{
        var c=conta();long a=c.usuario().organizacaoId(),b=outroEspaco(c);
        var entrou=new CountDownLatch(1);var liberar=new CountDownLatch(1);
        doAnswer(chamada->{entrou.countDown();assertTrue(liberar.await(10,TimeUnit.SECONDS));return chamada.callRealMethod();})
                .when(financeiro).salvar(eq(a),isNull(),any(FinanceiroService.Lancamento.class),isNull());
        try(var executor=Executors.newSingleThreadExecutor()){
            var operacao=executor.submit(()->requisicao("POST","/api/financeiro/movimentacoes",DADOS,c.token(),a));
            assertTrue(entrou.await(10,TimeUnit.SECONDS));
            auth.selecionarOrganizacao(c.token(),b);liberar.countDown();
            assertEquals(200,operacao.get(10,TimeUnit.SECONDS).statusCode());
            assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM movimentacoes WHERE organizacao_id=?",Integer.class,a));
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM movimentacoes WHERE organizacao_id=?",Integer.class,b));
        }finally{liberar.countDown();reset(financeiro);}
    }
}
