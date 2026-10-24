import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";
let servidor: Server;
const recebidos: { caminho: string; origem?: string; cookie: string }[] = [];
test.beforeAll(async () => {
  servidor = createServer((req,res) => {
    req.on("data", () => {});
    req.on("end", () => {
      const caminho=req.url ?? "";
      const cookie=req.headers.cookie ?? "";
      recebidos.push({caminho,origem:req.headers.origin,cookie});
      res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");
      if(caminho==="/api/auth/disponibilidade") return res.end(JSON.stringify({recuperacaoPorEmailDisponivel:false,cadastroManualDisponivel:true}));
      if(caminho==="/api/auth/login") res.setHeader("Set-Cookie","nexo_session=transporte_sintetico; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000");
      if(caminho==="/api/admin/cadastros/login") res.setHeader("Set-Cookie","nexo_admin_cadastros=admin_sintetico; Path=/api/admin/cadastros; HttpOnly; SameSite=Strict; Max-Age=900");
      if(caminho==="/api/auth/logout") res.setHeader("Set-Cookie","nexo_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
      if(caminho==="/api/admin/cadastros/logout") res.setHeader("Set-Cookie","nexo_admin_cadastros=; Path=/api/admin/cadastros; HttpOnly; SameSite=Strict; Max-Age=0");
      res.end(JSON.stringify({autenticado:cookie.includes("nexo_session=transporte_sintetico"),administrador:cookie.includes("nexo_admin_cadastros=admin_sintetico")}));
    });
  });
  await new Promise<void>((resolve,reject)=>{servidor.once("error",reject);servidor.listen(18153,"127.0.0.1",resolve);});
});
test.afterAll(async()=>{await new Promise<void>(resolve=>servidor.close(()=>resolve()));});

test("proxy: preserva cookies HttpOnly, persistência, origem e logout sem expor API no navegador",async({page,context})=>{
  const chamadas:string[]=[];
  page.on("request",r=>{if(new URL(r.url()).pathname.startsWith("/api/")) chamadas.push(r.url());});
  await page.goto("/login");
  const origem=new URL(page.url()).origin;
  async function chamar(caminho:string,post=false) {
    return page.evaluate(async({caminho,post})=>{
      const r=await fetch(caminho,{method:post ? "POST" : "GET",credentials:"include",headers:post?{"Content-Type":"application/json"}:undefined,body:post?"{}":undefined});
      if(!r.ok)throw new Error(`Resposta inesperada ${r.status}`);return r.json();
    },{caminho,post});
  }
  await chamar("/api/auth/login",true);
  const sessao=(await context.cookies()).find(c=>c.name==="nexo_session");
  expect(sessao?.httpOnly).toBe(true);expect(sessao?.expires).toBeGreaterThan(Date.now()/1000+20*86400);
  expect(await page.evaluate(()=>document.cookie.includes("transporte_sintetico"))).toBe(false);
  expect((await chamar("/api/auth/me")).autenticado).toBe(true);
  await page.reload();expect((await chamar("/api/auth/me")).autenticado).toBe(true);
  await chamar("/api/admin/cadastros/login",true);
  const admin=(await context.cookies()).find(c=>c.name==="nexo_admin_cadastros");
  expect(admin?.httpOnly).toBe(true);expect(admin?.sameSite).toBe("Strict");expect(admin?.path).toBe("/api/admin/cadastros");
  expect((await chamar("/api/admin/cadastros")).administrador).toBe(true);
  expect(recebidos.find(r=>r.caminho==="/api/auth/login")?.origem).toBe(origem);
  expect(recebidos.find(r=>r.caminho==="/api/admin/cadastros/login")?.origem).toBe(origem);
  expect(chamadas.length).toBeGreaterThan(4);expect(chamadas.every(url=>new URL(url).origin===origem)).toBe(true);
  await chamar("/api/auth/logout",true);expect((await chamar("/api/auth/me")).autenticado).toBe(false);
  await chamar("/api/admin/cadastros/logout",true);expect((await chamar("/api/admin/cadastros")).administrador).toBe(false);
});
