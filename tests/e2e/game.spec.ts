import { expect, test } from '@playwright/test';

test('new show, visible 3D scene, movement, inspection, journal, save and restore',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.getByRole('heading',{name:'Карта останнього номера'})).toBeVisible();
  await page.getByRole('button',{name:'Почати виставу'}).click();
  await expect(page.locator('#viewport canvas')).toBeVisible();
  await page.screenshot({path:'test-results/start.png'});
  await page.keyboard.press('KeyE');await expect(page.getByRole('heading',{name:'Афіша з видінням'})).toBeVisible();
  await page.getByRole('button',{name:'Оглянути'}).click();await expect(page.locator('.dialogue')).toContainText('Афіша');
  await page.getByRole('button',{name:'Відійти'}).click();
  await page.keyboard.press('KeyQ');await expect(page.getByRole('heading',{name:'Карта пророцтва'})).toBeVisible();await page.getByRole('button',{name:'Закрити'}).click();
  await page.keyboard.press('Tab');await expect(page.getByRole('heading',{name:'Реквізит'})).toBeVisible();await page.getByRole('button',{name:'Закрити'}).click();
  await page.keyboard.press('KeyJ');await expect(page.getByRole('heading',{name:'Журнал вистави'})).toBeVisible();await page.getByRole('button',{name:'Закрити'}).click();
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Зберегти гру'}).click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('last-applause:v1:manual')!));
  await page.getByRole('button',{name:'Повернутися'}).click();
  await page.keyboard.down('KeyS');await page.waitForTimeout(800);await page.keyboard.up('KeyS');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Зберегти гру'}).click();
  const moved=await page.evaluate(()=>JSON.parse(localStorage.getItem('last-applause:v1:manual')!));
  expect(moved.player.z).toBeGreaterThan(saved.player.z+.5);
  await page.evaluate(data=>localStorage.setItem('last-applause:v1:manual',JSON.stringify(data)),saved);
  await page.getByRole('button',{name:'Завантажити'}).click();
  await page.waitForTimeout(100);
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Зберегти гру'}).click();
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('last-applause:v1:manual')!));
  expect(restored.player.x).toBeCloseTo(saved.player.x,1);expect(restored.player.z).toBeCloseTo(saved.player.z,1);
  expect(errors).toEqual([]);
});

test('dialogue confirms a swap and the performed act returns to exploration',async({page})=>{
  // This includes real NPC travel; software WebGL on CI needs more than the default 30s budget.
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.evaluate(async()=>{
    const source:string='/src/domain/game.ts';const {createWorld}=await import(source) as typeof import('../../src/domain/game');const state=createWorld();
    state.mechanisms.rigPrepared=true;state.player.x=0;state.player.z=0;
    for(const actor of Object.values(state.actors)){actor.x=0;actor.z=0;actor.nodeId='arena';actor.route=[];}
    localStorage.setItem('last-applause:v1:manual',JSON.stringify(state));
  });
  await page.reload();await page.getByRole('button',{name:'Завантажити гру'}).click();
  await page.locator('#targets button[data-target="npc.acrobat"]').click();
  await page.getByRole('button',{name:/Запропонувати виступити зараз/}).click();
  await page.getByRole('button',{name:'Відійти'}).click();
  await page.locator('#targets button[data-target="npc.illusionist"]').click();
  await page.getByRole('button',{name:/Погодити заміну/}).click();
  await page.getByRole('button',{name:'Відійти'}).click();
  await page.locator('#targets button[data-target="npc.ringmaster"]').click();
  await page.getByRole('button',{name:/Оголосити перестановку/}).click();
  await page.getByRole('button',{name:/Почати номер/}).click();
  await expect(page.getByRole('heading',{name:'Танець на порожній висоті'})).toBeVisible();
  await page.getByRole('button',{name:'Затягнути противагу'}).click();
  await page.getByRole('button',{name:'Дати світловий сигнал'}).click();
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('#decay')).toHaveText('Зникнення 1/3');
  expect(errors).toEqual([]);
});

test('the dressed double appears in the final scene and the escape ending resolves',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await page.evaluate(async()=>{
    const source:string='/src/domain/game.ts';const {createWorld}=await import(source) as typeof import('../../src/domain/game');const state=createWorld();
    for(const slot of state.slots)slot.status='completed';state.decayStage=3;
    state.mode='finale';state.finaleDeadline=60000;state.player.x=0;state.player.z=0;
    state.mechanisms.finalInspected=true;state.mechanisms.doubleMounted=true;state.mechanisms.doubleDressed=true;state.mechanisms.doubleMasked=true;state.mechanisms.blackoutReady=true;state.mechanisms.passageOpen=true;
    state.items['instance.item.stage_double'].location={kind:'installed',stationId:'station.wheel',slot:'double'};
    state.items['instance.item.costume'].location={kind:'installed',stationId:'station.wheel',slot:'costume'};
    state.items['instance.item.hero_mask'].location={kind:'installed',stationId:'station.wheel',slot:'mask'};
    state.items['instance.item.live_knives'].location={kind:'installed',stationId:'station.wheel',slot:'knives'};
    localStorage.setItem('last-applause:v1:manual',JSON.stringify(state));
  });
  await page.reload();await page.getByRole('button',{name:'Завантажити гру'}).click();
  await expect(page.getByRole('heading',{name:'Останній номер'})).toBeVisible();
  await page.locator('#overlay').evaluate(el=>el.style.display='none');
  await page.locator('#toast').evaluate(el=>el.style.display='none');
  await page.screenshot({path:'test-results/finale-scene.png'});
  await page.locator('#overlay').evaluate(el=>el.style.display='');
  await page.getByRole('button',{name:/Піти прихованим проходом/}).click();
  await expect(page.getByRole('heading',{name:'Оплески після порожнечі'})).toBeVisible();
  expect(errors).toEqual([]);
});
