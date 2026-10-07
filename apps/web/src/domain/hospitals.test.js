import test from 'node:test';
import assert from 'node:assert/strict';
import { findHospitalMention, matchPartnerHospital, normalizeHospitalName, recognizeHospital } from './hospitals.js';
import { partnerHospitals } from '../content/cardifData.js';

test('台/臺 variants and abbreviations normalise to the official partner names', () => {
  assert.equal(normalizeHospitalName('台中榮總'), '臺中榮民總醫院');
  assert.equal(normalizeHospitalName('台大'), '臺大醫院');
  assert.equal(matchPartnerHospital('台中榮總', partnerHospitals), '臺中榮民總醫院');
  assert.equal(matchPartnerHospital('臺中榮總', partnerHospitals), '臺中榮民總醫院');
  assert.equal(matchPartnerHospital('台大', partnerHospitals), '臺大醫院');
  assert.equal(matchPartnerHospital('台大醫院', partnerHospitals), '臺大醫院');
  assert.equal(matchPartnerHospital('北榮', partnerHospitals), '臺北榮民總醫院');
  assert.equal(matchPartnerHospital('新光醫院', partnerHospitals), '新光吳火獅紀念醫院');
});

test('the main campus wins over branches unless a branch is named', () => {
  assert.equal(matchPartnerHospital('台中榮總', partnerHospitals), '臺中榮民總醫院');
  assert.equal(recognizeHospital('台中榮總埔里分院住院', partnerHospitals).matchedName, '臺中榮民總醫院埔里分院');
});

test('mentions are found in free text; non-partner and missing hospitals are explicit', () => {
  assert.equal(findHospitalMention('我上週在台中榮總住院五天，要怎麼申請理賠？'), '台中榮總');
  assert.deepEqual(recognizeHospital('我在長庚醫院住院', partnerHospitals), { mentioned: '長庚醫院', matchedName: null, partner: false });
  assert.equal(recognizeHospital('我住院了想申請理賠', partnerHospitals), null);
});
