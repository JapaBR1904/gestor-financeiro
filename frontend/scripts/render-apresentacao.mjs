// Apresentação original, renderizada localmente com dados fictícios.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function main() {
  const output = path.join(__dirname, '../public/media');
  await fs.mkdir(output, { recursive: true });
  console.log('Iniciando renderização local.');
  const browser = await chromium.launch({ channel: 'msedge', headless: true, timeout: 20000 });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.setContent('<!doctype html><html lang="pt-BR"><title>Nexo</title><body><canvas width="1280" height="720"></canvas></body></html>');
    console.log('Renderizador pronto; gravando 35 segundos.');
    const encoded = await Promise.race([page.evaluate(async () => {
      const canvas = document.querySelector('canvas'), c = canvas.getContext('2d');
      const scenes = [
        ['SEU ESPAÇO', 'Sua vida. Seu negócio. Sua equipe.', 'Escolha seu perfil e mantenha cada espaço organizado.', ['Pessoal', 'Negócio', 'Empresa']],
        ['01 / ORGANIZE', 'Seu dia a dia, conectado.', 'Registre movimentações. Cadastre produtos e clientes.', ['Movimentações', 'Produtos', 'Clientes']],
        ['02 / ACOMPANHE', 'Vendas e despesas com contexto.', 'Consulte registros e custos. Venda registrada não comprova recebimento.', ['Vendas', 'Despesas', 'Histórico comercial']],
        ['03 / ENTENDA', 'Os números fazem sentido.', 'Escolha o período. Resultado do período não é saldo disponível.', ['Entradas · R$ 12.500', 'Saídas · R$ 4.080', 'Resultado · R$ 8.420']],
        ['04 / PLANEJE', 'Dê direção ao próximo passo.', 'Nos planos Pro e Business: metas, fluxo, comparativos e CSV.', ['Metas', 'Fluxo de caixa', 'Comparativos']],
        ['05 / COLABORE', 'Seu espaço, em sintonia.', 'Business: equipe e documentos. IA depende do serviço configurado.', ['Equipe e documentos', 'Acessos por papel', 'IA com contexto autorizado']],
        ['CLAREZA PARA IR ALÉM', 'Comece pelo que importa hoje.', 'Crie sua conta no Free. Explore o Nexo no seu ritmo.', ['Free · R$ 0/mês', 'Pro · R$ 39/mês', 'Business · R$ 99/mês']],
      ];
      const text=(s,x,y,size=24,color='#f3f7ff',weight=500)=>{c.fillStyle=color;c.font=`${weight} ${size}px "Segoe UI", sans-serif`;c.fillText(s,x,y);};
      const box=(x,y,w,h,color,r=18)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
      function draw(t){
        const i=Math.min(6,Math.floor(t/5)), scene=scenes[i], ease=1-Math.pow(1-Math.min(1,(t-i*5)/.7),3);
        const bg=c.createLinearGradient(0,0,1280,720);bg.addColorStop(0,'#070f24');bg.addColorStop(.65,'#102951');bg.addColorStop(1,'#073b4a');c.fillStyle=bg;c.fillRect(0,0,1280,720);
        c.strokeStyle='#63dcec13';c.lineWidth=1;
        for(let x=0;x<1280;x+=48){c.beginPath();c.moveTo(x,0);c.lineTo(x,720);c.stroke();}
        for(let y=0;y<720;y+=48){c.beginPath();c.moveTo(0,y);c.lineTo(1280,y);c.stroke();}
        text('NEXO',64,66,28,'#f3f7ff',750);text('Clareza para ir além.',175,64,16,'#afc3de');
        box(1050,35,166,34,'#163b56');text('DEMONSTRAÇÃO',1065,57,12,'#7ae6ee',700);
        c.save();c.translate(0,(1-ease)*20);c.globalAlpha=ease;
        text(scene[0],64,174,15,'#76e6ee',700);text(scene[1],64,250,52,'#f3f7ff',700);
        scene[3].forEach((label,n)=>{const x=64+n*386;box(x,320,364,174,'#152f50');text('0'+(n+1),x+22,359,14,'#83e7ee',700);text(label,x+22,408,label.length>22?21:24,'#eff7ff',650);box(x+22,450,300,5,'#284a6c',3);box(x+22,450,300*(.35+.2*n)*ease,5,'#55d6e5',3);});
        text(scene[2],64,583,21,'#d5e1f1');c.restore();
        text('Apresentação ilustrativa · dados fictícios · recursos conforme o plano',64,672,14,'#adc2dc');
        for(let n=0;n<7;n++)box(1010+n*30,658,22,4,n===i?'#75e7ef':'#304863',2);
        c.fillStyle='#64e1ec';c.fillRect(0,714,1280*t/35,6);
      }
      draw(.8);const poster=canvas.toDataURL('image/png').split(',')[1];
      const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
      if(!mime)throw new Error('Codificador local WebM indisponível.');
      const stream=canvas.captureStream(24), recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1400000}), chunks=[];
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start();
      const start=performance.now();await new Promise(resolve=>{function frame(){const t=(performance.now()-start)/1000;draw(Math.min(t,34.99));if(t<35)setTimeout(frame,1000/24);else resolve();}frame();});
      recorder.stop();await stopped;stream.getTracks().forEach(x=>x.stop());
      const bytes=new Uint8Array(await new Blob(chunks,{type:mime}).arrayBuffer());let binary='';for(let n=0;n<bytes.length;n+=32768)binary+=String.fromCharCode(...bytes.subarray(n,n+32768));
      return {video:btoa(binary),poster,mime,bytes:bytes.length};
    }),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo de renderização excedido.')),55000))]);
    await fs.writeFile(path.join(output,'nexo-em-35-segundos.webm'),Buffer.from(encoded.video,'base64'));
    await fs.writeFile(path.join(output,'nexo-apresentacao.png'),Buffer.from(encoded.poster,'base64'));
    console.log(JSON.stringify({duration:35,mime:encoded.mime,bytes:encoded.bytes,output}));
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
