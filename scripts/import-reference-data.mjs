#!/usr/bin/env node
/**
 * Bootstrap data import: reference/data/*.js (schema-v1, read-only) → public/data/*.json
 * (schema v2) + copies the curated images into src/assets/img.
 *
 * Run: npm run data:import
 * This is the *build-time* half of the pipeline; the runtime half is the Rust transform
 * (src-tauri/src/catalogue/transform.rs). Both must produce the same schema — see SPEC §7.
 *
 * Never writes into reference/ (AGENTS §3.1).
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const refData = join(repo, 'reference', 'data');
const refImg = join(repo, 'reference', 'img');
const outData = join(repo, 'public', 'data');
const outImg = join(repo, 'src', 'assets', 'img');

/** Country → display currency, mirroring CUR/FXK in src/data/content.ts. */
const CURRENCY = {
  uk: 'GBP',
  australia: 'AUD',
  canada: 'CAD',
  'new-zealand': 'NZD',
  usa: 'USD',
};

function loadJs(path) {
  const text = readFileSync(path, 'utf8');
  const start = text.indexOf('=');
  const json = text
    .slice(start + 1)
    .trim()
    .replace(/;$/, '');
  return JSON.parse(json);
}

function loadDetail(path, country) {
  const text = readFileSync(path, 'utf8');
  const marker = `window.LGA_DETAIL["${country}"]=`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`marker not found in ${path}`);
  const json = text
    .slice(start + marker.length)
    .trim()
    .replace(/;$/, '');
  return JSON.parse(json);
}

/** "2027-02-01" or "2027-02-01|2027-01-15" → { start, deadline? } */
function intake(raw) {
  const [start, deadline] = String(raw).split('|');
  return deadline && deadline !== start ? { start, deadline } : { start };
}

function buildCatalogue() {
  const raw = loadJs(join(refData, 'catalog.js'));
  const details = new Map();
  for (const file of readdirSync(refData)) {
    if (!file.startsWith('detail-') || !file.endsWith('.js')) continue;
    const country = file.slice('detail-'.length, -'.js'.length);
    details.set(country, loadDetail(join(refData, file), country));
  }

  const universities = raw.unis.map((u) => {
    const detail = details.get(u.c)?.u?.[u.id];
    return {
      id: u.id,
      name: u.n,
      country: u.c,
      category: u.cat,
      type: u.t,
      founded: u.f,
      city: u.city ?? '',
      province: u.prov ?? '',
      campuses: u.camp ?? [],
      logoUrl: u.logo ?? '',
      photo: u.img ?? '',
      website: u.web ?? '',
      students: u.st ?? 0,
      canWork: !!u.work,
      coop: !!u.coop,
      housing: !!u.house,
      durations: u.dur ?? [],
      about: u.ab ?? '',
      accommodation: detail?.h ?? '',
      featured: !!u.feat,
      courseCount: 0,
    };
  });

  const byId = new Map(universities.map((u) => [u.id, u]));
  const indexToId = raw.unis.map((u) => u.id);

  const courses = raw.courses.map((t) => {
    const universityId = indexToId[t[2]];
    const university = byId.get(universityId);
    if (!university) throw new Error(`course ${t[0]} references unknown university index ${t[2]}`);
    const country = university.country;
    const tags = t[10];
    university.courseCount += 1;
    return {
      key: t[0],
      name: t[1],
      universityId,
      country,
      level: t[3],
      field: raw.fields[t[4]],
      tuitionPerYear: t[5],
      currency: t[5] ? CURRENCY[country] : null,
      applicationFee: t[6],
      durationMonths: [t[7], t[8]],
      intakes: t[9].map(intake),
      tags: {
        scholarship: !!(tags & 1),
        coop: !!(tags & 2),
        pathway: !!(tags & 4),
      },
      city: t[11],
      province: t[12],
    };
  });

  const byCountry = {};
  for (const course of courses) byCountry[course.country] = (byCountry[course.country] ?? 0) + 1;

  return {
    schemaVersion: 2,
    built: raw.built,
    // The upstream `generatedAt` this snapshot was built from. The reference data does not
    // record it, so pass it in (LGA_SOURCE_GENERATED_AT, from upstream summary.json) — then a
    // fresh install does not re-download identical data on first launch. Falls back to the
    // build date, which makes the first online launch refresh once (SPEC D15).
    sourceGeneratedAt: process.env.LGA_SOURCE_GENERATED_AT || raw.built,
    fxDate: raw.fxDate,
    fx: raw.fx,
    levels: raw.levels,
    fields: raw.fields,
    counts: { universities: universities.length, courses: courses.length, byCountry },
    universities,
    courses,
  };
}

function buildDetails(catalogue) {
  const out = new Map();
  for (const file of readdirSync(refData)) {
    if (!file.startsWith('detail-') || !file.endsWith('.js')) continue;
    const country = file.slice('detail-'.length, -'.js'.length);
    const raw = loadDetail(join(refData, file), country);
    out.set(country, {
      country,
      courses: raw.k ?? {},
      universities: Object.fromEntries(
        Object.entries(raw.u ?? {}).map(([id, v]) => [
          id,
          { about: v.a ?? '', accommodation: v.h ?? '' },
        ]),
      ),
    });
  }
  void catalogue;
  return out;
}

function main() {
  const catalogue = buildCatalogue();
  const details = buildDetails(catalogue);

  mkdirSync(join(outData, 'details'), { recursive: true });
  writeFileSync(join(outData, 'catalogue.json'), JSON.stringify(catalogue));
  for (const [country, file] of details) {
    writeFileSync(join(outData, 'details', `${country}.json`), JSON.stringify(file));
  }

  mkdirSync(outImg, { recursive: true });
  cpSync(refImg, outImg, { recursive: true });

  const missing = catalogue.universities
    .filter((u) => u.photo && !existsSync(join(outImg, u.photo.replace(/^img\//, ''))))
    .map((u) => u.id);

  console.log(
    `data:import → ${catalogue.counts.universities} universities, ${catalogue.counts.courses} courses, ` +
      `${details.size} detail files${missing.length ? `, ${missing.length} missing photos (crest fallback)` : ''}`,
  );
}

main();
