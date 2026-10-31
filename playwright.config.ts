import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
export default defineConfig({
  testDir:'tests/e2e',timeout:30000,retries:0,workers:1,
  use:{baseURL:'http://127.0.0.1:5175/',viewport:{width:1280,height:720},launchOptions:existsSync(chrome)?{executablePath:chrome,args:['--use-gl=angle','--use-angle=swiftshader']}:{}},
  webServer:{command:'npm run dev:web -- --host 127.0.0.1 --port 5175',url:'http://127.0.0.1:5175/',reuseExistingServer:false,timeout:30000}
});
