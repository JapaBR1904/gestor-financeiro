package br.com.nexo.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.regex.Pattern;

import br.com.nexo.organizacao.Organizacao;
import br.com.nexo.organizacao.OrganizacaoService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private static final Pattern EMAIL = Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration COOLDOWN_CODIGO = Duration.ofSeconds(45);
    private static final int MAX_CODIGOS_POR_HORA = 6;
    private static final String ERRO_LOGIN = "Não foi possível entrar. Confira e-mail e senha ou tente novamente mais tarde.";
    private static final String HASH_COMPARACAO = new BCryptPasswordEncoder(12).encode("comparacao-sem-conta");

    private final UsuarioRepository usuarioRepository;
    private final CodigoAutenticacaoRepository codigoRepository;
    private final SessaoUsuarioRepository sessaoRepository;
    private final OrganizacaoService organizacaoService;
    private final EmailCodigoService emailCodigoService;
    private final br.com.nexo.organizacao.MembroRepository membros;
    private final ConfiguracaoCadastro configuracaoCadastro;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    public AuthService(
            UsuarioRepository usuarioRepository,
            CodigoAutenticacaoRepository codigoRepository,
            SessaoUsuarioRepository sessaoRepository,
            OrganizacaoService organizacaoService,
            EmailCodigoService emailCodigoService,
            br.com.nexo.organizacao.MembroRepository membros,
            ConfiguracaoCadastro configuracaoCadastro
    ) {
        this.usuarioRepository = usuarioRepository;
        this.codigoRepository = codigoRepository;
        this.sessaoRepository = sessaoRepository;
        this.organizacaoService = organizacaoService;
        this.emailCodigoService = emailCodigoService;
        this.membros = membros;
        this.configuracaoCadastro = configuracaoCadastro;
    }

    @Transactional
    public ResultadoCadastro cadastrar(String nome, String emailInformado, String senha, String confirmacao) {
        String email = normalizarEmail(emailInformado);
        PoliticaSenha.validar(senha, confirmacao);
        String nomeFormatado = formatarNome(nome, "Informe seu nome para criar a conta.");
        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Não foi possível criar a conta. Confira os dados ou tente entrar ou recuperar seu acesso.");
        }
        Organizacao organizacao = organizacaoService.criar("Meu espaço");
        Usuario usuario = usuarioRepository.save(new Usuario(organizacao, nomeFormatado, email, encoder.encode(senha)));
        if (configuracaoCadastro.verificacaoEmailHabilitada()) {
            enviarCodigo(email, "verificacao_email", false);
            return new ResultadoCadastro(true, null);
        }
        // A conta fica apta por política local; não é uma comprovação de entrega de e-mail.
        usuario.verificarEmail();
        return new ResultadoCadastro(false, criarSessao(usuario));
    }

    @Transactional
    public void solicitarCodigo(String emailInformado, String finalidadeInformada) {
        String email = normalizarEmail(emailInformado);
        String finalidade = normalizarFinalidade(finalidadeInformada);
        Usuario usuario = usuarioRepository.buscarParaAutenticacao(email).orElse(null);
        if ("recuperacao_senha".equals(finalidade)) {
            // A resposta e os limites são iguais mesmo quando a conta não existe.
            enviarCodigo(email, finalidade, usuario == null || !usuario.isAtivo());
            return;
        }
        if (usuario == null || !usuario.isAtivo() || usuario.emailVerificado()) {
            throw new IllegalArgumentException("Não foi possível enviar a verificação. Confira os dados ou entre na sua conta.");
        }
        enviarCodigo(email, finalidade, false);
    }

    private void enviarCodigo(String email, String finalidade, boolean semEnvio) {
        OffsetDateTime agora = OffsetDateTime.now();
        boolean recuperacao = "recuperacao_senha".equals(finalidade);
        CodigoAutenticacao anterior = codigoRepository
                .findFirstByEmailIgnoreCaseAndFinalidadeOrderByCriadoEmDesc(email, finalidade).orElse(null);
        if (anterior != null && anterior.getCriadoEm().isAfter(agora.minus(COOLDOWN_CODIGO))) {
            if (recuperacao) return;
            long segundos = Math.max(1, COOLDOWN_CODIGO.minus(Duration.between(anterior.getCriadoEm(), agora)).toSeconds());
            throw new IllegalArgumentException("Aguarde " + segundos + " segundos antes de solicitar outro código.");
        }
        if (codigoRepository.countByEmailIgnoreCaseAndCriadoEmAfter(email, agora.minusHours(1)) >= MAX_CODIGOS_POR_HORA) {
            if (recuperacao) return;
            throw new IllegalArgumentException("Muitas solicitações de código. Tente novamente mais tarde.");
        }
        if (recuperacao) codigoRepository.invalidarRecuperacoes(email, agora);
        else if (anterior != null && !anterior.usado()) anterior.marcarUsado();
        String codigo = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        codigoRepository.save(new CodigoAutenticacao(email, encoder.encode(codigo), finalidade, agora.plusMinutes(10)));
        if (semEnvio) return;
        if (recuperacao) emailCodigoService.enviarRecuperacao(email, codigo);
        else emailCodigoService.enviarCodigo(email, codigo, finalidade);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public ResultadoAutenticacao verificarCodigo(String emailInformado, String codigo, String finalidadeInformada) {
        String email = normalizarEmail(emailInformado);
        String finalidade = normalizarFinalidade(finalidadeInformada);
        if (!"verificacao_email".equals(finalidade)) throw new IllegalArgumentException("Finalidade de verificação inválida.");
        Usuario usuario = usuarioRepository.buscarParaAutenticacao(email)
                .orElseThrow(() -> new IllegalArgumentException("Solicite uma nova verificação."));
        if (!usuario.isAtivo()) throw new IllegalArgumentException("Esta conta está inativa.");
        validarCodigo(email, codigo, finalidade);
        usuario.verificarEmail();
        return criarSessao(usuario);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public ResultadoAutenticacao login(String emailInformado, String senha) {
        String email = normalizarEmail(emailInformado);
        if (senha == null || senha.isBlank() || senha.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException(ERRO_LOGIN);
        }
        Usuario usuario = usuarioRepository.buscarParaAutenticacao(email).orElse(null);
        if (usuario == null) {
            encoder.matches(senha, HASH_COMPARACAO);
            throw new IllegalArgumentException(ERRO_LOGIN);
        }
        boolean bloqueado = usuario.loginBloqueado(OffsetDateTime.now());
        boolean correta = encoder.matches(senha, usuario.getSenhaHash() == null ? HASH_COMPARACAO : usuario.getSenhaHash());
        if (bloqueado || !correta || usuario.getSenhaHash() == null || !usuario.isAtivo()) {
            if (!bloqueado) usuario.registrarFalhaLogin();
            throw new IllegalArgumentException(ERRO_LOGIN);
        }
        if (!usuario.emailVerificado()) throw new IllegalArgumentException("Confirme seu e-mail antes de entrar.");
        usuario.limparTentativasLogin();
        return criarSessao(usuario);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public String verificarRecuperacao(String emailInformado, String codigo) {
        String email = normalizarEmail(emailInformado);
        Usuario usuario = usuarioRepository.buscarParaAutenticacao(email).orElse(null);
        CodigoAutenticacao registro = validarCodigo(email, codigo, "recuperacao_senha");
        if (usuario == null || !usuario.isAtivo()) throw new IllegalArgumentException("Código inválido.");
        String prova = gerarTokenSeguro();
        registro.emitirProva(sha256(prova));
        return prova;
    }

    @Transactional
    public void redefinirSenha(String prova, String senha, String confirmacao) {
        PoliticaSenha.validar(senha, confirmacao);
        if (prova == null || !prova.matches("[A-Za-z0-9_-]{43}")) {
            throw new IllegalArgumentException("Recuperação inválida ou expirada. Solicite um novo código.");
        }
        String hash = sha256(prova);
        String email = codigoRepository.buscarEmailDaProva(hash)
                .orElseThrow(() -> new IllegalArgumentException("Recuperação inválida ou expirada. Solicite um novo código."));
        // Manter a mesma ordem de bloqueios dos demais fluxos: usuário, depois código.
        Usuario usuario = usuarioRepository.buscarParaAutenticacao(email)
                .orElseThrow(() -> new IllegalArgumentException("Recuperação inválida ou expirada."));
        CodigoAutenticacao registro = codigoRepository.findLockedByProvaHash(hash)
                .orElseThrow(() -> new IllegalArgumentException("Recuperação inválida ou expirada."));
        if (!registro.provaValida() || !usuario.isAtivo()) {
            throw new IllegalArgumentException("Recuperação inválida ou expirada. Solicite um novo código.");
        }
        registro.consumirProva();
        usuario.definirSenha(encoder.encode(senha));
        usuario.verificarEmail();
        codigoRepository.saveAndFlush(registro);
        codigoRepository.invalidarRecuperacoes(usuario.getEmail(), OffsetDateTime.now());
        sessaoRepository.revogarDoUsuario(usuario.getId(), OffsetDateTime.now());
    }

    private CodigoAutenticacao validarCodigo(String email, String codigoInformado, String finalidade) {
        String codigo = codigoInformado == null ? "" : codigoInformado.trim();
        if (!codigo.matches("\\d{6}")) throw new IllegalArgumentException("Informe o código de 6 dígitos.");
        CodigoAutenticacao registro = codigoRepository
                .findFirstByEmailIgnoreCaseAndFinalidadeOrderByCriadoEmDesc(email, finalidade)
                .orElseThrow(() -> new IllegalArgumentException("Código inválido. Solicite um novo código."));
        if (registro.usado()) throw new IllegalArgumentException("Este código já foi utilizado. Solicite um novo.");
        if (registro.expirou()) throw new IllegalArgumentException("Este código expirou. Solicite um novo.");
        if (registro.excedeuTentativas()) throw new IllegalArgumentException("Limite de tentativas atingido. Solicite um novo código.");
        registro.registrarTentativa();
        if (!encoder.matches(codigo, registro.getCodigoHash())) {
            throw new IllegalArgumentException("Código inválido.");
        }
        registro.marcarUsado();
        return registro;
    }

    private ResultadoAutenticacao criarSessao(Usuario usuario) {
        usuarioRepository.flush();
        membros.garantirOriginal(usuario.getId());
        var vinculo = membros.vinculo(usuario.getId(), usuario.getOrganizacao().getId());
        if (vinculo == null) {
            var disponiveis = membros.organizacoes(usuario.getId());
            if (disponiveis.isEmpty()) throw new IllegalArgumentException(ERRO_LOGIN);
            vinculo = disponiveis.getFirst();
        }
        String token = gerarTokenSeguro();
        var sessao = new SessaoUsuario(usuario, sha256(token), OffsetDateTime.now().plusDays(30));
        sessao.selecionarOrganizacao(vinculo.id());
        sessaoRepository.save(sessao);
        return new ResultadoAutenticacao(token, montarUsuario(usuario, vinculo));
    }

    @Transactional
    public UsuarioAutenticado autenticarSessao(String token) {
        if (token == null || token.isBlank()) throw new IllegalArgumentException("Sessão não encontrada.");
        SessaoUsuario sessao = sessaoRepository.findByTokenHash(sha256(token))
                .orElseThrow(() -> new IllegalArgumentException("Sessão inválida."));
        if (!sessao.valida()) throw new IllegalArgumentException("Sessão expirada. Entre novamente.");
        if (!sessao.getUsuario().isAtivo() || !sessao.getUsuario().emailVerificado()) {
            throw new IllegalArgumentException("Sessão inválida. Entre novamente.");
        }
        // Atualizar só o acesso, sem sobrescrever uma revogação concorrente.
        if (sessaoRepository.registrarAcesso(sha256(token), OffsetDateTime.now()) == 0) {
            throw new IllegalArgumentException("Sessão expirada. Entre novamente.");
        }
        membros.garantirOriginal(sessao.getUsuario().getId());
        var vinculo = membros.vinculo(sessao.getUsuario().getId(), sessao.getOrganizacaoId());
        if (vinculo == null) throw new IllegalArgumentException("Este acesso à organização foi encerrado.");
        return montarUsuario(sessao.getUsuario(), vinculo);
    }

    @Transactional
    public UsuarioAutenticado selecionarOrganizacao(String token, Long organizacaoId) {
        var usuario = autenticarSessao(token);
        if (membros.vinculo(usuario.id(), organizacaoId) == null)
            throw new br.com.nexo.config.AcessoNegadoException("Você não tem acesso a esta organização.");
        var sessao = sessaoRepository.findByTokenHash(sha256(token)).orElseThrow(() -> new IllegalArgumentException("Sessão inválida."));
        sessao.selecionarOrganizacao(organizacaoId);
        return autenticarSessao(token);
    }

    @Transactional
    public void encerrarSessao(String token) {
        if (token == null || token.isBlank()) return;
        sessaoRepository.findByTokenHash(sha256(token)).ifPresent(sessao -> {
            sessao.revogar();
            sessaoRepository.save(sessao);
        });
    }

    private UsuarioAutenticado montarUsuario(Usuario usuario, br.com.nexo.organizacao.MembroRepository.Vinculo vinculo) {
        return new UsuarioAutenticado(usuario.getId(), usuario.getNome(), usuario.getEmail(), vinculo.papel(), vinculo.id(), vinculo.nome());
    }

    private String normalizarEmail(String valor) {
        String email = valor == null ? "" : valor.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 180 || !EMAIL.matcher(email).matches()) throw new IllegalArgumentException("Informe um e-mail válido.");
        return email;
    }

    private String normalizarFinalidade(String valor) {
        String finalidade = valor == null ? "" : valor.trim().toLowerCase(Locale.ROOT);
        if (finalidade.equals("cadastro")) finalidade = "verificacao_email";
        if (!finalidade.equals("verificacao_email") && !finalidade.equals("recuperacao_senha")) throw new IllegalArgumentException("Finalidade de autenticação inválida.");
        return finalidade;
    }

    private String formatarNome(String valor, String mensagem) {
        String texto = valor == null ? "" : valor.trim().replaceAll("\\s+", " ");
        if (texto.isBlank()) throw new IllegalArgumentException(mensagem);
        if (texto.length() > 160) throw new IllegalArgumentException("O nome é muito longo.");
        String[] palavras = texto.toLowerCase(Locale.forLanguageTag("pt-BR")).split(" ");
        StringBuilder resultado = new StringBuilder();
        for (String palavra : palavras) {
            if (palavra.isBlank()) continue;
            if (!resultado.isEmpty()) resultado.append(' ');
            resultado.append(Character.toUpperCase(palavra.charAt(0))).append(palavra.substring(1));
        }
        return resultado.toString();
    }

    static String gerarTokenSeguro() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String sha256(String valor) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível.", e);
        }
    }

    public record ResultadoCadastro(boolean verificacaoEmailNecessaria, ResultadoAutenticacao autenticacao) {}
    public record ResultadoAutenticacao(String token, UsuarioAutenticado usuario) {}
    public record UsuarioAutenticado(Long id, String nome, String email, String papel, Long organizacaoId, String organizacaoNome) {}
}
