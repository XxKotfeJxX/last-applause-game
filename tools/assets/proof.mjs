import { readFile, writeFile, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const file=resolve('public/assets/characters/stagehand/walk.png');
try{await readFile(file);throw new Error(`${file} already exists; proof refuses to overwrite it.`);}catch(e){if(e.code!=='ENOENT')throw e;}
function crc(buffer){let c=0xffffffff;for(const b of buffer){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^(c&1?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([len,name,data,sum]);}
function png(){const w=768,h=768,header=Buffer.alloc(13);header.writeUInt32BE(w,0);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;
  const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const at=y*(w*4+1)+1+x*4;raw[at]=180+(x%128)/8;raw[at+1]=70+(y%192)/4;raw[at+2]=100;raw[at+3]=x%128>4&&y%192>4?255:0;}
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
const sync=()=>execFileSync(process.execPath,['tools/content/sync.mjs'],{stdio:'pipe'});
let server,browser;
try{
  await writeFile(file,png());sync();execFileSync(process.execPath,['tools/assets/validate.mjs'],{stdio:'pipe'});
  server=await createServer({server:{host:'127.0.0.1',port:5177,strictPort:true}});await server.listen();
  const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';browser=await chromium.launch({headless:true,executablePath:chrome,args:['--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage();const requests=[];page.on('response',r=>{if(r.url().endsWith('.png'))requests.push([r.url(),r.status()]);});
  await page.goto('http://127.0.0.1:5177/');await page.getByRole('button',{name:'Почати виставу'}).click();await page.waitForTimeout(1500);
  if(!requests.some(([url,status])=>url.endsWith('/assets/characters/stagehand/walk.png')&&status===200))throw new Error(`Stagehand walk PNG not loaded: ${JSON.stringify(requests)}`);
  if(requests.some(([url])=>url.includes('/assets/characters/')&&!url.includes('/stagehand/')))throw new Error(`Other NPC unexpectedly loaded PNG: ${JSON.stringify(requests)}`);
  console.log('T20 proof OK: generated walk.png loaded for stagehand only; remaining NPC used fallback.');
}finally{await browser?.close();await server?.close();await unlink(file).catch(()=>{});sync();}
