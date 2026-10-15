import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Nexo — Gestão financeira", short_name: "Nexo", lang: "pt-BR", start_url: "/", display: "standalone", background_color: "#071426", theme_color: "#071426", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] };
}
