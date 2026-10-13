"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Icone } from "./Icone";
import { WorkspaceShell } from "./WorkspaceShell";
import { useWorkspace } from "../lib/workspace";
import { BloqueioPlano, VazioProduto } from "./EstadoProduto";
import {
  Documento,
  enviarDocumento,
  baixarDocumento,
  listarDocumentos,
  removerDocumento,
} from "../lib/documentos";
import { analisarDocumento, statusIa } from "../lib/ia";

function tamanhoArquivo(bytes: number) {
  if (bytes < 1024) return `${bytes.toLocaleString("pt-BR")} B`;
  const unidade = bytes < 1024 * 1024 ? "KB" : "MB";
  const valor = bytes / (unidade === "KB" ? 1024 : 1024 * 1024);
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unidade}`;
}
export function DocumentosConteudo() {
  const { config, usuario } = useWorkspace();
  const business = config?.plano === "business";
  const [documentos, setDocumentos] = useState<Documento[] | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploadAberto, setUploadAberto] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [revisao, setRevisao] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  const entradaArquivo = useRef<HTMLInputElement>(null);
  const [iaDisponivel, setIaDisponivel] = useState(false);
  const [analise, setAnalise] = useState<Documento | null>(null);
  const [autorizado, setAutorizado] = useState(false);
  const [pergunta, setPergunta] = useState(
    "Resuma o documento e aponte informações financeiras que merecem atenção.",
  );
  const [resposta, setResposta] = useState("");
  const podeGerenciar =
    usuario?.papel === "proprietario" || usuario?.papel === "administrador";
  useEffect(() => {
    if (!business) return;
    let ativo = true;
    Promise.all([
      listarDocumentos(),
      statusIa().catch(() => ({ configurada: false })),
    ])
      .then(([lista, ia]) => {
        if (ativo) {
          setDocumentos(lista);
          setIaDisponivel(ia.configurada);
          setErro("");
        }
      })
      .catch((e) => {
        if (ativo)
          setErro(
            e instanceof Error
              ? e.message
              : "Não foi possível carregar os documentos.",
          );
      });
    return () => {
      ativo = false;
    };
  }, [business, revisao, usuario?.organizacaoId]);
  async function acao(executar: () => Promise<void>) {
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    try {
      await executar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!arquivo) return setErro("Escolha um arquivo.");
    if (arquivo.size > 5 * 1024 * 1024)
      return setErro("O limite por arquivo é 5 MB.");
    void acao(async () => {
      await enviarDocumento(arquivo, descricao);
      setArquivo(null);
      setUploadAberto(false);
      setDescricao("");
      if (entradaArquivo.current) entradaArquivo.current.value = "";
      setRevisao((r) => r + 1);
      setSucesso("Documento salvo e disponível para a equipe.");
    });
  }
  const mostrarUpload = uploadAberto || documentos?.length === 0;
  const total = documentos?.reduce((s, d) => s + d.tamanho, 0) ?? 0;
  return (
    <WorkspaceShell
      titulo="Documentos"
      descricao="Arquivos da empresa, organizados em um único lugar e compartilhados com sua equipe."
      acoes={business && podeGerenciar && documentos !== null && !mostrarUpload ? <button className="primary-button" onClick={() => setUploadAberto(true)}>Adicionar documento</button> : null}
    >
      {!config ? (
        <p role="status">Carregando seu plano…</p>
      ) : !business ? (
        <BloqueioPlano
          plano="Business"
          titulo="Mantenha os arquivos perto da operação"
          descricao="Compartilhe documentos com a equipe. Seus arquivos serão preservados se você mudar de plano."
        />
      ) : (
        <>
          {erro ? (
            <p className="form-error-banner" role="alert">
              {erro}
              <button
                className="text-button"
                onClick={() => setRevisao((r) => r + 1)}
              >
                Tentar novamente
              </button>
            </p>
          ) : null}
          {sucesso ? (
            <p className="form-success" role="status">
              {sucesso}
            </p>
          ) : null}
          {podeGerenciar && mostrarUpload ? (
            <section className="product-form-panel document-upload">
              <h2>Adicionar documento</h2>
              <p className="subtitle">{tamanhoArquivo(total)} de 50 MB utilizados. Até 5 MB por arquivo.</p>
              <form onSubmit={enviar}>
                <div className="form-grid">
                  <label
                    className={`field upload-zone${arrastando ? " drag-over" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!ocupado) setArrastando(true);
                    }}
                    onDragLeave={(e) => {
                      if (
                        !e.currentTarget.contains(
                          e.relatedTarget as Node | null,
                        )
                      )
                        setArrastando(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setArrastando(false);
                      if (ocupado) return;
                      const arquivoSolto = e.dataTransfer.files[0];
                      if (!arquivoSolto) return;
                      const lista = new DataTransfer();
                      lista.items.add(arquivoSolto);
                      if (entradaArquivo.current)
                        entradaArquivo.current.files = lista.files;
                      setArquivo(arquivoSolto);
                    }}
                  >
                    <span>Arquivo</span>
                    <span className="upload-prompt" aria-hidden="true">
                      <Icone nome="upload" />
                      <strong>Arraste seu arquivo para cá</strong>
                      <span>ou selecione no seu dispositivo</span>
                    </span>
                    <input
                      aria-label="Arquivo"
                      ref={entradaArquivo}
                      className="sr-only upload-native"
                      type="file"
                      autoFocus
                      accept=".pdf,.txt,.csv,.png,.jpg,.jpeg"
                      required
                      onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                      disabled={ocupado}
                    />
                    <span
                      className="secondary-button upload-select"
                      aria-hidden="true"
                    >
                      Selecionar arquivo
                    </span>
                    <small>
                      PDF, TXT, CSV, PNG ou JPEG. Até 5 MB por arquivo.
                    </small>
                  </label>
                  <label className="field upload-description">
                    <span>Descrição (opcional)</span>
                    <input
                      aria-label="Descrição (opcional)"
                      maxLength={500}
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      disabled={ocupado}
                    />
                    <small>
                      A equipe poderá consultar e baixar este arquivo.
                    </small>
                  </label>
                </div>
                {arquivo ? (
                  <p className="upload-selection" role="status">
                    <Icone nome="documento" />
                    {arquivo.name} · {tamanhoArquivo(arquivo.size)}
                  </p>
                ) : null}
                <div className="product-form-actions">
                  {documentos?.length ? <button type="button" className="secondary-button" disabled={ocupado} onClick={() => { setUploadAberto(false); setArquivo(null); if (entradaArquivo.current) entradaArquivo.current.value = ""; }}>Cancelar</button> : null}
                  <button
                    className="primary-button"
                    disabled={ocupado}
                    aria-busy={ocupado}
                  >
                    {ocupado ? "Enviando…" : "Salvar documento"}
                  </button>
                </div>
              </form>
            </section>
          ) : !podeGerenciar ? (
            <p className="permission-note">
              Seu papel permite consultar e baixar documentos. Proprietários e
              administradores gerenciam os arquivos.
            </p>
          ) : null}
          <section className="panel">
            <div className="panel-header">
              <h2>Arquivos do espaço</h2>
              <span className="tag">{tamanhoArquivo(total)} de 50 MB</span>
            </div>
            {documentos === null && !erro ? (
              <p role="status">Carregando arquivos…</p>
            ) : documentos?.length === 0 ? (
              <VazioProduto
                titulo="Nenhum documento por aqui"
                texto="Adicione os arquivos que sua equipe precisa consultar no dia a dia."
              />
            ) : (
              documentos?.map((doc) => (
                <div className="member-row document-row" key={doc.id}>
                  <div className="member-info">
                    <span className="document-icon">
                      <Icone nome="documento" />
                    </span>
                    <div>
                      <strong>{doc.nome}</strong>
                      <small style={{ display: "block", marginTop: 6 }}>
                        {doc.descricao || "Sem descrição"} ·{" "}
                        {tamanhoArquivo(doc.tamanho)} ·{" "}
                        {new Date(doc.criadoEm).toLocaleDateString("pt-BR")}
                      </small>
                    </div>
                  </div>
                  <div className="member-actions">
                    <button
                      className="secondary-button"
                      disabled={ocupado}
                      onClick={() =>
                        void acao(() => baixarDocumento(doc.id, doc.nome))
                      }
                    >
                      Baixar
                    </button>
                    {podeGerenciar && doc.tipo.startsWith("text/") ? (
                      <button
                        className="secondary-button"
                        disabled={!iaDisponivel || ocupado}
                        title={
                          !iaDisponivel
                            ? "O assistente precisa ser configurado"
                            : undefined
                        }
                        onClick={() => {
                          setAnalise(doc);
                          setAutorizado(false);
                          setResposta("");
                        }}
                      >
                        Analisar com IA
                      </button>
                    ) : null}
                    {podeGerenciar ? (
                      <button
                        className="text-button danger-text"
                        disabled={ocupado}
                        onClick={() => {
                          if (window.confirm(`Excluir ${doc.nome}?`))
                            void acao(async () => {
                              await removerDocumento(doc.id);
                              setRevisao((r) => r + 1);
                              setSucesso("Documento excluído.");
                            });
                        }}
                      >
                        Excluir
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </section>
          {analise ? (
            <section className="product-form-panel" style={{ marginTop: 20 }}>
              <h2>Leitura de {analise.nome}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void acao(async () => {
                    const resultado = await analisarDocumento(
                      analise.id,
                      pergunta,
                      autorizado,
                    );
                    setResposta(resultado.resposta);
                  });
                }}
              >
                <label className="field">
                  <span>O que você quer entender?</span>
                  <textarea
                    aria-label="O que você quer entender?"
                    required
                    maxLength={3000}
                    value={pergunta}
                    onChange={(e) => setPergunta(e.target.value)}
                  />
                </label>
                <label className="checkout-consent">
                  <input
                    type="checkbox"
                    checked={autorizado}
                    onChange={(e) => setAutorizado(e.target.checked)}
                  />
                  Tenho autorização para enviar o conteúdo deste arquivo ao
                  serviço de IA.
                </label>
                <div className="product-form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setAnalise(null)}
                  >
                    Fechar
                  </button>
                  <button
                    className="primary-button"
                    disabled={ocupado || !autorizado}
                  >
                    {ocupado ? "Analisando…" : "Analisar documento"}
                  </button>
                </div>
              </form>
              {resposta ? (
                <div
                  className="ia-response-text"
                  style={{ whiteSpace: "pre-wrap", marginTop: 20 }}
                  role="status"
                >
                  {resposta}
                </div>
              ) : null}
            </section>
          ) : null}
          {!iaDisponivel && documentos ? (
            <p className="permission-note" style={{ marginTop: 20 }}>
              A leitura com IA ficará disponível quando o assistente for
              configurado. Seus arquivos continuam acessíveis normalmente.
            </p>
          ) : null}
        </>
      )}
    </WorkspaceShell>
  );
}
