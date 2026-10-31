# Оформлення семи локацій

Власні зображення створені 31.10.2026 вбудованим `image_gen` для цієї гри. Вони реально підключені до підлог 3D-сцени; це не лише концепти. Початкові PNG збережені окремо, runtime-копії оптимізовані у WebP зі збереженням пропорцій, максимум 1024 px по стороні, quality 86.

## Асети

| Зона | Файл від кореня репозиторію | visualId |
| --- | --- | --- |
| Манеж | `public/assets/environment/arena/floor.webp` | `visual.environment.arena` |
| Фоє | `public/assets/environment/foyer/floor.webp` | `visual.environment.foyer` |
| Закулісся | `public/assets/environment/backstage/floor.webp` | `visual.environment.backstage` |
| Гримерки | `public/assets/environment/dressing/floor.webp` | `visual.environment.dressing` |
| Майстерня | `public/assets/environment/props/floor.webp` | `visual.environment.props` |
| Підпілля | `public/assets/environment/understage/floor.webp` | `visual.environment.understage` |
| Галерея | `public/assets/environment/gallery/floor.webp` | `visual.environment.gallery` |

Кожна папка має `asset.meta.json`. Художня прив’язка до зони й кольори — `content/areas/scenography.json`. `src/render/scenography.ts` створює підлоги, арки, оздоблення, ліхтарі, дзеркала, полиці, труби й механізми з примітивів. Повторювані елементи об’єднані в InstancedMesh. Жодні готові моделі не завантажуються.

## Сумісність із грою

`content/areas/world.json`, усі вузли та ребра навігації, точки взаємодії, початкові координати предметів, сценарії та формат збереження не змінено. Сценографія не записує ігровий стан. Передні стіни знижено для видимості персонажа; їхній вигляд не визначає чинну прямокутну логіку колізій. Нові великі декоративні елементи розміщені переважно по краях; арки залишають вільними задані проходи.

Заміна: покласти новий `floor.webp` у ту саму папку, за потреби оновити розміри у метаданих, виконати `npm run content:sync`, `npm run check`, `npm run build:web`. Перевірити всі кімнати та переходи. Файл має бути знімком поверхні строго згори: без перспективи, стін, людей, написів і намальованих перешкод. Не запікати у підлогу речі, які NPC повинні забирати.

Якщо зображення не завантажилося, AssetResolver дає процедурну поверхню; це не змінює маршрути чи підміни. Ресурси локальні; онлайн-доступ під час гри не потрібний.

## Спільний промпт

Use case: stylized-concept. Production game asset: a hand-painted FLOOR SURFACE IMAGE to map onto a flat ground plane in a 2.5D occult circus game, not a screenshot, not a room perspective. Camera perfectly overhead / orthographic looking straight down; no perspective, no horizon, no standing objects, no people, no walls. Rich atmospheric painted texture with readable large forms, restrained fine grain. Antique travelling circus, mysterious autumn midnight, burgundy velvet, aged ochre gold, dusty teal shadows, painterly storybook gouache with worn surfaces, sophisticated dark theatrical mood. Soft neutral baked ambient illumination, no hard cast shadows. The entire image is usable ground; keep the central 70% calm so small game characters and portable items remain legible. Edge wear and ornament can be richer. No text, letters, numbers, logos, watermarks, UI, or border outside the image. Opaque background. This is final environment art replacing block-color ground in an actual 3D game.

## Доповнення до промпта для кожної зони

**arena:** Square floor, exact top-down view. Main circus arena: a large circular faded deep-crimson performance carpet centered on antique wooden boards, muted gold concentric rings, small faded star motifs, a subtle eight-point compass-like stage marking. The carpet fills 80% of image width. Worn gold rope edging, scuff marks, amber wood at corners, ominous but inviting. Central circle unobstructed. 1024x1024.

**foyer:** Landscape 3:2 floor, exact overhead. Circus foyer: warm honey-colored old parquet, a long faded wine-red entrance runner through the vertical middle of the image, thin brass inlay and faded gold stars, tracked-in autumn leaves only at outer corners. Warm amber and soft dark teal. No stairs or furniture. 1536x1024.

**backstage:** Landscape 2:1 floor, exact overhead. Backstage passage: long weathered dark-plum floorboards, a faded burgundy carpet runner running horizontally from left edge to right edge, worn brass edges, small pale chalk arcs and paint scuffs near outer border, central walkway calm and dark. No text, props, or vertical surfaces. 1536x768.

**dressing:** Square floor, exact overhead. Circus dressing rooms: dusky violet-brown parquet, worn small plum-and-gold round rug centered, scattered tiny blush powder smudges and faint brass decorative filigree at the edges, hints of old glamour, mostly calm walkable wooden floor, mysterious amber tones. No makeup objects, furniture, walls or people. 1024x1024.

**props:** Square floor, exact overhead. Circus prop store/workshop: aged warm olive-brown plank floor, worn striped workmat in the lower center, subtle sawdust and scratched pale arcs at the outer edges, dark teal and honey patina, distinct broad planks, central space uncluttered. No tools, objects, furniture or text painted onto the floor. 1024x1024.

**understage:** Square floor, exact overhead. Technical space under a haunted circus stage: dark blue-grey timber reinforced with broad flat tarnished metal strips and subtle round rivets, a closed-looking decorative square metal plate motif offset toward one corner but floor fully flat, dusty teal patina, warm faint copper details. Central floor readable. No holes, real hatches, furniture, pipes standing above ground, or black voids. 1024x1024.

**gallery:** Square floor, exact overhead. Upper circus technical gallery surface: narrow-patterned aged amber timber with blackened iron reinforcing bands along the borders, subtle old gold geometric marks, worn steel grating texture patches in the corners, charcoal and antique brass, mostly calm central wood floor. No railings, stairs, lamps, gears or foreground objects. 1024x1024.

## Перевірка

Новий браузерний тест `tests/e2e/environment.spec.ts` декодує всі сім WebP, відвідує всі сім зон, перевіряє журнал, збереження позиції, продовження ігрового часу й відсутність помилок сторінки/завантажень. Він створює скриншоти в `test-results/`. Наявні інтеграційні тести перевіряють усі шість порядків номерів та обидва способи порятунку. Реальні результати поточного запуску див. у TEST_REPORT.
