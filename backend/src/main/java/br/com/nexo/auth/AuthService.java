package br.com.nexo.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
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

    private final UsuarioRepository usuarioRepository;
    private final CodigoAutenticacaoRepository codigoRepository;
    private final SessaoUsuarioRepository sessaoRepository;
    private final OrganizacaoService organizacaoService;
    private final EmailCodigoService emailCodigoService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(
            UsuarioRepository usuarioRepository,
            CodigoAutenticacaoRepository codigoRepository,
            SessaoUsuarioRepository sessaoRepository,
            OrganizacaoService organizacaoService,
            EmailCodigoService emailCodigoService
    ) {
        this.usuarioRepository = usuarioRepository;
        this.codigoRepository = codigoRepository;
        this.sessaoRepository = sessaoRepository;
        this.organizacaoService = organizacaoService;
        this.emailCodigoService = emailCodigoService;
    }

    @Transactional
    public void solicitarCodigo(String emailInformado, String finalidadeInformada) {
        String email = normalizarEmail(emailInformado);
        String finalidade = normalizarFinalidade(finalidadeInformada);

        boolean existe = usuarioRepository.existsByEmailIgnoreCase(email);
        if ("cadastro".equals(finalidade) && existe) {
            throw new IllegalArgumentException("Já existe uma conta com este e-mail. Use a opção Entrar.");
        }
        if ("login".equals(finalidade) && !existe) {
            throw new IllegalArgumentException("Não encontramos uma conta com este e-mail. Use a opção Criar conta.");
        }

        String codigo = String.format("%06d", RANDOM.nextInt(1_000_000));
        CodigoAutenticacao registro = new CodigoAutenticacao(
                email,
                encoder.encode(codigo),
                finalidade,
                OffsetDateTime.now().plusMinutes(10)
        );
        codigoRepository.save(registro);
        emailCodigoService.enviarCodigo(email, codigo);
    }

    @Transactional
    public ResultadoAutenticacao verificarCodigo(String emailInformado, String codigoInformado, String finalidadeInformada, String nome, String organizacaoNome) {
        String email = normalizarEmail(emailInformado);
        String finalidade = normalizarFinalidade(finalidadeInformada);
        String codigo = codigoInformado == null ? "" : codigoInformado.trim();
        if (!codigo.matches("\\d{6}")) throw new IllegalArgumentException("Informe o código de 6 dígitos.");

        CodigoAutenticacao registro = codigoRepository
                .findFirstByEmailIgnoreCaseAndFinalidadeOrderByCriadoEmDesc(email, finalidade)
                .orElseThrow(() -> new IllegalArgumentException("Solicite um novo código de acesso."));

        if (registro.usado()) throw new IllegalArgumentException("Este código já foi utilizado. Solicite um novo.");
        if (registro.expirou()) throw new IllegalArgumentException("Este código expirou. Solicite um novo.");
        if (registro.excedeuTentativas()) throw new IllegalArgumentException("Limite de tentativas atingido. Solicite um novo código.");

        registro.registrarTentativa();
        if (!encoder.matches(codigo, registro.getCodigoHash())) {
            codigoRepository.save(registro);
            throw new IllegalArgumentException("Código inválido.");
        }
        registro.marcarUsado();
        codigoRepository.save(registro);

        Usuario usuario;
        if ("cadastro".equals(finalidade)) {
            if (usuarioRepository.existsByEmailIgnoreCase(email)) {
                throw new IllegalArgumentException("Já existe uma conta com este e-mail.");
            }
            String nomeFormatado = formatarNome(nome, "Informe seu nome para criar a conta.");
            String empresaFormatada = formatarNome(organizacaoNome, "Informe o nome do negócio para criar a conta.");
            Organizacao organizacao = organizacaoService.criar(empresaFormatada);
            usuario = usuarioRepository.save(new Usuario(organizacao, nomeFormatado, email));
        } else {
            usuario = usuarioRepository.findByEmailIgnoreCase(email)
                    .orElseThrow(() -> new IllegalArgumentException("Conta não encontrada."));
            if (!usuario.isAtivo()) throw new IllegalArgumentException("Esta conta está inativa.");
        }

        String token = gerarTokenSeguro();
        sessaoRepository.save(new SessaoUsuario(usuario, sha256(token), OffsetDateTime.now().plusDays(30)));
        return new ResultadoAutenticacao(token, montarUsuario(usuario));
    }

    @Transactional
    public UsuarioAutenticado autenticarSessao(String token) {
        if (token == null || token.isBlank()) throw new IllegalArgumentException("Sessão não encontrada.");
        SessaoUsuario sessao = sessaoRepository.findByTokenHash(sha256(token))
                .orElseThrow(() -> new IllegalArgumentException("Sessão inválida."));
        if (!sessao.valida()) throw new IllegalArgumentException("Sessão expirada. Entre novamente.");
        sessao.tocar();
        sessaoRepository.save(sessao);
        return montarUsuario(sessao.getUsuario());
    }

    @Transactional
    public void encerrarSessao(String token) {
        if (token == null || token.isBlank()) return;
        sessaoRepository.findByTokenHash(sha256(token)).ifPresent(sessao -> {
            sessao.revogar();
            sessaoRepository.save(sessao);
        });
    }

    private UsuarioAutenticado montarUsuario(Usuario usuario) {
        return new UsuarioAutenticado(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getPapel(), usuario.getOrganizacao().getId(), usuario.getOrganizacao().getNome());
    }

    private String normalizarEmail(String valor) {
        String email = valor == null ? "" : valor.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 180 || !EMAIL.matcher(email).matches()) throw new IllegalArgumentException("Informe um e-mail válido.");
        return email;
    }

    private String normalizarFinalidade(String valor) {
        String finalidade = valor == null ? "" : valor.trim().toLowerCase(Locale.ROOT);
        if (!finalidade.equals("cadastro") && !finalidade.equals("login")) throw new IllegalArgumentException("Finalidade de autenticação inválida.");
        return finalidade;
    }

    private String formatarNome(String valor, String mensagem) {
        String texto = valor == null ? "" : valor.trim().replaceAll("\\s+", " ");
        if (texto.isBlank()) throw new IllegalArgumentException(mensagem);
        String[] palavras = texto.toLowerCase(Locale.forLanguageTag("pt-BR")).split(" ");
        StringBuilder resultado = new StringBuilder();
        for (String palavra : palavras) {
            if (palavra.isBlank()) continue;
            if (!resultado.isEmpty()) resultado.append(' ');
            resultado.append(Character.toUpperCase(palavra.charAt(0))).append(palavra.substring(1));
        }
        return resultado.toString();
    }

    private String gerarTokenSeguro() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String valor) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível.", e);
        }
    }

    public record ResultadoAutenticacao(String token, UsuarioAutenticado usuario) {}
    public record UsuarioAutenticado(Long id, String nome, String email, String papel, Long organizacaoId, String organizacaoNome) {}
}
