package br.com.nexo.saas;

import br.com.nexo.auth.AuthService;
import br.com.nexo.auth.EmailCodigoService;
import br.com.nexo.auth.UsuarioRepository;
import br.com.nexo.config.AcessoNegadoException;
import br.com.nexo.documento.DocumentoService;
import br.com.nexo.financeiro.FinanceiroService;
import br.com.nexo.meta.MetaService;
import br.com.nexo.organizacao.EquipeService;
import br.com.nexo.organizacao.MembroRepository;
import br.com.nexo.organizacao.OrganizacaoService;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={
        "nexo.email.provider=disabled", "nexo.pagamento.simulado.enabled=true", "nexo.ia.api-key=", "nexo.frontend-url=http://localhost:3000"})
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named="NEXO_TEST_DB_URL",matches=".+")
class ProdutoIntegrationTest {
    @Autowired AuthService auth;
    @Autowired UsuarioRepository usuarios;
    @Autowired OrganizacaoService organizacoes;
    @Autowired AssinaturaService assinatura;
    @Autowired FinanceiroService financeiro;
    @Autowired br.com.nexo.ia.ContextoIaService contextos;
    @Autowired EquipeService equipe;
    @Autowired DocumentoService documentos;
    @Autowired MembroRepository membros;
    @Autowired MetaService metas;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean EmailCodigoService emails;
    @LocalServerPort int porta;
    private final HttpClient http=HttpClient.newHttpClient();
    @DynamicPropertySource static void banco(DynamicPropertyRegistry registry){BancoAssinaturaTeste.configurar(registry);}
    private BancoAssinaturaTeste.Conta conta(){return BancoAssinaturaTeste.criar(organizacoes,usuarios,auth);}
    private void plano(BancoAssinaturaTeste.Conta c,String plano){var checkout=assinatura.criar(c.usuario(),plano,UUID.randomUUID(),false); assinatura.confirmar(c.usuario(),checkout.id(),ProvedorPagamento.Metodo.pix,ProvedorPagamento.Cenario.aprovado);}
    private FinanceiroService.Lancamento lancamento(String tipo,String descricao,String valor,LocalDate data){return new FinanceiroService.Lancamento(tipo,descricao,new BigDecimal(valor),data,"Serviços","Principal");}
    private String token(EquipeService.ConviteCriado convite){return URI.create(convite.linkAceite()).getFragment();}
    @Test void contextoIaMantemIsolamentoRealECompartilhaSomenteAgregados() {
        var a=conta();var b=conta();var dia=financeiro.periodo(null,null).fim();
        plano(a,"pro");plano(b,"pro");
        financeiro.salvar(a.usuario().organizacaoId(),null,lancamento("receita","Descrição privada A","12.34",dia));
        financeiro.salvar(b.usuario().organizacaoId(),null,lancamento("receita","Descrição privada B","987654.32",dia));
        var entrada=new br.com.nexo.ia.ContextoIaService.Entrada("/dashboard","resumo",dia,dia);
        var contexto=contextos.montar(a.usuario().organizacaoId(),entrada,true);
        assertTrue(contexto.texto().contains("12.34"));assertFalse(contexto.texto().contains("987654.32"));
        assertFalse(contexto.texto().contains("Descrição privada"));assertFalse(contexto.texto().contains(a.email()));
        var semDados=contextos.montar(a.usuario().organizacaoId(),entrada,false);
        assertFalse(semDados.texto().contains("12.34"));
    }
    private BancoAssinaturaTeste.Conta participar(BancoAssinaturaTeste.Conta dono,BancoAssinaturaTeste.Conta convidado,String papel){
        var convite=equipe.convidar(dono.usuario(),convidado.email(),papel);
        equipe.aceitar(convidado.usuario(),token(convite));
        var selecionado=auth.selecionarOrganizacao(convidado.token(),dono.usuario().organizacaoId());
        return new BancoAssinaturaTeste.Conta(selecionado,convidado.token(),convidado.email());
    }

    @Test void lancamentosPersistemESomamComComercioSemDuplicarOuMisturarOrganizacoes(){
        var c=conta();var outra=conta();var dia=LocalDate.of(2026,10,10);Long org=c.usuario().organizacaoId();
        var movimento=financeiro.salvar(org,null,lancamento("receita","Serviço","100.20",dia));
        financeiro.salvar(org,null,lancamento("despesa","Custo","20.10",dia));
        financeiro.salvar(outra.usuario().organizacaoId(),null,lancamento("receita","Não pode aparecer","999",dia));
        jdbc.update("INSERT INTO despesas (organizacao_id,descricao,valor,categoria,data_despesa,forma_pagamento) VALUES (?,'Despesa comercial',10,'Serviços',?,'pix')",org,dia);
        jdbc.update("INSERT INTO vendas (organizacao_id,forma_pagamento,total_venda,custo_total,lucro_total,criado_em) VALUES (?,'pix',50,20,30,?::date + interval '12 hours')",org,dia);
        var resumo=financeiro.resumo(org,dia,dia);
        assertEquals(new BigDecimal("150.20"),resumo.receitas());assertEquals(new BigDecimal("30.10"),resumo.despesas());assertEquals(new BigDecimal("120.10"),resumo.saldo());
        assertEquals(4,resumo.movimentacoes().size());assertEquals(movimento.id(),resumo.movimentacoes().stream().filter(m->m.descricao().equals("Serviço")).findFirst().orElseThrow().id());
        assertThrows(IllegalArgumentException.class,()->financeiro.salvar(outra.usuario().organizacaoId(),movimento.id(),lancamento("receita","Invasão","1",dia)));
        assertThrows(IllegalArgumentException.class,()->financeiro.remover(outra.usuario().organizacaoId(),movimento.id()));
        financeiro.salvar(org,movimento.id(),lancamento("receita","Serviço atualizado","120.20",dia));
        assertEquals(new BigDecimal("170.20"),financeiro.resumo(org,dia,dia).receitas());
    }
    @Test void criacaoIdempotenteRejeitaMudancaDePayloadEPermiteMesmaChaveEmOutraOrganizacao() throws Exception {
        var c=conta();var outra=conta();var dados=lancamento("receita","Único","25.10",financeiro.periodo(null,null).fim());var chave=UUID.randomUUID();
        try(var executor=java.util.concurrent.Executors.newFixedThreadPool(2)){
            var a=executor.submit(()->financeiro.salvar(c.usuario().organizacaoId(),null,dados,chave));
            var b=executor.submit(()->financeiro.salvar(c.usuario().organizacaoId(),null,dados,chave));
            assertEquals(a.get(10,java.util.concurrent.TimeUnit.SECONDS).id(),b.get(10,java.util.concurrent.TimeUnit.SECONDS).id());
        }
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM movimentacoes WHERE organizacao_id=?",Integer.class,c.usuario().organizacaoId()));
        assertThrows(IllegalArgumentException.class,()->financeiro.salvar(c.usuario().organizacaoId(),null,lancamento("receita","Outro","1",financeiro.periodo(null,null).fim()),chave));
        assertNotNull(financeiro.salvar(outra.usuario().organizacaoId(),null,dados,chave));
    }
    @Test void periodoValoresEComparativoUsamIntervalosReais(){
        var c=conta();var org=c.usuario().organizacaoId();var inicio=LocalDate.of(2026,10,10);plano(c,"pro");
        financeiro.salvar(org,null,lancamento("receita","Anterior","10",inicio.minusDays(1)));
        financeiro.salvar(org,null,lancamento("receita","Atual","30",inicio));
        financeiro.salvar(org,null,lancamento("despesa","Saída","5",inicio.plusDays(1)));
        var analise=financeiro.analise(org,inicio,inicio.plusDays(1));
        assertEquals(inicio.minusDays(2),analise.anterior().inicio());assertEquals(new BigDecimal("10.00"),analise.anterior().receitas());
        assertEquals(new BigDecimal("25.00"),analise.evolucao().getLast().saldo());assertEquals(new BigDecimal("5.00"),analise.categorias().get("Serviços"));
        assertThrows(IllegalArgumentException.class,()->financeiro.periodo(inicio,inicio.minusDays(1)));
        assertThrows(IllegalArgumentException.class,()->financeiro.periodo(inicio,inicio.plusDays(367)));
        assertThrows(IllegalArgumentException.class,()->financeiro.salvar(org,null,lancamento("receita","Inválido","0",inicio)));
        assertThrows(IllegalArgumentException.class,()->financeiro.salvar(org,null,lancamento("despesa","Inválido","1.001",inicio)));
    }
    @Test void proExportaFiltroUtf8ECelulasSegurasEFreeNaoExporta() throws Exception {
        var c=conta();var org=c.usuario().organizacaoId();var dia=LocalDate.of(2026,10,10);
        financeiro.salvar(org,null,lancamento("receita","=HYPERLINK(\"x\")","10",dia));
        financeiro.salvar(org,null,lancamento("despesa","Fora do período","1",dia.minusDays(1)));
        assertEquals(403,requisicao("GET","/api/financeiro/exportar",null,c.token()).statusCode());
        assertEquals(403,requisicao("GET","/api/financeiro/analise",null,c.token()).statusCode());plano(c,"pro");
        var resposta=requisicao("GET","/api/financeiro/exportar?inicio=2026-10-10&fim=2026-10-10",null,c.token());
        assertEquals(200,resposta.statusCode());assertTrue(resposta.body().startsWith("\uFEFFData;"));assertTrue(resposta.body().contains("\"'=HYPERLINK(\"\"x\"\")\""));assertFalse(resposta.body().contains("Fora do período"));
    }
    @Test void conviteSoPodeSerAceitoUmaVezPeloEmailVerificadoSemMoverDados(){
        var dono=conta();var convidado=conta();var outro=conta();plano(dono,"business");
        var original=convidado.usuario().organizacaoId();var registro=financeiro.salvar(original,null,lancamento("receita","Pessoal","15",financeiro.periodo(null,null).fim()));
        var convite=equipe.convidar(dono.usuario(),convidado.email(),"membro");var segredo=token(convite);
        assertFalse(jdbc.queryForObject("SELECT token_hash FROM convites_organizacao WHERE id=?",String.class,convite.id()).contains(segredo));
        verify(emails).enviarConvite(eq(convidado.email()),eq(dono.usuario().organizacaoNome()),eq(convite.linkAceite()));
        assertThrows(IllegalArgumentException.class,()->equipe.aceitar(outro.usuario(),segredo));
        equipe.aceitar(convidado.usuario(),segredo);assertThrows(IllegalArgumentException.class,()->equipe.aceitar(convidado.usuario(),segredo));
        assertNull(jdbc.queryForObject("SELECT token_hash FROM convites_organizacao WHERE id=?",String.class,convite.id()));
        assertEquals(original,usuarios.findById(convidado.usuario().id()).orElseThrow().getOrganizacao().getId());
        assertEquals(registro.id(),financeiro.resumo(original,null,null).movimentacoes().getFirst().id());assertEquals(2,membros.organizacoes(convidado.usuario().id()).size());
        assertEquals("membro",auth.selecionarOrganizacao(convidado.token(),dono.usuario().organizacaoId()).papel());
        assertThrows(AcessoNegadoException.class,()->auth.selecionarOrganizacao(outro.token(),dono.usuario().organizacaoId()));
    }
    @Test void convitesExpiradosRevogadosEDuplicadosNaoConcedemAcesso(){
        var dono=conta();var convidado=conta();plano(dono,"business");var convite=equipe.convidar(dono.usuario(),convidado.email(),"membro");
        assertThrows(IllegalArgumentException.class,()->equipe.convidar(dono.usuario(),convidado.email(),"membro"));
        jdbc.update("UPDATE convites_organizacao SET expira_em=now()-interval '1 second' WHERE id=?",convite.id());
        assertThrows(IllegalArgumentException.class,()->equipe.aceitar(convidado.usuario(),token(convite)));
        equipe.listar(dono.usuario());assertNull(jdbc.queryForObject("SELECT token_hash FROM convites_organizacao WHERE id=?",String.class,convite.id()));
        var novo=equipe.convidar(dono.usuario(),convidado.email(),"membro");equipe.revogarConvite(dono.usuario(),novo.id());
        assertThrows(IllegalArgumentException.class,()->equipe.aceitar(convidado.usuario(),token(novo)));
        assertThrows(IllegalArgumentException.class,()->equipe.convidar(dono.usuario(),"inválido","membro"));
        assertThrows(IllegalArgumentException.class,()->equipe.convidar(dono.usuario(),convidado.email(),"proprietario"));
    }
    @Test void limiteConsideraMembrosEConvitesReservados(){
        var dono=conta();plano(dono,"business");for(int i=0;i<9;i++) equipe.convidar(dono.usuario(),"reserva-"+UUID.randomUUID()+"@example.com","membro");
        assertThrows(IllegalArgumentException.class,()->equipe.convidar(dono.usuario(),"extra@example.com","membro"));
        assertEquals(9,equipe.listar(dono.usuario()).convites().size());
        equipe.revogarConvite(dono.usuario(),equipe.listar(dono.usuario()).convites().getFirst().id());
        assertNotNull(equipe.convidar(dono.usuario(),"extra@example.com","membro"));
    }
    @ParameterizedTest @ValueSource(strings={"free","pro"}) void equipeEDocumentosExigemBusiness(String destino){
        var c=conta();if(!destino.equals("free"))plano(c,destino);
        assertThrows(AcessoNegadoException.class,()->equipe.listar(c.usuario()));assertThrows(AcessoNegadoException.class,()->documentos.listar(c.usuario().organizacaoId()));
    }
    @Test void membroRegistraMasNaoAlteraEstruturaEquipePreferenciasOuAssinatura() throws Exception {
        var dono=conta();var pessoal=conta();plano(dono,"business");var membro=participar(dono,pessoal,"membro");
        String dados="{\"tipo\":\"receita\",\"descricao\":\"Registro membro\",\"valor\":10,\"data\":\"2026-10-10\",\"categoria\":\"Serviços\",\"conta\":\"Principal\",\"organizacaoId\":0}";
        assertEquals(200,requisicao("POST","/api/financeiro/movimentacoes",dados,membro.token()).statusCode());
        var id=financeiro.resumo(dono.usuario().organizacaoId(),LocalDate.of(2026,10,10),LocalDate.of(2026,10,10)).movimentacoes().getFirst().id();
        assertEquals(403,requisicao("DELETE","/api/financeiro/movimentacoes/"+id,null,membro.token()).statusCode());
        assertEquals(403,requisicao("POST","/api/produtos","{}",membro.token()).statusCode());
        assertEquals(403,requisicao("PUT","/api/saas/onboarding","{\"perfilUso\":\"pessoal\",\"objetivos\":[]}",membro.token()).statusCode());
        assertEquals(403,requisicao("PUT","/api/organizacoes/atual","{\"nome\":\"Invasão\"}",membro.token()).statusCode());
        assertEquals(403,requisicao("POST","/api/equipe/convites","{\"email\":\"teste@example.com\",\"papel\":\"administrador\"}",membro.token()).statusCode());
        assertFalse(assinatura.carregar(membro.usuario()).podeGerenciar());
        assertThrows(AcessoNegadoException.class,()->assinatura.criar(membro.usuario(),"free",UUID.randomUUID(),false));
    }
    @Test void administradorNaoPromoveProprietarioNaoGerenciaAdminsENaoTrocaPlano() throws Exception {
        var dono=conta();var a=conta();var b=conta();plano(dono,"business");var admin=participar(dono,a,"administrador");var outroAdmin=participar(dono,b,"administrador");
        assertThrows(AcessoNegadoException.class,()->equipe.convidar(admin.usuario(),"novo@example.com","administrador"));
        assertThrows(AcessoNegadoException.class,()->equipe.alterarMembro(admin.usuario(),outroAdmin.usuario().id(),"membro",false));
        assertThrows(AcessoNegadoException.class,()->equipe.alterarMembro(admin.usuario(),dono.usuario().id(),null,true));
        assertThrows(AcessoNegadoException.class,()->equipe.alterarMembro(dono.usuario(),dono.usuario().id(),"membro",false));
        assertEquals(200,requisicao("PUT","/api/organizacoes/atual","{\"nome\":\"Equipe renomeada\"}",admin.token()).statusCode());
        assertEquals("Equipe renomeada",auth.autenticarSessao(dono.token()).organizacaoNome());
        assertFalse(assinatura.carregar(admin.usuario()).podeGerenciar());
    }
    @Test void mudancaDePapelERemocaoRevogamSoSessoesDoEspacoCompartilhado(){
        var dono=conta();var convidado=conta();plano(dono,"business");var sessaoPessoal=auth.login(convidado.email(),BancoAssinaturaTeste.SENHA);
        var membro=participar(dono,convidado,"membro");equipe.alterarMembro(dono.usuario(),membro.usuario().id(),"administrador",false);
        assertThrows(IllegalArgumentException.class,()->auth.autenticarSessao(membro.token()));assertEquals(convidado.usuario().organizacaoId(),auth.autenticarSessao(sessaoPessoal.token()).organizacaoId());
        var login=auth.login(convidado.email(),BancoAssinaturaTeste.SENHA);assertEquals("administrador",auth.selecionarOrganizacao(login.token(),dono.usuario().organizacaoId()).papel());
        equipe.alterarMembro(dono.usuario(),convidado.usuario().id(),null,true);
        assertThrows(IllegalArgumentException.class,()->auth.autenticarSessao(login.token()));assertEquals(1,membros.organizacoes(convidado.usuario().id()).size());assertTrue(usuarios.findById(convidado.usuario().id()).orElseThrow().isAtivo());
    }
    @Test void downgradePreservaArquivosMetasLancamentosEMembrosEUpgradeRestaura() throws Exception {
        var dono=conta();var convidado=conta();plano(dono,"business");var membro=participar(dono,convidado,"membro");var org=dono.usuario().organizacaoId();
        var doc=documentos.salvar(dono.usuario(),"saldo.txt","Resumo", "Receitas 10".getBytes(StandardCharsets.UTF_8));
        var meta=metas.criar(org,"Objetivo atingido","moeda",BigDecimal.TEN,BigDecimal.TEN,null);assertEquals("concluida",meta.status());
        financeiro.salvar(org,null,lancamento("receita","Preservado","10",financeiro.periodo(null,null).fim()));plano(dono,"free");
        assertEquals(403,requisicao("GET","/api/financeiro/resumo",null,membro.token()).statusCode());
        assertThrows(AcessoNegadoException.class,()->documentos.arquivo(org,doc.id()));assertEquals(1,financeiro.resumo(org,null,null).movimentacoes().size());
        assertNotNull(membros.vinculo(convidado.usuario().id(),org));assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM documentos_organizacao WHERE id=?",Integer.class,doc.id()));
        plano(dono,"business");assertEquals("Receitas 10",documentos.texto(org,doc.id()));assertEquals(meta.id(),metas.listar(org).getFirst().id());assertEquals(200,requisicao("GET","/api/financeiro/resumo",null,membro.token()).statusCode());
    }
    @Test void documentosValidamTipoTamanhoIsolamentoEPermissao(){
        var dono=conta();var outra=conta();plano(dono,"business");plano(outra,"business");var bytes="Texto brasileiro: ação".getBytes(StandardCharsets.UTF_8);
        var doc=documentos.salvar(dono.usuario(),"../arquivo.txt","Contrato",bytes);assertEquals("arquivo.txt",doc.nome());assertArrayEquals(bytes,documentos.arquivo(dono.usuario().organizacaoId(),doc.id()).conteudo());
        assertThrows(IllegalArgumentException.class,()->documentos.arquivo(outra.usuario().organizacaoId(),doc.id()));assertThrows(IllegalArgumentException.class,()->documentos.remover(outra.usuario(),doc.id()));
        assertThrows(IllegalArgumentException.class,()->documentos.salvar(dono.usuario(),"arquivo.html","",bytes));assertThrows(IllegalArgumentException.class,()->documentos.salvar(dono.usuario(),"arquivo.pdf","",bytes));
        assertThrows(IllegalArgumentException.class,()->documentos.salvar(dono.usuario(),"arquivo.png","",new byte[]{(byte)137,80,78,71,0,0,0,0}));
        assertThrows(IllegalArgumentException.class,()->documentos.salvar(dono.usuario(),"arquivo.txt","",new byte[5*1024*1024+1]));
        assertThrows(IllegalArgumentException.class,()->documentos.salvar(dono.usuario(),"arquivo.txt","",new byte[]{(byte)255}));
        var convidado=participar(dono,conta(),"membro");assertThrows(AcessoNegadoException.class,()->documentos.salvar(convidado.usuario(),"membro.txt","",bytes));assertArrayEquals(bytes,documentos.arquivo(dono.usuario().organizacaoId(),doc.id()).conteudo());
    }
    @Test void contaLegadaCriaEspacoPessoalIdempotenteSemGanharGestaoNaEmpresa(){
        var dono=conta();plano(dono,"business");var org=dono.usuario().organizacaoId();
        var legado=new br.com.nexo.auth.Usuario(organizacoes.buscarPorId(org),"Pessoa legada",UUID.randomUUID()+"@example.com",new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(4).encode(BancoAssinaturaTeste.SENHA));
        legado.verificarEmail();usuarios.save(legado);jdbc.update("UPDATE usuarios SET papel='membro' WHERE id=?",legado.getId());
        var login=auth.login(legado.getEmail(),BancoAssinaturaTeste.SENHA);var pessoal=organizacoes.pessoal(login.usuario());assertEquals(pessoal.id(),organizacoes.pessoal(login.usuario()).id());assertNotEquals(org,pessoal.id());
        assertEquals("membro",auth.autenticarSessao(login.token()).papel());assertFalse(assinatura.carregar(auth.autenticarSessao(login.token())).podeGerenciar());
        assertEquals("proprietario",auth.selecionarOrganizacao(login.token(),pessoal.id()).papel());assertEquals(2,membros.organizacoes(legado.getId()).size());
    }
    @Test void documentosRevalidamPapelDepoisDoLockMesmoComContextoAntigo(){
        var dono=conta();plano(dono,"business");var admin=participar(dono,conta(),"administrador");
        equipe.alterarMembro(dono.usuario(),admin.usuario().id(),"membro",false);
        assertThrows(AcessoNegadoException.class,()->documentos.salvar(admin.usuario(),"stale.txt","", "Teste".getBytes(StandardCharsets.UTF_8)));
    }
    @Test void remocaoDeMembroLegadoPreservaLoginEmNovoEspacoPessoalSemMoverDados(){
        var dono=conta();plano(dono,"business");var org=dono.usuario().organizacaoId();
        var legado=new br.com.nexo.auth.Usuario(organizacoes.buscarPorId(org),"Pessoa legada",UUID.randomUUID()+"@example.com",new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(4).encode(BancoAssinaturaTeste.SENHA));
        legado.verificarEmail();usuarios.save(legado);jdbc.update("UPDATE usuarios SET papel='membro' WHERE id=?",legado.getId());
        var login=auth.login(legado.getEmail(),BancoAssinaturaTeste.SENHA);assertEquals("membro",login.usuario().papel());
        var registro=financeiro.salvar(org,null,lancamento("receita","Pertence à empresa","10",financeiro.periodo(null,null).fim()));
        equipe.alterarMembro(dono.usuario(),legado.getId(),null,true);
        var pessoal=auth.login(legado.getEmail(),BancoAssinaturaTeste.SENHA).usuario();assertNotEquals(org,pessoal.organizacaoId());assertEquals("proprietario",pessoal.papel());
        assertTrue(financeiro.resumo(pessoal.organizacaoId(),null,null).movimentacoes().isEmpty());assertEquals(registro.id(),financeiro.resumo(org,null,null).movimentacoes().getFirst().id());
    }
    @Test void iaSemConfiguracaoExplicaIndisponibilidadeSemInventarResposta() throws Exception {
        var c=conta();plano(c,"pro");assertTrue(requisicao("GET","/api/ia/status",null,c.token()).body().contains("\"configurada\":false"));
        var resposta=requisicao("POST","/api/ia/perguntar","{\"pergunta\":\"Como planejar?\"}",c.token());assertEquals(503,resposta.statusCode());assertFalse(resposta.body().contains("Exception"));
    }
    private HttpResponse<String> requisicao(String metodo,String caminho,String corpo,String token)throws Exception{
        var request=HttpRequest.newBuilder(URI.create("http://localhost:"+porta+caminho)).header("Content-Type","application/json");if(token!=null){
            request.header("Cookie", "nexo_session=" + token);
            try { request.header("X-Nexo-Organizacao", auth.autenticarSessao(token).organizacaoId().toString()); }
            catch (IllegalArgumentException e) { /* Mantém os cenários de sessão expirada no servidor. */ }
        }
        request.method(metodo,corpo==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(corpo));return http.send(request.build(),HttpResponse.BodyHandlers.ofString());
    }
}
