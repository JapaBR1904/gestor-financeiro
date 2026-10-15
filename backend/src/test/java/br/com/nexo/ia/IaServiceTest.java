package br.com.nexo.ia;

import br.com.nexo.documento.DocumentoService;
import br.com.nexo.financeiro.FinanceiroService;
import br.com.nexo.saas.AcessoPlanoService;
import br.com.nexo.saas.RecursoPlano;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class IaServiceTest {
    private HttpServer servidor;
    private IaService service;
    private final AcessoPlanoService acesso=mock(AcessoPlanoService.class);
    private final FinanceiroService financeiro=mock(FinanceiroService.class);
    private final DocumentoService documentos=mock(DocumentoService.class);
    private final br.com.nexo.meta.MetaService metas=mock(br.com.nexo.meta.MetaService.class);
    private final br.com.nexo.relatorio.RelatorioService relatorios=mock(br.com.nexo.relatorio.RelatorioService.class);
    private final br.com.nexo.saas.SaasService saas=mock(br.com.nexo.saas.SaasService.class);
    private final AtomicReference<String> corpo=new AtomicReference<>();
    private final AtomicReference<String> header=new AtomicReference<>();
    private String resposta="{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"raciocínio privado\",\"thought\":true},{\"text\":\"Organize o orçamento.\"}]}}]}";
    private int status=200;
    @BeforeEach void iniciar()throws Exception {
        servidor=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        servidor.createContext("/generateContent",exchange->{
            corpo.set(new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));header.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
            byte[] bytes=resposta.getBytes(StandardCharsets.UTF_8);exchange.sendResponseHeaders(status,bytes.length);exchange.getResponseBody().write(bytes);exchange.close();
        });servidor.start();service=criar("chave-ficticia-para-teste",Duration.ofSeconds(2));
    }
    private IaService criar(String chave,Duration timeout){return new IaService(acesso,documentos,new ContextoIaService(financeiro,metas,relatorios,saas),chave,"gemini-flash-latest",HttpClient.newHttpClient(),URI.create("http://127.0.0.1:"+servidor.getAddress().getPort()+"/generateContent"),timeout);}
    @AfterEach void encerrar(){service.encerrar();servidor.stop(0);}
    @Test void usaContratoGenerateContentHeaderETextoPublicoSemEnviarResumoPorPadrao(){
        assertEquals("Organize o orçamento.",service.perguntar(7L,"Como planejar meu mês?").resposta());
        verify(acesso).exigir(7L,RecursoPlano.IA_BASICA);verifyNoInteractions(financeiro,documentos);
        assertEquals("chave-ficticia-para-teste",header.get());assertTrue(corpo.get().contains("systemInstruction"));assertTrue(corpo.get().contains("maxOutputTokens"));assertFalse(corpo.get().contains("chave-ficticia-para-teste"));
    }
    @Test void resumoDependeDeConsentimentoEUsaSoAgregadosDaOrganizacao(){
        when(financeiro.resumo(7L,null,null)).thenReturn(new FinanceiroService.Resumo(LocalDate.of(2026,10,1),LocalDate.of(2026,10,12),BigDecimal.TEN,BigDecimal.ONE,new BigDecimal("9"),List.of()));
        service.perguntar(7L,"Como planejar?",true);verify(financeiro).resumo(7L,null,null);assertTrue(corpo.get().contains("entradasRegistradas"));assertTrue(corpo.get().contains("resultadoPeriodo"));assertFalse(corpo.get().contains("movimentacoes"));
    }
    @Test void documentoExigeBusinessConsentimentoEConsultaIsolada(){
        assertThrows(IllegalArgumentException.class,()->service.documento(7L,8L,"Resuma",false));verifyNoInteractions(documentos);
        when(documentos.texto(7L,8L)).thenReturn("Documento da organização 7");service.documento(7L,8L,"Resuma",true);
        verify(acesso,times(2)).exigir(7L,RecursoPlano.IA_DOCUMENTOS);verify(documentos).texto(7L,8L);assertTrue(corpo.get().contains("Documento da organização 7"));
    }
    @Test void ausenciaDeChaveNaoCriaRespostaFalsaNemChamaRede(){
        service.encerrar();service=criar("",Duration.ofSeconds(2));assertFalse(service.status(7L).configurada());
        assertThrows(IllegalStateException.class,()->service.perguntar(7L,"Como planejar?"));assertNull(corpo.get());
    }
    @Test void entradaVaziaOuMuitoLongaNaoChamaRede(){assertThrows(IllegalArgumentException.class,()->service.perguntar(7L," "));assertThrows(IllegalArgumentException.class,()->service.perguntar(7L,"a".repeat(3001)));assertNull(corpo.get());}
    @Test void erroDoProvedorNaoExpoeCorpoChaveOuPergunta(){status=500;resposta="chave-ficticia-para-teste token-fixture documento privado";var erro=assertThrows(IllegalStateException.class,()->service.perguntar(7L,"Pergunta privada"));assertFalse(erro.toString().contains("token-fixture"));assertFalse(erro.toString().contains("chave-ficticia-para-teste"));assertNull(erro.getCause());}
    @Test void limiteDoProvedorTemMensagemUtil(){status=429;assertTrue(assertThrows(IllegalStateException.class,()->service.perguntar(7L,"Como planejar?")).getMessage().contains("limite temporário"));}
    @Test void jsonInvalidoOuRespostaSemTextoNaoInventaResultado(){resposta="{inválido";assertThrows(IllegalStateException.class,()->service.perguntar(7L,"Como planejar?"));resposta="{\"candidates\":[]}";assertThrows(IllegalStateException.class,()->service.perguntar(7L,"Como planejar?"));}
    @Test void timeoutTotalCancelaChamada(){
        servidor.removeContext("/generateContent");servidor.createContext("/generateContent",exchange->{try{new java.util.concurrent.CountDownLatch(1).await(500,java.util.concurrent.TimeUnit.MILLISECONDS);}catch(InterruptedException e){Thread.currentThread().interrupt();}exchange.close();});
        service.encerrar();service=criar("chave-ficticia-para-teste",Duration.ofMillis(100));assertThrows(IllegalStateException.class,()->service.perguntar(7L,"Como planejar?"));
    }
    @Test void bloqueioPorPlanoAconteceAntesDaRede(){doThrow(new br.com.nexo.config.AcessoNegadoException("Recurso Pro")).when(acesso).exigir(7L,RecursoPlano.IA_BASICA);assertThrows(br.com.nexo.config.AcessoNegadoException.class,()->service.perguntar(7L,"Como planejar?"));assertNull(corpo.get());}
}
