import test from 'node:test';
import assert from 'node:assert/strict';
import { getStoredBanquigerPlayers, saveStoredBanquigerPlayers } from '../src/utils/banquigerStorage.js';
test('shared catalog prices survive rendering, including automatic and formerly manual players', () => {
 const storage=new Map([['banquiger-economy-version','6']]);
 globalThis.window={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
 try {
  const base=[{id:'108',name:'Carlos',position:'Pívot',price:1.6},{id:'103',name:'Diego',position:'Alero',price:1.5},{id:'105',name:'Dani',position:'Alero',price:0.4}];
  saveStoredBanquigerPlayers([{...base[0],price:1.2,manualPrice:false},{...base[1],price:1.3,manualPrice:true},{...base[2],price:0.3}]);
  const first=getStoredBanquigerPlayers(base);
  const second=getStoredBanquigerPlayers(base);
  assert.deepEqual(first.map(p=>p.price),[1.2,1.3,0.3]);
  assert.deepEqual(second,first);
 } finally { delete globalThis.window; }
});
