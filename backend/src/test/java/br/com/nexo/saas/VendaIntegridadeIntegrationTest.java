package br.com.nexo.saas;

import br.com.nexo.auth.*;
import br.com.nexo.organizacao.OrganizacaoService;
import br.com.nexo.produto.ProdutoService;
import br.com.nexo.venda.VendaService;
import br.com.nexo.financeiro.FinanceiroService;
import br.com.nexo.relatorio.RelatorioService;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"nexo.email.provider=disabled","nexo.pagamento.simulado.enabled=true","nexo.ia.api-key="})
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named="NEXO_TEST_DB_URL",matches=".+")
class VendaIntegridadeIntegrationTest {
    @Autowired AuthService auth;
    @Autowired UsuarioRepository usuarios;
    @Autowired OrganizacaoService organizacoes;
    @Autowired ProdutoService produtos;
    @Autowired VendaService vendas;
    @Autowired RelatorioService relatorios;
    @Autowired FinanceiroService financeiro;
    @Autowired AssinaturaService assinatura;
    @Autowired JdbcTemplate jdbc;
    @LocalServerPort int porta;
    private final JsonMapper json=JsonMapper.builder().build();
    @DynamicPropertySource static void banco(DynamicPropertyRegistry r){BancoAssinaturaTeste.configurar(r);}
    private BancoAssinaturaTeste.Conta conta(){return BancoAssinaturaTeste.criar(organizacoes,usuarios,auth);}
    private ProdutoService.ProdutoDetalhe produto(long org){return produtos.criar(new ProdutoService.NovoProduto(org,"Produto de integridade",null,new BigDecimal("50.00"),List.of(new ProdutoService.NovoIngrediente("Referência",new BigDecimal("20"),BigDecimal.ONE,"kg",new BigDecimal("100"),"g"))));}
    private String payload(long produto,int quantidade){return "{\"formaPagamento\":\"pix\",\"itens\":[{\"produtoId\":"+produto+",\"quantidade\":"+quantidade+"}]}";}
    private HttpResponse<String> post(BancoAssinaturaTeste.Conta c,String caminho,String dados,UUID chave)throws Exception{
        var b=HttpRequest.newBuilder(URI.create("http://localhost:"+porta+caminho)).header("Content-Type","application/json").header("Cookie","nexo_session="+c.token()).header("X-Nexo-Organizacao",auth.autenticarSessao(c.token()).organizacaoId().toString());
        if(chave!=null)b.header("Idempotency-Key",chave.toString());
        return HttpClient.newHttpClient().send(b.POST(HttpRequest.BodyPublishers.ofString(dados)).build(),HttpResponse.BodyHandlers.ofString());
    }
    @Test void doisPostsConcorrentesERetryRetornamResultadoOriginalMesmoAposEdicaoDoProduto()throws Exception{
        var c=conta();long org=c.usuario().organizacaoId();var p=produto(org);var chave=UUID.randomUUID();
        try(var executor=Executors.newFixedThreadPool(2)){
            var inicio=new CountDownLatch(1);
            var a=executor.submit(()->{inicio.await();return post(c,"/api/vendas",payload(p.id(),1),chave);});
            var b=executor.submit(()->{inicio.await();return post(c,"/api/vendas",payload(p.id(),1),chave);});
            inicio.countDown();var r1=a.get(15,TimeUnit.SECONDS);var r2=b.get(15,TimeUnit.SECONDS);
            assertEquals(201,r1.statusCode(),r1.body());assertEquals(201,r2.statusCode(),r2.body());assertEquals(json.readTree(r1.body()),json.readTree(r2.body()));
            jdbc.update("UPDATE produtos SET preco_venda=99 WHERE id=?",p.id());
            var repetida=post(c,"/api/vendas",payload(p.id(),1),chave);
            assertEquals(201,repetida.statusCode());assertEquals(json.readTree(r1.body()),json.readTree(repetida.body()));
            assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM vendas WHERE organizacao_id=?",Integer.class,org));
            assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM venda_itens WHERE organizacao_id=?",Integer.class,org));
        }
    }
    @Test void payloadDiferenteDa409EChavePodeSerUsadaEmOutraOrganizacao()throws Exception{
        var a=conta();var b=conta();var pa=produto(a.usuario().organizacaoId());var pb=produto(b.usuario().organizacaoId());var chave=UUID.randomUUID();
        assertEquals(201,post(a,"/api/vendas",payload(pa.id(),1),chave).statusCode());
        var conflito=post(a,"/api/vendas",payload(pa.id(),2),chave);
        assertEquals(409,conflito.statusCode());assertTrue(conflito.body().contains("idempotencia_conflitante"));
        assertEquals(201,post(b,"/api/vendas",payload(pb.id(),1),chave).statusCode());
        assertEquals(1,vendas.listar(a.usuario().organizacaoId()).size());assertEquals(1,vendas.listar(b.usuario().organizacaoId()).size());
    }
    @Test void chaveObrigatoriaEValidacaoNaoReservaOperacaoInvalida()throws Exception{
        var c=conta();var p=produto(c.usuario().organizacaoId());var chave=UUID.randomUUID();
        assertEquals(400,post(c,"/api/vendas",payload(p.id(),1),null).statusCode());
        assertEquals(400,post(c,"/api/vendas",payload(p.id(),0),chave).statusCode());
        assertEquals(201,post(c,"/api/vendas",payload(p.id(),1),chave).statusCode());
        assertEquals(1,vendas.listar(c.usuario().organizacaoId()).size());
    }
    @Test void cancelamentoPreservaOriginaisAutorMotivoEDataERemoveSomenteVendaDosTotais()throws Exception{
        var c=conta();long org=c.usuario().organizacaoId();var p=produto(org);var chave=UUID.randomUUID();
        var r=post(c,"/api/vendas",payload(p.id(),1),chave);assertEquals(201,r.statusCode());
        var original=json.readValue(r.body(),VendaService.VendaDetalhe.class);long id=original.id();
        var dia=original.criadoEm().atZoneSameInstant(ZoneId.of("America/Sao_Paulo")).toLocalDate();
        financeiro.salvar(org,null,new FinanceiroService.Lancamento("receita","Manual preservado",new BigDecimal("7"),dia,"Outros","Principal"));
        assertEquals(new BigDecimal("57.00"),financeiro.resumo(org,dia,dia).receitas());
        assertEquals(1,relatorios.gerar(org).quantidadeVendas());
        var cancelada=vendas.cancelar(c.usuario(),id,"Quantidade registrada incorretamente");
        assertEquals("cancelada",cancelada.status());assertEquals(c.usuario().id(),cancelada.canceladoPor());assertNotNull(cancelada.canceladoEm());
        assertEquals(original.itens(),cancelada.itens());assertEquals(original.totalVenda(),cancelada.totalVenda());
        var repetida=vendas.cancelar(c.usuario(),id,"Motivo não deve sobrescrever o original");
        assertEquals(cancelada.canceladoEm(),repetida.canceladoEm());assertEquals(cancelada.cancelamentoMotivo(),repetida.cancelamentoMotivo());
        assertEquals(new BigDecimal("7.00"),financeiro.resumo(org,dia,dia).receitas());
        assertEquals(0,vendas.resumo(org).quantidadeVendas());assertEquals(0,relatorios.gerar(org).quantidadeVendas());assertTrue(relatorios.gerar(org).produtosMaisVendidos().isEmpty());
        assertEquals(1,vendas.listar(org).size());assertEquals(original.itens().getFirst().id(),vendas.buscar(org,id).itens().getFirst().id());
        assertEquals(201,post(c,"/api/vendas",payload(p.id(),1),chave).statusCode());assertEquals("cancelada",vendas.buscar(org,id).status());
        assertEquals(400,post(c,"/api/vendas/"+id+"/cancelamento","{\"motivo\":\"\"}",null).statusCode());
    }
    @Test void membroNaoCancelaAdminBusinessPodeEOutraOrganizacaoNaoVeOVinculo()throws Exception{
        var dono=conta();var pessoa=conta();var outra=conta();long org=dono.usuario().organizacaoId();
        var q=assinatura.criar(dono.usuario(),"business",UUID.randomUUID(),false);assinatura.confirmar(dono.usuario(),q.id(),ProvedorPagamento.Metodo.pix,ProvedorPagamento.Cenario.aprovado);
        jdbc.update("INSERT INTO membros_organizacao (organizacao_id,usuario_id,papel,ativo) VALUES (?,?,'membro',true)",org,pessoa.usuario().id());
        auth.selecionarOrganizacao(pessoa.token(),org);
        var p=produto(org);var v=vendas.criar(new VendaService.NovaVenda(org,null,"pix",null,List.of(new VendaService.NovoItem(p.id(),1))));
        var corpo="{\"motivo\":\"Erro operacional\"}";
        assertEquals(403,post(pessoa,"/api/vendas/"+v.id()+"/cancelamento",corpo,null).statusCode());
        assertEquals(400,post(outra,"/api/vendas/"+v.id()+"/cancelamento",corpo,null).statusCode());
        assertEquals("registrada",vendas.buscar(org,v.id()).status());
        jdbc.update("UPDATE membros_organizacao SET papel='administrador' WHERE usuario_id=? AND organizacao_id=?",pessoa.usuario().id(),org);
        assertEquals(200,post(pessoa,"/api/vendas/"+v.id()+"/cancelamento",corpo,null).statusCode());assertEquals(pessoa.usuario().id(),vendas.buscar(org,v.id()).canceladoPor());
    }
}
