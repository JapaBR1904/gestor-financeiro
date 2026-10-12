package br.com.nexo.saas;

public enum RecursoPlano {
    METAS("pro"),
    FLUXO_CAIXA("pro"),
    IA_BASICA("pro"),
    EXPORTACAO("pro"),
    COMPARATIVOS("pro"),
    EQUIPE("business"),
    PERMISSOES("business"),
    DOCUMENTOS("business"),
    IA_DOCUMENTOS("business");

    private final String planoMinimo;

    RecursoPlano(String planoMinimo) {
        this.planoMinimo = planoMinimo;
    }

    public String planoMinimo() {
        return planoMinimo;
    }
}
