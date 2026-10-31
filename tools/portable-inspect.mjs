import { chromium } from 'playwright';
const port=Number(process.argv[2]??9229);
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try{
  const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('app://game/'));
  if(!page)throw new Error(`No app://game page: ${browser.contexts()[0].pages().map(p=>p.url()).join(', ')}`);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.getByRole('heading',{name:'Карта останнього номера'}).waitFor({timeout:20000});
  await page.getByRole('button',{name:'Почати виставу'}).click();
  await page.locator('#viewport canvas').waitFor();
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Зберегти гру'}).click();
  const value=await page.evaluate(()=>localStorage.getItem('last-applause:v1:manual'));
  if(!value||errors.length)throw new Error(`Portable smoke failed: save=${!!value}, errors=${errors.join('; ')}`);
  console.log(`Portable smoke OK: ${page.url()}, WebGL canvas visible, local save ${value.length} bytes, no page errors.`);
}finally{await browser.close();}
