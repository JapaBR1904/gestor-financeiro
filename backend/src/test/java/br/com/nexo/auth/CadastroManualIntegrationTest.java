package br.com.nexo.auth;

import java.net.URI;
import java.net.http.*;
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

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={
    "nexo.email.provider=disabled","nexo.auth.manual-approval-enabled=true",
    "nexo.admin.cadastros.usuario=operador","nexo.admin.cadastros.senha=Senha-Sintetica-Administrativa-123!",
    "nexo.frontend-url=http://localhost:3000","nexo.cookie.secure=false"})
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named="NEXO_TEST_MANUAL_APPROVAL",matches="true")
@EnabledIfEnvironmentVariable(named="NEXO_TEST_DB_URL",matches="jdbc:postgresql://127\\.0\\.0\\.1:55433/nexo_test")
class CadastroManualIntegrationTest {
    @LocalServerPort int porta;
    @Autowired JdbcTemplate jdbc;
    private final HttpClient http=HttpClient.newHttpClient();
    private final JsonMapper json=JsonMapper.builder().build();
    @DynamicPropertySource static void banco(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",()->System.getenv("NEXO_TEST_DB_URL"));
        r.add("spring.datasource.username",()->System.getenv().getOrDefault("NEXO_TEST_DB_USERNAME","nexo_app"));
        r.add("spring.datasource.password",()->System.getenv().getOrDefault("NEXO_TEST_DB_PASSWORD",""));
    }
    private HttpRequest request(String path,String body,String cookie) {
        var b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+porta+path)).timeout(java.time.Duration.ofSeconds(20));
        if(cookie!=null)b.header("Cookie",cookie);
        return body==null ? b.GET().build() : b.header("Origin","http://localhost:3000").header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build();
    }
    private HttpResponse<String> enviar(String path,String body,String cookie)throws Exception { return http.send(request(path,body,cookie),HttpResponse.BodyHandlers.ofString()); }
    private String cookie(HttpResponse<String> resposta,String nome) { return resposta.headers().allValues("set-cookie").stream().filter(v->v.startsWith(nome+"=")).map(v->v.split(";",2)[0]).findFirst().orElseThrow(); }
    private String admin()throws Exception {
        var r=enviar("/api/admin/cadastros/login",json.writeValueAsString(java.util.Map.of("usuario","operador","senha","Senha-Sintetica-Administrativa-123!")),null);
        assertEquals(200,r.statusCode());
        String configuracao=r.headers().firstValue("set-cookie").orElseThrow(); assertTrue(configuracao.contains("HttpOnly"));assertTrue(configuracao.contains("SameSite=Strict"));assertTrue(configuracao.contains("Path=/api/admin/cadastros"));
        return cookie(r,"nexo_admin_cadastros");
    }
    private Pedido cadastrar()throws Exception {
        String email="manual-"+UUID.randomUUID()+"@example.com";
        String body=json.writeValueAsString(java.util.Map.of("nome","Conta Sintética","email",email,"senha","Senha-Sintetica-Teste123!","confirmacaoSenha","Senha-Sintetica-Teste123!"));
        var r=enviar("/api/auth/cadastro",body,null);assertEquals(202,r.statusCode());assertTrue(json.readTree(r.body()).path("aprovacaoManualNecessaria").asBoolean());assertTrue(r.headers().allValues("set-cookie").isEmpty());
        Long id=jdbc.queryForObject("SELECT id FROM usuarios WHERE email=?",Long.class,email);
        return new Pedido(id,email);
    }
    private HttpResponse<String> login(Pedido p)throws Exception { return enviar("/api/auth/login",json.writeValueAsString(java.util.Map.of("email",p.email(),"senha","Senha-Sintetica-Teste123!")),null); }
    private String decisao(boolean aprovar,boolean identidade) { return json.writeValueAsString(java.util.Map.of("aprovar",aprovar,"identidadeConfirmada",identidade)); }
    @Test void acessoPendenteSoLiberaPorAdminSemMarcarEmailVerificado()throws Exception {
        Pedido p=cadastrar();assertEquals(400,login(p).statusCode());
        assertEquals(403,enviar("/api/admin/cadastros",null,null).statusCode());
        String admin=admin();String path="/api/admin/cadastros/"+p.id();
        assertEquals(400,enviar(path,decisao(true,false),admin).statusCode());
        assertEquals(403,enviar(path,decisao(true,true),null).statusCode());
        assertEquals(200,enviar(path,decisao(true,true),admin).statusCode());
        assertEquals(400,enviar(path,decisao(true,true),admin).statusCode());
        assertNull(jdbc.queryForObject("SELECT email_verificado_em FROM usuarios WHERE id=?",java.sql.Timestamp.class,p.id()));
        var entrada=login(p);assertEquals(200,entrada.statusCode());String normal=cookie(entrada,"nexo_session");
        assertEquals(200,enviar("/api/auth/me",null,normal).statusCode());
        assertEquals(403,enviar("/api/admin/cadastros",null,normal).statusCode());
        assertEquals("operador",jdbc.queryForObject("SELECT decidido_por FROM cadastros_manuais WHERE usuario_id=?",String.class,p.id()));
        assertEquals(200,enviar("/api/admin/cadastros/logout","{}",admin).statusCode());assertEquals(403,enviar("/api/admin/cadastros",null,admin).statusCode());
    }
    @Test void recusaNegaLoginEConcorrenciaNaoReescreveDecisao()throws Exception {
        Pedido p=cadastrar();String admin=admin();String path="/api/admin/cadastros/"+p.id();
        var a=http.sendAsync(request(path,decisao(true,true),admin),HttpResponse.BodyHandlers.ofString());
        var b=http.sendAsync(request(path,decisao(false,false),admin),HttpResponse.BodyHandlers.ofString());
        CompletableFuture.allOf(a,b).get(30,java.util.concurrent.TimeUnit.SECONDS);
        var status=java.util.stream.Stream.of(a.join().statusCode(),b.join().statusCode()).sorted().toList();assertEquals(java.util.List.of(200,400),status);
        Pedido recusado=cadastrar();assertEquals(200,enviar("/api/admin/cadastros/"+recusado.id(),decisao(false,false),admin).statusCode());assertEquals(400,login(recusado).statusCode());
    }
    private record Pedido(Long id,String email) {}
}
