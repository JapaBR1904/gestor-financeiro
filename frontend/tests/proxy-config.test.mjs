import test from "node:test";
import assert from "node:assert/strict";
let caso=0;
async function configurar(valor) {
  const anterior=process.env.NEXO_BACKEND_URL;
  try {
    if(valor===undefined) delete process.env.NEXO_BACKEND_URL; else process.env.NEXO_BACKEND_URL=valor;
    return (await import(`../next.config.mjs?caso=${++caso}`)).default;
  } finally {
    if(anterior===undefined) delete process.env.NEXO_BACKEND_URL; else process.env.NEXO_BACKEND_URL=anterior;
  }
}
test("proxy aceita HTTPS e loopback de teste sem publicar o endereço no cliente",async()=>{
  const config=await configurar("https://api.example.com");
  assert.deepEqual(await config.rewrites(),[{source:"/api/:path*",destination:"https://api.example.com/api/:path*"}]);
  assert.equal((await (await configurar("http://127.0.0.1:18153")).rewrites()).length,1);
  assert.deepEqual(await (await configurar(undefined)).rewrites(),[]);
});
test("proxy rejeita credenciais, caminho, query, fragmento e HTTP externo",async()=>{
  for(const origem of ["https://usuario:senha@example.com","https://api.example.com/caminho","https://api.example.com?chave=teste","https://api.example.com#fragmento","http://api.example.com","ftp://api.example.com"])
    await assert.rejects(()=>configurar(origem));
});
