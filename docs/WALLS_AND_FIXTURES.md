# Стіни й стаціонарні об’єкти — 31.10.2026

Вісім оригінальних зображень створені вбудованим image_gen і підключені до гри. Це локальні WebP, максимум 1024 px по стороні, quality 88; конвертація зберігає пропорції та альфа-канал. PNG-оригінали не потрібні для запуску. Готові сторонні моделі не використовувалися.

## Прив’язки

| Пакет у `public/assets/environment/` | Застосування |
| --- | --- |
| `wall-theatre/albedo.webp` | Манеж і фоє |
| `wall-dressing/albedo.webp` | Гримерки |
| `wall-machinery/albedo.webp` | Закулісся, майстерня, підпілля, галерея |
| `fixture-cabinet/albedo.webp` | Шафа підміни |
| `fixture-workbench/albedo.webp` | Верстак |
| `fixture-winch/albedo.webp` | Лебідка |
| `fixture-wheel/albedo.webp` | Мішень колеса |
| `fixture-gate/albedo.webp` | Службова брама |

Стіни накладаються на реальну геометрію: UV повторюється приблизно кожні 4 метри. Передні стіни лишаються низькими. Текстури підтримують `repeat: true` у метаданих. Стики намальованого орнаменту потребують художньої перевірки при заміні текстури: горизонтальне повторення не гарантує математично безшовний малюнок.

`content/areas/scenography.json` окремо прив’язує `wallVisualId` до зони та `fixtures` до station ID. Реквізит, який беруть NPC/гравець, не намальовано всередині цих об’єктів. Стаціонарні об’єкти не реєструються в items/inventory. Шафа, верстак і лебідка використовують `worldHeight` та пропорції `frame`; колесо має фіксований сценічний розмір 2.5×2.5 м, брама — authored station. Логічні координати, проходи й радіус взаємодії задаються окремо.

Вимоги до заміни: WebP із реальною прозорістю для fixtures; повністю видимий силует; відсутні текст, люди, переносні інструменти та намальоване тло. Стіни — непрозорий фасадний матеріал без перспективи, підлоги й меблів. Після заміни оновити frame, виконати sync/check/build і переглянути сім зон. П’ять cutout перевіряються браузерним тестом на прозорі й непрозорі пікселі; усі вісім — на відповідність frame.

## Точні промпти

### wall-theatre

`transparent_background: false`

Use case: stylized-concept. Production game art for a haunted Victorian circus. Hand painted storybook gouache, burgundy, antique gold and dusty teal, gently sinister and witty, crisp readable shapes, tactile worn surfaces, no text, no letters, no watermark, no people. A seamless horizontally repeating theatrical wall material, flat straight-on orthographic elevation, full bleed rectangular landscape texture. Burgundy pleated canvas panels with slender antique gold wooden ribs, subtle faded star embroidery. No floor, no ceiling, no doors, no free-standing props. Even diffuse illumination, no perspective, no hard cast shadows. Top and bottom continuous ornamental trim.

### wall-dressing

`transparent_background: false`

Use case: stylized-concept. Production game art for a haunted Victorian circus. Hand painted storybook gouache, burgundy, antique gold and dusty teal, gently sinister and witty, crisp readable shapes, tactile worn surfaces, no text, no letters, no watermark, no people. A seamless horizontally repeating dressing room wallpaper and wainscot material, flat straight-on orthographic elevation, full bleed rectangular landscape texture. Smoky violet faded diamond wallpaper, thin brass pilasters and worn dark plum wood lower paneling. No mirrors, no furniture, no lamps, no floor or ceiling or perspective. Even diffuse illumination.

### wall-machinery

`transparent_background: false`

Use case: stylized-concept. Production game art for a haunted Victorian circus. Hand painted storybook gouache, burgundy, antique gold and dusty teal, gently sinister and witty, crisp readable shapes, tactile worn surfaces, no text, no letters, no watermark, no people. A seamless horizontally repeating backstage utility wall material, flat straight-on orthographic elevation, full bleed rectangular landscape texture. Dark desaturated teal timber and riveted bluegrey metal lower panels, small old brass conduit details flat against wall. No doors, no furniture, no floor or ceiling, no large pipes projecting. Even diffuse illumination.

### fixture-cabinet

`transparent_background: true`

Use case: stylized-concept. Production game art for a haunted Victorian circus. Hand painted storybook gouache, burgundy, antique gold and dusty teal, gently sinister and witty, crisp readable shapes, tactile worn surfaces, no text, no letters, no watermark, no people. One tall stationary Victorian circus wardrobe cabinet with closed plum wood doors, old brass crescent ornament, small bun feet, ornate top. Entire object centered isolated on genuinely transparent background. Front facing, slight view of top appropriate for a fixed orthographic game camera looking down 35 degrees. Clear silhouette, nothing cropped, no loose objects or inventory items, no floor, no background, no ground shadow.

### fixture-workbench

`transparent_background: true`

Use case: stylized-concept. Production game art for a haunted Victorian circus. Hand painted storybook gouache, burgundy, antique gold and dusty teal, gently sinister and witty, crisp readable shapes, tactile worn surfaces, no text, no letters, no watermark, no people. One broad stationary old circus stagehand workbench, worn teal wooden body, golden wood tabletop, integrated large brass vise and a crank fixed on side, closed lower drawers. Entire object centered isolated on genuinely transparent background. Front facing, view of top appropriate for a fixed orthographic game camera looking down 35 degrees. Clear silhouette, nothing cropped, no loose objects, no knives, no tools to collect, no floor or background or ground shadow.

### fixture-winch

`transparent_background: true`

Use case: stylized-concept. Production game art for a haunted Victorian circus. Hand painted storybook gouache, burgundy, antique gold and dusty teal, gently sinister and witty, crisp readable shapes, tactile worn surfaces, no text, no letters, no watermark, no people. One stationary antique theatrical winch and light control mechanism. Heavy iron base, brass large side flywheel, twin cable drums, small lever control pedestal, copper coil, dusty teal metal and gold. Entire single coherent machine centered isolated on genuinely transparent background. Front facing, view of top appropriate for fixed orthographic camera looking down 35 degrees. No text, no loose tools, no floor or background or ground shadow, nothing cropped.

### fixture-wheel

`transparent_background: true`

A round wooden circus knife-throwing target board, perfectly circular front view, centered. Faded burgundy and dusty teal radial alternating wedges, narrow antique gold perimeter, worn scored wooden texture, five small pale attachment straps fixed on the board, completely empty center. Flat orthographic view with even diffuse lighting. Entire board visible, isolated genuinely transparent background. No stand, no knives, no person, no mannequin, no text, no numbers. Hand-painted Victorian haunted circus gouache, crisp readable game asset.

### fixture-gate

`transparent_background: true`

A stationary Victorian circus service gate, front orthographic elevation. Two narrow iron and brass side posts, horizontal brass top rail with small crescent ornament, dark teal vertical iron bars, entire rectangular gate centered isolated on genuinely transparent background. Clear transparent open gaps between bars. Worn metal, hand-painted haunted circus gouache, burgundy and antique gold accents. No floor, no wall, no background, no text, no people, no ground shadow. Entire object visible.
