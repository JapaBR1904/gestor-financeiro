package br.com.nexo.ia;

import br.com.nexo.financeiro.FinanceiroService;
import br.com.nexo.meta.MetaService;
import br.com.nexo.relatorio.RelatorioService;
import br.com.nexo.saas.SaasService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ContextoIaServiceTest {
    private final FinanceiroService financeiro=mock(FinanceiroService.class);
    private final MetaService metas=mock(MetaService.class);
    private final RelatorioService relatorios=mock(RelatorioService.class);
    private final SaasService saas=mock(SaasService.class);
    private final ContextoIaService contexto=new ContextoIaService(financeiro,metas,relatorios,saas);
    private final LocalDate inicio=LocalDate.of(2026,10,1), fim=LocalDate.of(2026,10,15);

    @Test void semConsentimentoNaoConsultaFinancasMetasOuRelatorios() {
        when(saas.perfilAtual(7L)).thenReturn("pessoal");
        var dados=contexto.montar(7L,new ContextoIaService.Entrada("/dashboard","resumo",inicio,fim),false);
        verifyNoInteractions(financeiro,metas,relatorios);
        assertFalse(dados.base().dadosAutorizados());assertEquals("pessoal",dados.base().perfil());
        assertTrue(dados.texto().contains("não enviados"));
    }
    @Test void agregaSomenteOrganizacaoEPeriodoSolicitadosSemDescricaoContaOuClientes() {
        var item=new FinanceiroService.Movimentacao(1L,"manual","despesa","Descrição privada",BigDecimal.TEN,inicio,"Transporte","Conta privada");
        when(financeiro.resumo(7L,inicio,fim)).thenReturn(new FinanceiroService.Resumo(inicio,fim,BigDecimal.TEN,BigDecimal.ONE,new BigDecimal("9"),List.of(item)));
        var dados=contexto.montar(7L,new ContextoIaService.Entrada("/despesas","despesas",inicio,fim),true);
        verify(financeiro).resumo(7L,inicio,fim);verifyNoMoreInteractions(financeiro);verifyNoInteractions(metas,relatorios);
        assertTrue(dados.texto().contains("Transporte"));assertFalse(dados.texto().contains("Descrição privada"));assertFalse(dados.texto().contains("Conta privada"));
        assertEquals("2026-10-01 a 2026-10-15",dados.base().periodo());
    }
    @Test void metasLimitadasSemBuscarResumoOuDocumentosAutomaticamente() {
        when(metas.listar(7L)).thenReturn(java.util.stream.IntStream.range(0,12).mapToObj(i -> new MetaService.MetaResumo((long)i,"Meta "+i,"moeda",BigDecimal.TEN,BigDecimal.ONE,null,"ativa")).toList());
        var dados=contexto.montar(7L,new ContextoIaService.Entrada("/metas","metas",inicio,fim),true);
        assertTrue(dados.texto().contains("\"totalMetas\":12"));assertFalse(dados.texto().contains("Meta 9"));
        verify(metas).listar(7L);verifyNoInteractions(financeiro,relatorios);
    }
    @Test void paginaDeDocumentosNaoEnviaArquivosNemFinancas() {
        var dados=contexto.montar(7L,new ContextoIaService.Entrada("/documentos","documentos",null,null),true);
        verifyNoInteractions(financeiro,metas,relatorios);
        assertFalse(dados.base().dadosAutorizados());assertTrue(dados.base().periodo().contains("Nenhum documento enviado"));
    }
    @Test void telaOuAssuntoArbitrarioSaoRejeitadosAntesDeConsultarDados() {
        assertThrows(IllegalArgumentException.class,()->contexto.montar(7L,new ContextoIaService.Entrada("/organizacao/8","resumo",inicio,fim),true));
        assertThrows(IllegalArgumentException.class,()->contexto.montar(7L,new ContextoIaService.Entrada("/ia","editar",inicio,fim),true));
        verifyNoInteractions(financeiro,metas,relatorios,saas);
    }
}
