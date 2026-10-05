import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpolate } from './useMotion.js';
test('readiness interpolation is bounded, exact and supports rollback',()=> {
  for(const [from,to] of [[35,70],[70,90],[90,100],[100,70]]) {
    assert.equal(interpolate(from,to,-1),from);assert.equal(interpolate(from,to,1),to);assert.equal(interpolate(from,to,2),to);
    const values=Array.from({length:11},(_,i)=>interpolate(from,to,i/10));
    assert.ok(values.every(v=>v>=Math.min(from,to) && v<=Math.max(from,to)));
    assert.ok(values.every((v,i)=>i===0 || (to>from ? v>=values[i-1] : v<=values[i-1])));
  }
});
