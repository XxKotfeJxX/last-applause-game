# Створення контенту

Визначення живуть у `content/`, а поточні екземпляри — в `WorldState`. Імена та кольори можна міняти в JSON без зміни логічних ID. `src/content/index.ts` завантажує й типізує ці дані; `tools/content/validate.mjs` перевіряє посилання.

## Заміна предмета, а не перейменування

Виконайте `npm run new:item -- --id item.paper_double`. Відкрийте `content/items/items.json`: замініть дефолтні властивості на паперового двійника, задайте велике перенесення, три потрібні capability, `decayPolicy: persistent`, координати в майстерні. В `content/packs/base.json` змініть лише `roles.role.stage_double` на `item.paper_double`. В `public/assets/items/paper-double/asset.meta.json` виставте потрібний `worldSize` і файли. Старий `item.stage_double` можна прибрати з визначень після міграції збережень; до цього не змінюйте його ID без явної міграції. `npm run content:sync`, `npm run content:validate`, `npm test` перевіряють схему й фінальне встановлення нового рольового предмета.

## Персонаж

`npm run new:npc -- --id npc.example` додає Definition із `visualId`, кольорами, стартовим навігаційним вузлом і маршрутом. Задайте українське ім’я, маршрут із вузлів `content/areas/world.json`, потрібні `roleIds`/`actIds`; додайте рядки в `content/dialogues/dialogues.json`. NPC з’являється лише після додавання Definition, не після PNG самого по собі. Для нової сценічної ролі додайте прив’язку в `content/packs/base.json`.

## Діалог і факти

`content/dialogues/dialogues.json` містить `id`, `actorId`, український `text`, `priority` і необов’язкові `requiresFact`, `requiresMechanism`, `minDecay`. Runtime обирає доступний рядок із найвищим пріоритетом. Новий факт реєструється в `tools/content/validate.mjs` та має бути встановлений ігровою дією. Повторювані видачі речей/оплати виконуються в `execute` з одноразовою перевіркою, а не самою реплікою.

## Номер і сценарій

`npm run new:act -- --id act.example` створює опис. Для наявної механіки задайте `prepStation`, `prepKey`, дві назви сигналів, актора й факт; додайте номер у `initialOrder` лише якщо цикл проходиться й валідатор приймає його. `getOptions`/`execute` у `src/domain/game.ts` реалізують дії. Принципово новий action/controller вимагає нових гілок тут, тексту UI, тесту й документації; довільний JS у JSON не виконується. Увімкнений сценарій зараз лише `scenario.wheel` у `content/acts/acts.json`. Новий фінал не додавайте до `enabledScenarios` до реалізації resolver, постановки та тестів.

## Зона

`content/areas/world.json` містить групи зон, коридори, вузли й ребра. Нове розміщення має лишатися в доступному прямокутнику й мати безпечний маршрут. Закриті проходи змінюють `navigationVersion`, після чого плани NPC перебудовуються. Нова геометрія декорацій додається в `src/render/scene.ts`; логічна доступність залишається в `src/simulation/navigation.ts`.
