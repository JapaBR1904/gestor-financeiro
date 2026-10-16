package br.com.nexo.saas;

import br.com.nexo.auth.*;
import br.com.nexo.organizacao.OrganizacaoService;
import br.com.nexo.produto.ProdutoService;
import br.com.nexo.venda.VendaService;
import br.com.nexo.relatorio.RelatorioService;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"nexo.email.provider=disabled","nexo.pagamento.simulado.enabled=true","nexo.ia.api-key="})
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named="NEXO_TEST_DB_URL",matches=".+")
class IntegridadeFinanceiraIntegrationTest {
    @Autowired AuthService auth;
    @Autowired UsuarioRepository usuarios;
    @Autowired OrganizacaoService organizacoes;
    @Autowired ProdutoService produtos;
    @Autowired VendaService vendas;
    @Autowired RelatorioService relatorios;
    @Autowired br.com.nexo.ia.ContextoIaService contextoIa;
    @Autowired JdbcTemplate jdbc;
    @LocalServerPort int porta;
    @DynamicPropertySource static void banco(DynamicPropertyRegistry r){BancoAssinaturaTeste.configurar(r);}
    private BancoAssinaturaTeste.Conta conta(){return BancoAssinaturaTeste.criar(organizacoes,usuarios,auth);}
    private HttpResponse<String> post(BancoAssinaturaTeste.Conta c,String rota,String body)throws Exception{
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:"+porta+rota)).header("Content-Type","application/json")
                .header("Idempotency-Key", UUID.randomUUID().toString()).header("Cookie","nexo_session="+c.token()).header("X-Nexo-Organizacao",c.usuario().organizacaoId().toString())
                .POST(HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
    }
    @Test void ausenciaDeCustoPermaneceDesconhecidaNoProdutoVendaERelatorioSemReescreverSnapshot(){
        var c=conta();long org=c.usuario().organizacaoId();
        var p=produtos.criar(new ProdutoService.NovoProduto(org,"Sem ficha",null,new BigDecimal("15"),List.of()));
        assertNull(p.custoEstimado());assertNull(p.lucroEstimado());
        var v=vendas.criar(new VendaService.NovaVenda(org,null,"pix",null,List.of(new VendaService.NovoItem(p.id(),1))));
        assertNull(v.custoTotal());assertNull(v.lucroTotal());assertNull(v.itens().getFirst().custoUnitario());
        assertNull(relatorios.gerar(org).lucroBruto());
        var contexto = contextoIa.montar(org, new br.com.nexo.ia.ContextoIaService.Entrada("/relatorios", "relatorios", null, null), true);
        assertTrue(contexto.texto().contains("\"custosCompletos\":false"));
        assertTrue(contexto.texto().contains("\"lucroBruto\":null"));
        produtos.atualizar(p.id(),new ProdutoService.NovoProduto(org,"Agora com custo zero",null,new BigDecimal("15"),List.of(new ProdutoService.NovoIngrediente("Referência zero",BigDecimal.ZERO,BigDecimal.ONE,"un",BigDecimal.ONE,"un"))));
        assertEquals(new BigDecimal("0.00"),produtos.buscar(org,p.id()).custoEstimado());
        assertNull(vendas.buscar(org,v.id()).custoTotal());
        var zero=vendas.criar(new VendaService.NovaVenda(org,null,"pix",null,List.of(new VendaService.NovoItem(p.id(),1))));
        assertEquals(new BigDecimal("0.00"),zero.custoTotal());assertEquals(new BigDecimal("15.00"),zero.lucroTotal());
        vendas.cancelar(c.usuario(), v.id(), "Registro sem custo corrigido");
        assertEquals(new BigDecimal("15.00"), relatorios.gerar(org).lucroBruto());
    }
    @Test void ingredienteNuloEParcialSao400ComCampoSemSalvarProduto()throws Exception{
        var c=conta();
        for(String ingrediente:List.of("null","{\"nome\":\"Farinha\",\"precoCompra\":5}")){
            var r=post(c,"/api/produtos","{\"nome\":\"Parcial\",\"precoVenda\":15,\"ingredientes\":["+ingrediente+"]}");
            assertEquals(400,r.statusCode());assertTrue(r.body().contains("campos"));assertTrue(r.body().contains("ingredientes"));assertFalse(r.body().contains("Exception"));
        }
        assertTrue(produtos.listar(c.usuario().organizacaoId()).isEmpty());
    }
    @Test void dinheiroExcessivoOuComCasasExtrasERejeitadoEmDespesaEProduto()throws Exception{
        var c=conta();
        for(String valor:List.of("1000000000000","1.234","-1","null")){
            var d=post(c,"/api/despesas","{\"descricao\":\"Teste\",\"categoria\":\"Outros\",\"dataDespesa\":\"2026-10-10\",\"formaPagamento\":\"pix\",\"valor\":"+valor+"}");
            assertEquals(400,d.statusCode(),valor);assertTrue(d.body().contains("campos"));assertTrue(d.body().contains("valor"));
            var p=post(c,"/api/produtos","{\"nome\":\"Limite\",\"precoVenda\":"+valor+",\"ingredientes\":[]}");
            assertEquals(400,p.statusCode(),valor);
        }
        assertEquals(201,post(c,"/api/despesas","{\"descricao\":\"Limite permitido\",\"categoria\":\"Outros\",\"dataDespesa\":\"2026-10-10\",\"formaPagamento\":\"pix\",\"valor\":999999999999.99}").statusCode());
    }
    @Test void itemNuloOuTotalCalculadoForaDoLimiteNaoCriaVenda()throws Exception{
        var c=conta();var p=produtos.criar(new ProdutoService.NovoProduto(c.usuario().organizacaoId(),"Alto",null,new BigDecimal("100000000000"),List.of()));
        var nulo=post(c,"/api/vendas","{\"formaPagamento\":\"pix\",\"itens\":[null]}");
        assertEquals(400,nulo.statusCode());assertTrue(nulo.body().contains("itens[0]"));
        var alto=post(c,"/api/vendas","{\"formaPagamento\":\"pix\",\"itens\":[{\"produtoId\":"+p.id()+",\"quantidade\":10}]}");
        assertEquals(400,alto.statusCode());assertTrue(alto.body().contains("campos"));assertTrue(vendas.listar(c.usuario().organizacaoId()).isEmpty());
    }
}
