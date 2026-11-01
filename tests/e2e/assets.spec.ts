import { expect,test } from '@playwright/test';
test('fixture alpha, wall dimensions and metadata-aware preview controls',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/asset-preview.html');await expect(page.getByRole('heading',{name:'Майстерня персонажів і реквізиту'})).toBeVisible();
 const assets=await page.evaluate(async()=>{
  const source='/src/generated/catalog.ts';const {assetCatalog}=await import(source) as typeof import('../../src/generated/catalog');
  const result=[];
  for(const [id,entry] of Object.entries(assetCatalog).filter(([id])=>/visual.environment.(wall|fixture)-/.test(id))){
   const response=await fetch(entry.files.albedo),image=await createImageBitmap(await response.blob()),c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);const alpha=ctx.getImageData(0,0,c.width,c.height).data;let clear=0,solid=0;for(let n=3;n<alpha.length;n+=4){if(alpha[n]===0)clear++;if(alpha[n]>200)solid++;}result.push({id,ok:response.ok,width:image.width,height:image.height,clear,solid,frame:entry.meta.frame});image.close();
  }return result;
 });
 expect(assets).toHaveLength(8);for(const a of assets){expect(a.ok).toBe(true);expect(a.frame).toEqual({width:a.width,height:a.height});expect(a.solid).toBeGreaterThan(1000);if(a.id.includes('fixture'))expect(a.clear).toBeGreaterThan(1000);}
 await page.locator('#paused').check();await page.locator('#sockets').uncheck();await page.locator('#zoom').selectOption('1.5');await page.locator('.clip').first().selectOption('interact');await expect(page.locator('.status-text').first()).toContainText('3D-модель');
 await page.screenshot({path:'test-results/asset-preview.png',fullPage:true});expect(errors).toEqual([]);
});
