# Авторські ілюстрації таро

Згенеровано вбудованим Imagegen; CLI/API fallback не використовувався. Оригінальні PNG збережені у вихідному каталозі генерації; у проєкті — оптимізовані копії WebP 640×960, quality 88. Зміст зображень після генерації не редагувався. Це проєктні асети GitHub, підключені через `visual.ui.tarot`.

## Фінальні файли

| Карта | Файл |
| --- | --- |
| I Маска | `public/assets/ui/tarot/mask.webp` |
| II Колесо | `public/assets/ui/tarot/wheel.webp` |
| III Клинки | `public/assets/ui/tarot/blades.webp` |
| IV Багрянець | `public/assets/ui/tarot/crimson.webp` |
| V Постать | `public/assets/ui/tarot/figure.webp` |
| VI Завіса | `public/assets/ui/tarot/curtain.webp` |

## Спільна частина кожного промпта

```text
Use case: illustration-story. Asset type: portrait illustration for a custom occult tarot card in a Ukrainian Halloween circus game, roughly 2:3 portrait. Style: exquisite dark Art Nouveau tarot engraving with painterly anime-inspired elegance, worn ivory paper, midnight plum and muted burgundy ink, delicate antique gold ornaments, tiny stars and crescent motifs. Symmetrical thin double gold ornamental frame inside edges; subject centered, legible at thumbnail size, generous plain parchment strip near bottom for an HTML title overlay. Flat card front viewed straight on, full bleed rectangular image, no photographed tabletop, no perspective, no mockup, no text, no letters, no numbers, no watermark. Keep six-card deck style coherent, refined rather than cartoony. Prophecy imagery must remain ambiguous about whether a person dies; no gore.
```

До спільної частини додано `Primary subject: ` та відповідний опис нижче. Генерація — шість окремих викликів, transparent_background=false.

### mask

```text
A single elegant ivory theatre half-mask with clearly hollow dark eye holes floats above burgundy folds. Fine gold filigree on mask, mysterious smoke, a tiny crescent reflected in one eye opening. This card represents concealed identity. Only one mask; no person.
```

### wheel

```text
A large vertical circus target wheel with burgundy and faded teal radial sections, brass rim, moonlike central hub, wooden support feet. Thin celestial orbit lines around it, no person, no knives, no blood. This card represents the wheel itself, fate and a stage mechanism.
```

### blades

```text
Three slender silver circus throwing knives suspended in a clean fanned arrangement, sharp tips aimed downward, ornate dark handles, speed-line stars against midnight plum. No target, no person, no wounds. This card represents the moment of the throw.
```

### crimson

```text
Close view of a cream waistcoat and burgundy stage coat on a headless dress form, one vivid red paint-like blot at the chest, a few red droplets suspended like rubies, theatrical lighting. Red mark could be stage paint, must remain ambiguous; no injury, no skin, no gore, no paint bottle that would spoil the solution.
```

### figure

```text
One perfectly still, slender masked silhouette in a burgundy costume, upright with arms slightly away from the sides, framed by a faint circular circus target and shadow. Elegant neutral pose, eyes hidden. Ambiguous whether human or stage double, no strings or obvious mannequin joints, no death or injury.
```

### curtain

```text
Rich burgundy velvet theatre curtains almost closed, a narrow vertical slit of warm ivory light leading into deep darkness, stage dust like stars, ornate gold tassels and crescent overhead. No audience, no person. This card represents the final falling curtain, uncertain what lies beyond.
```
