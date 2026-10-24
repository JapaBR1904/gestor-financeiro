package br.com.nexo.auth;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={"nexo.email.provider=disabled","nexo.auth.email-verification-enabled=false"})
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named="NEXO_TEST_DB_URL", matches="jdbc:postgresql://(127\\.0\\.0\\.1|localhost):[0-9]+/nexo_test")
class RecuperacaoAssistidaIntegrationTest {
    @LocalServerPort int porta;
    @Autowired AuthService auth;
    @Autowired JdbcTemplate jdbc;
    private final HttpClient http=HttpClient.newHttpClient();
    private final JsonMapper json=JsonMapper.builder().build();
    @DynamicPropertySource static void banco(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",()->System.getenv("NEXO_TEST_DB_URL"));
        r.add("spring.datasource.username",()->System.getenv().getOrDefault("NEXO_TEST_DB_USERNAME","nexo_teste"));
        r.add("spring.datasource.password",()->System.getenv().getOrDefault("NEXO_TEST_DB_PASSWORD",""));
    }
    private String conta() { String email="assistida-"+UUID.randomUUID()+"@example.com"; auth.cadastrar("Conta sintética",email,"Senha-Antiga-Teste123!","Senha-Antiga-Teste123!"); return email; }
    private HttpRequest request(String path,String body,String cookie) {
        var b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+porta+path)).timeout(java.time.Duration.ofSeconds(20));
        if(cookie!=null)b.header("Cookie",cookie);
        return body==null?b.GET().build():b.header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build();
    }
    private HttpResponse<String> enviar(String path,String body,String cookie) throws Exception { return http.send(request(path,body,cookie),HttpResponse.BodyHandlers.ofString()); }
    private String cookie(HttpResponse<String> resposta,String nome) { return resposta.headers().allValues("set-cookie").stream().filter(v->v.startsWith(nome+"=")).map(v->v.split(";",2)[0]).findFirst().orElseThrow(); }
    private String admin() throws Exception { var resposta=enviar("/api/admin/local/login","{\"usuario\":\"admin\",\"senha\":\"admin\"}",null);assertEquals(200,resposta.statusCode());return cookie(resposta,"nexo_admin_local"); }
    private Pedido solicitar(String email) throws Exception {
        var r=enviar("/api/auth/recuperacao/assistida","{\"email\":\""+email+"\"}",null);assertEquals(200,r.statusCode());
        assertFalse(r.body().contains("prova"));
        assertTrue(r.headers().firstValue("set-cookie").orElseThrow().contains("HttpOnly"));
        return new Pedido(json.readTree(r.body()).path("protocolo").asLong(),cookie(r,"nexo_recovery"));
    }
    private HttpResponse<String> aprovar(Pedido p,String admin,boolean identidade) throws Exception { return enviar("/api/admin/local/recuperacoes/"+p.id(),"{\"aprovar\":true,\"identidadeConfirmada\":"+identidade+"}",admin); }
    private final String nova="{\"senha\":\"Senha-Nova-Teste456!\",\"confirmacaoSenha\":\"Senha-Nova-Teste456!\"}";

    @Test void fluxoHttpSemEmailExigeSessaoAdminIdentidadeENavegadorSolicitante() throws Exception {
        String email=conta(); String sessao=auth.login(email,"Senha-Antiga-Teste123!").token(); Pedido p=solicitar(email);
        assertEquals(403,enviar("/api/admin/local/recuperacoes",null,null).statusCode());
        assertEquals(403,aprovar(p,"nexo_session="+sessao,true).statusCode());
        assertEquals("aguardando",json.readTree(enviar("/api/auth/recuperacao/assistida",null,p.cookie()).body()).path("estado").asString());
        assertEquals(400,enviar("/api/auth/recuperacao/redefinir",nova,p.cookie()).statusCode());
        String admin=admin(); assertEquals(400,aprovar(p,admin,false).statusCode());
        var lista=enviar("/api/admin/local/recuperacoes",null,admin);assertEquals(200,lista.statusCode());assertTrue(lista.body().contains(email));assertFalse(lista.body().contains("Hash"));
        assertEquals(200,aprovar(p,admin,true).statusCode());
        assertEquals(400,enviar("/api/auth/recuperacao/redefinir",nova,null).statusCode());
        assertEquals(200,enviar("/api/auth/recuperacao/redefinir",nova,p.cookie()).statusCode());
        assertEquals(400,enviar("/api/auth/recuperacao/redefinir",nova,p.cookie()).statusCode());
        assertThrows(IllegalArgumentException.class,()->auth.autenticarSessao(sessao));
        assertEquals(email,auth.login(email,"Senha-Nova-Teste456!").usuario().email());
    }
    @Test void novoPedidoInvalidaAnteriorEExpiracaoImpedeAprovacao() throws Exception {
        String email=conta(); Pedido anterior=solicitar(email);
        jdbc.update("update codigos_autenticacao set criado_em=now()-interval '46 seconds' where id=?",anterior.id());
        Pedido atual=solicitar(email);String admin=admin();assertEquals(400,aprovar(anterior,admin,true).statusCode());
        assertEquals("expirada",json.readTree(enviar("/api/auth/recuperacao/assistida",null,anterior.cookie()).body()).path("estado").asString());
        jdbc.update("update codigos_autenticacao set prova_expira_em=now()-interval '1 second' where id=?",atual.id());
        assertEquals(400,aprovar(atual,admin,true).statusCode());
    }
    @Test void provaAprovadaNaoPodeSerConsumidaDuasVezesEmConcorrencia() throws Exception {
        Pedido p=solicitar(conta());assertEquals(200,aprovar(p,admin(),true).statusCode());
        var a=http.sendAsync(request("/api/auth/recuperacao/redefinir",nova,p.cookie()),HttpResponse.BodyHandlers.ofString());
        var b=http.sendAsync(request("/api/auth/recuperacao/redefinir",nova,p.cookie()),HttpResponse.BodyHandlers.ofString());
        CompletableFuture.allOf(a,b).join();var codigos=java.util.List.of(a.join().statusCode(),b.join().statusCode());
        assertEquals(1,codigos.stream().filter(v->v==200).count());assertEquals(1,codigos.stream().filter(v->v==400).count());
    }
    private record Pedido(long id,String cookie) { @Override public String toString(){return "Pedido[autorização protegida]";} }
}
