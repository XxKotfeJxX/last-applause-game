/** Six visual fragments, not a new set of ending conditions or a literal death prediction. */
export const tarotCards=[
 {id:'mask',number:'I',title:'Маска',alt:'Порожня театральна маска з темними очницями.'},
 {id:'wheel',number:'II',title:'Колесо',alt:'Вертикальне циркове колесо з червоними й зеленими секторами.'},
 {id:'blades',number:'III',title:'Клинки',alt:'Три метальні ножі, спрямовані вістрями вниз.'},
 {id:'crimson',number:'IV',title:'Багрянець',alt:'Червона пляма на грудях сценічного костюма.'},
 {id:'figure',number:'V',title:'Постать',alt:'Нерухома постать у масці перед цирковим колесом.'},
 {id:'curtain',number:'VI',title:'Завіса',alt:'Бордова завіса закривається над смугою світла.'}
] as const;
export function tarotImage(id:string){return `assets/ui/tarot/${id}.webp`;}
export function tarotSpread(compact=false,selected:string|null=null){
 if(compact)return `<div class="tarot-strip" role="group" aria-label="Шість образів пророцтва">${tarotCards.map(c=>`<figure><img src="${tarotImage(c.id)}" alt="${c.alt}" width="640" height="960"><figcaption>${c.number} · ${c.title}</figcaption></figure>`).join('')}</div>`;
 const card=tarotCards.find(c=>c.id===selected);
 return `<div class="tarot-reading${card?' has-focus':''}"><div class="tarot-spread" role="group" aria-label="Розклад пророцтва">${tarotCards.map(c=>`<button type="button" class="tarot-card${c.id===selected?' selected':''}" data-tarot="${c.id}" aria-label="${c.number}. ${c.title}. Збільшити карту" aria-pressed="${c.id===selected}"><img src="${tarotImage(c.id)}" alt="${c.alt}" width="640" height="960"><span class="tarot-caption"><span>${c.number}</span> ${c.title}</span></button>`).join('')}</div>${card?`<figure class="tarot-focus"><img src="${tarotImage(card.id)}" alt="${card.alt}" width="640" height="960"><figcaption>${card.number} · ${card.title}</figcaption></figure>`:''}</div><p class="tarot-hint">Натисніть на карту, щоб роздивитися її.</p>`;
}
