import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const port=9229,env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(resolve('release','Останні оплески 1.0.0.exe'),[`--remote-debugging-port=${port}`],{env,windowsHide:true,stdio:'ignore'});
try{
  let ready=false;
  for(let i=0;i<90;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`);if(r.ok){ready=true;break;}}catch{}await delay(500);}
  if(!ready)throw new Error('Portable app did not open its local inspection port.');
  const {stdout}=await promisify(execFile)(process.execPath,['tools/portable-inspect.mjs',String(port)],{env});process.stdout.write(stdout);
  console.log('Windows portable package passed local scene and save smoke test.');
}finally{
  if(child.pid)await promisify(execFile)('taskkill',['/PID',String(child.pid),'/T','/F']).catch(()=>{});
}
