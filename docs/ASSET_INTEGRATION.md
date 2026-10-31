# Підключення асетів

## Художник замінив лише PNG

Приклад: готовий лист ходьби Гната з 6 кадрами у 4 рядках має 768×768 px. Покладіть його як `public/assets/characters/stagehand/walk.png` без зміни `asset.meta.json`. Запустіть:

```powershell
npm run content:sync
npm run assets:validate
npm run build:web
```

`src/generated/catalog.ts` отримає файл `walk`; `AssetResolver` завантажить його лише для `visual.character.stagehand` і clip `walk`. Інші стани Гната та інші NPC залишаться на заглушках. Зміна PNG не вимагає правки правил, діалогів чи проходження. Якщо кадр не 128×192 або кількість інша, поправте `frame`/`clips.walk` у `public/assets/characters/stagehand/asset.meta.json` і повторіть sync/validate/build. Пакований `.exe` треба перескласти: додавання PNG поряд із ним не змінює вбудований пакет.

## Дизайнер додав нову сутність

```powershell
npm run new:item -- --id item.paper_double
```

Команда додає Definition у `content/items/items.json` та пакет `public/assets/items/paper-double/asset.meta.json`. Змініть назву, `capabilities` на `capability.human_silhouette`, `capability.wear_costume`, `capability.mount_on_wheel`, `carryClass` на `large`, `worldSize` у метаданих, початкове розміщення. Замініть прив’язку `role.stage_double` на `item.paper_double` у `content/packs/base.json`. Після sync/validate і збірки фінал використовує новий екземпляр через роль без редагування `resolveFinale` або сцени. Новий PNG `world.png` та `icon.png` необов’язкові для робочої заглушки, але відсутність друкується як попередження. `new:npc` і `new:act` аналогічно створюють Definition; новий номер додається до `initialOrder` лише після реалізації його механіки.

## Папки й помилки

- Персонаж: `public/assets/characters/<visual-slug>/asset.meta.json`, `idle.png`, `walk.png`, `talk.png`, `interact.png`, `react.png`, `perform.png`.
- Предмет: `public/assets/items/<visual-slug>/asset.meta.json`, `world.png`, `icon.png`.
- У `asset.meta.json` потрібні стабільний `id`, `schemaVersion: 1`, `kind`, розміри й імена файлів. Назви файлів латиницею, без пробілів; регістр має збігатися.
- `content:sync` записує лише реально присутні файли; відсутній слот не викликає 404 під час гри.
- `assets:validate` завершується з помилкою для пошкодженого PNG, невірних розмірів/anchor/fps. Відсутній PNG у P0 дає fallback; `--require-final` робить його помилкою.
- `assets:preview` показує наявні файли за visualId. Для спрайтової анімації перевіряйте також гру: фази кадрів належать окремим акторам.

Файли з `src/generated/` не редагують вручну. Немає runtime пошуку по каталогах користувача й немає автоматичного mod loader.

## Опори, sockets і перегляд

Персонажі реально використовують `frame.width/height`, `anchorPx`, `worldHeight`, `clips.*.frameCount/fps/loop`, `defaultSocketsPx`. Значення в пікселях від лівого верхнього кута кадру. Світовий масштаб = worldHeight / frame.height; anchor збігається з логічною точкою ніг. Незакільцьований clip тримає останній кадр. Фаза належить окремому актору. Речі в руці й маска беруть `handRight` / `head`; накладення костюма на фінальний манекен має окрему сценічну композицію. `worldSize` предметів задає ширину й висоту quad у метрах.

За межами camera frustum актор не оновлює UV і не малюється; при поверненні фаза обчислюється з gameTimeMs. Симуляція та перенесення предметів тривають незалежно. Це frustum culling, а не повне occlusion culling за стінами.

`assets:preview` має паузу, сітку, масштаб, напрямки, clips, anchor/sockets, відносний зріст, held frame для non-loop clips, предмети, усі поверхні/fixtures і прослуховування синтезованих семантичних звуків. Інструмент технічний, його текст не належить до дієгетичного поетичного UI.

Нове оточення: [WALLS_AND_FIXTURES](WALLS_AND_FIXTURES.md). Після зміни файлів виконайте sync; редагувати generated/catalog вручну не потрібно.
