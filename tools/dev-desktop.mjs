import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const cwd=process.cwd(),npm=process.platform==='win32'?'npm.cmd':'npm';
const vite=spawn(npm,['run','dev:web','--','--host','127.0.0.1','--port','5173'],{cwd,stdio:'inherit',shell:process.platform==='win32'});
let electron;
try{
  for(let i=0;i<60;i++){try{const r=await fetch('http://127.0.0.1:5173/');if(r.ok)break;}catch{}await delay(250);}
  const env={...process.env,VITE_DEV_SERVER_URL:'http://127.0.0.1:5173/'};delete env.ELECTRON_RUN_AS_NODE;
  electron=spawn(process.platform==='win32'?'node_modules\\.bin\\electron.cmd':'node_modules/.bin/electron',[],{cwd,stdio:'inherit',shell:process.platform==='win32',env});
  await new Promise(resolve=>electron.on('exit',resolve));
}finally{vite.kill();electron?.kill();}
