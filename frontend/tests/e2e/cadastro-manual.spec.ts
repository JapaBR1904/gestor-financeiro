import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("cadastro manual: aguarda administrador sem email e permite aprovação explícita", async ({ page,context },info) => {
  let cadastrado=false,aprovado=false,admin=false,envios=0;
  await context.route("**/api/**",route=>{
    const path=new URL(route.request().url()).pathname;
    const ok=(json:unknown,status=200)=>route.fulfill({status,json});
    if(path==="/api/auth/disponibilidade") return ok({recuperacaoPorEmailDisponivel:false,cadastroManualDisponivel:true});
    if(path==="/api/auth/cadastro") { cadastrado=true;return ok({verificacaoEmailNecessaria:false,aprovacaoManualNecessaria:true},202); }
    if(path==="/api/admin/cadastros/disponibilidade") return ok({disponivel:true});
    if(path==="/api/admin/cadastros/login") { admin=true;return ok({mensagem:"Administração aberta."}); }
    if(path==="/api/admin/cadastros/logout") { admin=false;return ok({mensagem:"Encerrada."}); }
    if(path==="/api/admin/cadastros") return ok(admin ? cadastrado && !aprovado ? [{usuarioId:7,nome:"Pessoa Sintética",email:"pessoa@example.com",criadoEm:new Date().toISOString()}] : [] : {mensagem:"Entre novamente."},admin ? 200 : 403);
    if(path==="/api/admin/cadastros/7") { expect(admin).toBe(true);expect(route.request().postDataJSON()).toEqual({aprovar:true,identidadeConfirmada:true});aprovado=true;return ok({mensagem:"Cadastro aprovado. A pessoa já pode entrar."}); }
    if(path==="/api/auth/codigo") envios++;
    return route.abort();
  });
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome",{exact:true}).fill("Pessoa Sintética");
  await page.getByLabel("E-mail",{exact:true}).fill("pessoa@example.com");
  await page.getByLabel("Nova senha",{exact:true}).fill("Senha-Sintetica-123!");
  await page.getByLabel("Confirme a senha",{exact:true}).fill("Senha-Sintetica-123!");
  await page.getByRole("button",{name:"Criar conta",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Cadastro recebido",exact:true})).toBeVisible();
  await expect(page.getByLabel("Código de 6 dígitos")).toHaveCount(0);
  await page.setViewportSize({width:390,height:1000});
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath("cadastro-pendente-390.png"),fullPage:true});
  const painel=await context.newPage(); await painel.goto("/admin/cadastros");
  await painel.getByLabel("Usuário administrativo").fill("operador");
  await painel.getByLabel("Senha administrativa").fill("Senha-Sintetica-Administrativa-123!");
  await painel.getByRole("button",{name:"Entrar na administração",exact:true}).click();
  const pedido=painel.getByRole("article",{name:"Cadastro de Pessoa Sintética",exact:true});
  await expect(pedido.getByRole("button",{name:"Aprovar cadastro",exact:true})).toBeDisabled();
  await painel.setViewportSize({width:390,height:1000});
  expect((await new AxeBuilder({page:painel}).analyze()).violations).toEqual([]);
  expect(await painel.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await painel.screenshot({path:info.outputPath("cadastros-admin-390.png"),fullPage:true});
  await pedido.getByRole("checkbox").check();
  await pedido.getByRole("button",{name:"Aprovar cadastro",exact:true}).click();
  await expect(painel.getByRole("status").first()).toContainText("Cadastro aprovado");
  expect(envios).toBe(0);
});
