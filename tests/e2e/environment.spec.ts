import { expect, test } from '@playwright/test';

test('seven local painted environments decode and the live world survives room changes',async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];const failed:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>failed.push(r.url()));
  await page.goto('/');await page.getByRole('button',{name:'Почати виставу'}).click();
  const maps=await page.evaluate(async()=>{
    const names=['arena','foyer','backstage','dressing','props','understage','gallery'];
    return Promise.all(names.map(async name=>{
      const response=await fetch(`/assets/environment/${name}/floor.webp`);
      const image=await createImageBitmap(await response.blob());
      const result={name,ok:response.ok,width:image.width,height:image.height};image.close();return result;
    }));
  });
  expect(maps).toHaveLength(7);
  for(const image of maps){expect(image.ok).toBe(true);expect(image.width).toBeGreaterThanOrEqual(512);expect(image.height).toBeGreaterThanOrEqual(512);}
  const positions=[{id:'arena',x:0,z:3},{id:'foyer',x:0,z:13},{id:'backstage',x:0,z:-12},{id:'dressing',x:-15,z:-12},{id:'props',x:15,z:-12},{id:'understage',x:15,z:0},{id:'gallery',x:-15,z:0}];
  for(const p of positions){
    await page.evaluate(async position=>{
      const source='/src/domain/game.ts';const {createWorld}=await import(source) as typeof import('../../src/domain/game');
      const state=createWorld();state.player.x=position.x;state.player.z=position.z;
      localStorage.setItem('last-applause:v1:manual',JSON.stringify(state));
    },p);
    await page.reload();await page.getByRole('button',{name:'Завантажити гру'}).click();
    await expect(page.locator('#viewport canvas')).toBeVisible();
    await page.waitForTimeout(650);
    await page.screenshot({path:`test-results/environment-${p.id}.png`});
    await page.keyboard.press('KeyJ');await expect(page.getByRole('heading',{name:'Журнал вистави'})).toBeVisible();
    await page.getByRole('button',{name:'Закрити'}).click();
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'Зберегти гру'}).click();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('last-applause:v1:manual')!));
    expect(saved.player.x).toBeCloseTo(p.x,4);expect(saved.player.z).toBeCloseTo(p.z,4);
    expect(saved.gameTimeMs).toBeGreaterThan(0);expect(Object.keys(saved.items)).toHaveLength(7);
  }
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
