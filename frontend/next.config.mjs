const backend = process.env.NEXO_BACKEND_URL;
let destino;
if (backend) {
  const url = new URL(backend);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      !(url.protocol === "https:" || (url.protocol === "http:" && loopback))) {
    throw new Error("NEXO_BACKEND_URL deve ser uma origem HTTPS sem credenciais ou caminho; HTTP apenas em loopback.");
  }
  destino = url.origin;
}
const nextConfig = {
  async rewrites() {
    return destino ? [{ source: "/api/:path*", destination: `${destino}/api/:path*` }] : [];
  },
};

export default nextConfig;
