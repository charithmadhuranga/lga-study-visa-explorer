#!/usr/bin/env node
/**
 * Parity check: public/data/catalogue.json (schema v2) against reference/data/catalog.js
 * (the read-only baseline). Every institution and course must survive the conversion
 * field-for-field, plus a handful of hard-coded golden records that pin absolute values.
 *
 * Run: npm run data:parity   (must be green before any change is considered done)
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function fail(message) {
  failures.push(message);
}

/** Deep equality that ignores object key order (JSON.stringify is order-sensitive). */
function same(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.hasOwn(b, k) && same(a[k], b[k]));
}

function assertEqual(actual, expected, label) {
  if (!same(actual, expected)) {
    fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function loadJs(path) {
  const text = readFileSync(path, 'utf8');
  return JSON.parse(
    text
      .slice(text.indexOf('=') + 1)
      .trim()
      .replace(/;$/, ''),
  );
}

const ref = loadJs(join(repo, 'reference', 'data', 'catalog.js'));
const cat = JSON.parse(readFileSync(join(repo, 'public', 'data', 'catalogue.json'), 'utf8'));

// ---- absolute counts (from the reference README / PLAN) ----
assertEqual(cat.counts.universities, 436, 'institution count');
assertEqual(cat.counts.courses, 4225, 'course count');
assertEqual(
  cat.counts.byCountry,
  { usa: 1137, uk: 1035, canada: 965, australia: 848, 'new-zealand': 240 },
  'byCountry',
);
assertEqual(cat.levels, ref.levels, 'levels');
assertEqual(cat.fields, ref.fields, 'fields');
assertEqual(cat.fx, ref.fx, 'fx');
assertEqual(cat.fxDate, ref.fxDate, 'fxDate');
assertEqual(cat.built, ref.built, 'built');

// ---- institutions, field for field ----
const uniById = new Map(cat.universities.map((u) => [u.id, u]));
assertEqual(cat.universities.length, ref.unis.length, 'university list length');

for (const u of ref.unis) {
  const out = uniById.get(u.id);
  if (!out) {
    fail(`missing institution ${u.id}`);
    continue;
  }
  const pairs = [
    ['name', u.n],
    ['country', u.c],
    ['category', u.cat],
    ['type', u.t],
    ['founded', u.f],
    ['city', u.city ?? ''],
    ['province', u.prov ?? ''],
    ['campuses', u.camp ?? []],
    ['logoUrl', u.logo ?? ''],
    ['photo', u.img ?? ''],
    ['website', u.web ?? ''],
    ['students', u.st ?? 0],
    ['canWork', !!u.work],
    ['coop', !!u.coop],
    ['housing', !!u.house],
    ['durations', u.dur ?? []],
    ['featured', !!u.feat],
  ];
  for (const [field, expected] of pairs) assertEqual(out[field], expected, `${u.id}.${field}`);
}

// ---- courses, field for field ----
const courseByKey = new Map(cat.courses.map((c) => [c.key, c]));
assertEqual(cat.courses.length, ref.courses.length, 'course list length');

const CURRENCY = { uk: 'GBP', australia: 'AUD', canada: 'CAD', 'new-zealand': 'NZD', usa: 'USD' };

for (const t of ref.courses) {
  const out = courseByKey.get(t[0]);
  if (!out) {
    fail(`missing course ${t[0]}`);
    continue;
  }
  const university = ref.unis[t[2]];
  const pairs = [
    ['name', t[1]],
    ['universityId', university.id],
    ['country', university.c],
    ['level', t[3]],
    ['field', ref.fields[t[4]]],
    ['tuitionPerYear', t[5]],
    ['currency', t[5] ? CURRENCY[university.c] : null],
    ['applicationFee', t[6]],
    ['durationMonths', [t[7], t[8]]],
    [
      'intakes',
      t[9].map((raw) => {
        const [start, deadline] = String(raw).split('|');
        return deadline && deadline !== start ? { start, deadline } : { start };
      }),
    ],
    ['tags', { scholarship: !!(t[10] & 1), coop: !!(t[10] & 2), pathway: !!(t[10] & 4) }],
    ['city', t[11]],
    ['province', t[12]],
  ];
  for (const [field, expected] of pairs) assertEqual(out[field], expected, `${t[0]}.${field}`);
}

// ---- courseCount is derived, not copied ----
for (const u of cat.universities) {
  const expected = cat.courses.filter((c) => c.universityId === u.id).length;
  assertEqual(u.courseCount, expected, `${u.id}.courseCount`);
}

// ---- golden records: absolute values that must never drift ----
const golden = [
  [
    '1w45',
    {
      name: 'Bachelor of 2D Animation',
      tuitionPerYear: 21200,
      durationMonths: [36, 36],
      country: 'australia',
    },
  ],
  ['1w31', { name: 'Bachelor of 3D Animation', city: 'Melbourne', level: 0 }],
  ['1w33', { name: 'Bachelor of Film', currency: 'AUD', applicationFee: 0 }],
];
for (const [key, fields] of golden) {
  const course = courseByKey.get(key);
  if (!course) {
    fail(`golden course ${key} missing`);
    continue;
  }
  for (const [field, expected] of Object.entries(fields))
    assertEqual(course[field], expected, `golden ${key}.${field}`);
}

const goldUni = uniById.get('academy-of-interactive-technology');
if (!goldUni) fail('golden institution missing');
else {
  assertEqual(goldUni.name, 'Academy of Interactive Technology (AIT)', 'golden uni.name');
  assertEqual(goldUni.city, 'Melbourne', 'golden uni.city');
  assertEqual(goldUni.province, 'Victoria', 'golden uni.province');
}

// ---- detail files: one per country, course keys resolvable ----
const detailDir = join(repo, 'public', 'data', 'details');
const detailFiles = readdirSync(detailDir)
  .filter((f) => f.endsWith('.json'))
  .sort();
assertEqual(
  detailFiles,
  ['australia.json', 'canada.json', 'new-zealand.json', 'uk.json', 'usa.json'],
  'detail files',
);

let summaries = 0;
for (const file of detailFiles) {
  const detail = JSON.parse(readFileSync(join(detailDir, file), 'utf8'));
  const country = file.replace(/\.json$/, '');
  assertEqual(detail.country, country, `${file}.country`);
  for (const key of Object.keys(detail.courses)) {
    if (!courseByKey.has(key)) fail(`${file}: unknown course key ${key}`);
    else summaries += 1;
  }
}
if (summaries < 4000) fail(`only ${summaries} course summaries present (expected ≥ 4000)`);

// ---- report ----
if (failures.length) {
  console.error(`data:parity FAILED — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 30)) console.error(`  · ${f}`);
  if (failures.length > 30) console.error(`  … and ${failures.length - 30} more`);
  process.exit(1);
}
console.log(
  `data:parity OK — ${cat.counts.universities} institutions, ${cat.counts.courses} courses, ` +
    `${summaries} course summaries, 5 detail files`,
);
