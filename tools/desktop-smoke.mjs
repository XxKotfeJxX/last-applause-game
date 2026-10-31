import { _electron as electron } from 'playwright';
import { resolve } from 'node:path';
const dev=process.argv.includes('--dev'),portable=process.argv.includes('--portable');
const exe=dev?resolve('node_modules','electron','dist','electron.exe'):portable?resolve('release','Останні оплески 1.0.0.exe'):resolve('release','win-unpacked','Останні оплески.exe');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath:exe,args:dev?['.']:[],env,timeout:45000});
try{
  const window=await app.firstWindow();const errors=[];
  window.on('pageerror',e=>errors.push(e.message));
  await window.getByRole('heading',{name:'Карта останнього номера'}).waitFor({timeout:20000});
  await window.getByRole('button',{name:'Почати виставу'}).click();
  await window.locator('#viewport canvas').waitFor();
  await window.keyboard.press('Escape');await window.getByRole('button',{name:'Зберегти гру'}).click();
  const saved=await window.evaluate(()=>localStorage.getItem('last-applause:v1:manual'));
  if(!saved||errors.length)throw new Error(`Desktop smoke failed: saved=${!!saved}; errors=${errors.join('; ')}`);
  console.log(`Electron smoke OK: ${window.url()}; save ${saved.length} bytes; canvas loaded.`);
}finally{await app.close();}
