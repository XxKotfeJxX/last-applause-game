import { app, BrowserWindow, protocol } from 'electron';
import { readFile } from 'node:fs/promises';
import { join, resolve, sep, extname } from 'node:path';

protocol.registerSchemesAsPrivileged([{scheme:'app',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav'};
function webRoot(){return resolve(join(app.getAppPath(),'dist-web'));}
async function handleApp(request:Request):Promise<Response>{
  let url:URL;try{url=new URL(request.url);}catch{return new Response('Bad URL',{status:400});}
  if(url.host!=='game')return new Response('Forbidden host',{status:403});
  let path:string;try{path=decodeURIComponent(url.pathname);}catch{return new Response('Bad path',{status:400});}
  if(path.includes('\0')||path.includes('\\'))return new Response('Bad path',{status:400});
  const root=webRoot(),file=resolve(join(root,path.replace(/^\/+/,'' )||'index.html'));
  if(file!==root&&!file.startsWith(root+sep))return new Response('Forbidden path',{status:403});
  try{const data=await readFile(file);return new Response(new Uint8Array(data),{status:200,headers:{'Content-Type':mime[extname(file).toLowerCase()]??'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});}
  catch{return new Response('Not found',{status:404});}
}
async function start(){
  protocol.handle('app',handleApp);
  const win=new BrowserWindow({width:1360,height:800,minWidth:1000,minHeight:650,backgroundColor:'#100e17',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{const allowed=process.env.VITE_DEV_SERVER_URL?new URL(process.env.VITE_DEV_SERVER_URL).origin:'app://game';if(new URL(url).origin!==allowed)event.preventDefault();});
  if(process.env.VITE_DEV_SERVER_URL)await win.loadURL(process.env.VITE_DEV_SERVER_URL);else await win.loadURL('app://game/index.html');
}
app.whenReady().then(start);
app.on('window-all-closed',()=>app.quit());
