import {tarotSpread} from './content/tarot';
import './style.css';
const app=document.getElementById('app')!;let selected:string|null=null;
function render(){app.innerHTML=`<div id="game"><div id="overlay"><section class="modal tarot-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-kicker">ОСТАННІ ОПЛЕСКИ · МАЙСТЕРНЯ КАРТ</div><h1 id="modal-title">Розклад останнього номера</h1><div class="modal-body">${tarotSpread(false,selected)}</div><div class="choices"><a class="choice quiet" href="./index.html">Повернутися до гри</a></div></section></div></div>`;}
app.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-tarot]');if(!button)return;const id=button.dataset.tarot!;selected=selected===id?null:id;render();app.querySelector<HTMLButtonElement>(`[data-tarot="${id}"]`)?.focus();});render();
