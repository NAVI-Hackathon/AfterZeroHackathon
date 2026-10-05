import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, addMockEvidence, readSession, STORAGE_KEY, LEGACY_STORAGE_KEY } from './workflow.js';

test('brand migration restores legacy progress and prefers the new key',()=>{
  let original=createCase('我的班機延誤七小時');
  original=addMockEvidence(original,'boarding_pass','boarding.png');
  original=addMockEvidence(original,'delay_certificate','delay.pdf');
  original={...original,confirmed:true};
  const values=new Map([[LEGACY_STORAGE_KEY,JSON.stringify(original)]]);
  const storage={getItem:key=>values.get(key) ?? null};
  const restored=readSession(storage);
  assert.equal(restored.confirmed,true);
  assert.equal(restored.evidence.boarding_pass.filename,'boarding.png');
  values.set(STORAGE_KEY,JSON.stringify(createCase('我想更改繳費方式')));
  assert.equal(readSession(storage).interpretation.serviceType,'payment_change');
});
