import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {tarotCards,tarotImage,tarotSpread} from '../../src/content/tarot';
import {assetCatalog} from '../../src/generated/catalog';
describe('illustrated prophecy',()=>{
 it('ships six actual decodable WebP files in the authored vision order with accessible text',()=>{
  expect(tarotCards.map(c=>c.id)).toEqual(['mask','wheel','blades','crimson','figure','curtain']);
  for(const card of tarotCards){const path=tarotImage(card.id),bytes=readFileSync('public/'+path);expect(bytes.toString('ascii',0,4)).toBe('RIFF');expect(bytes.toString('ascii',8,12)).toBe('WEBP');expect(bytes.length).toBeGreaterThan(10000);expect(assetCatalog['visual.ui.tarot'].files[card.id]).toBe(path);expect(card.alt.length).toBeGreaterThan(20);}
 });
 it('uses the same cards for the full spread, close-up and final reminder without changing game conditions',()=>{
  const spread=tarotSpread(false,'mask'),compact=tarotSpread(true);expect((spread.match(/data-tarot=/g)??[]).length).toBe(6);expect(spread).toContain('tarot-focus');expect(spread).toContain('aria-pressed="true"');expect((compact.match(/<img /g)??[]).length).toBe(6);expect(compact).not.toContain('data-tarot=');
 });
});
