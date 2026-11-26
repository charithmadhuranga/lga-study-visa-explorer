//! Schema v2 (SPEC §7.1) as written to disk — field-for-field the shape that
//! `scripts/import-reference-data.mjs` produces and `src/data/types.ts` reads.
//! Field order follows the import script so the two outputs are easy to diff.

use serde::{Deserialize, Serialize, Serializer};
use std::collections::BTreeMap;

pub const SCHEMA_VERSION: u32 = 2;
pub const LEVELS: [&str; 3] = ["Bachelor's", "Master's", "MBA"];
pub const COUNTRIES: [&str; 5] = ["uk", "australia", "canada", "new-zealand", "usa"];

/// Display currency per destination (mirrors `FXK` in `src/data/content.ts`).
pub fn currency_for(country: &str) -> Option<&'static str> {
    Some(match country {
        "uk" => "GBP",
        "australia" => "AUD",
        "canada" => "CAD",
        "new-zealand" => "NZD",
        "usa" => "USD",
        _ => return None,
    })
}

/// Write whole numbers as integers (`150`, not `150.0`), exactly like `JSON.stringify`.
pub fn int_if_whole<S: Serializer>(v: &f64, s: S) -> Result<S::Ok, S::Error> {
    if v.fract() == 0.0 && v.abs() < 9.0e15 {
        // Truncation is exact here: the value is whole and inside the i64-safe range.
        #[allow(clippy::cast_possible_truncation)]
        s.serialize_i64(*v as i64)
    } else {
        s.serialize_f64(*v)
    }
}

fn int_if_whole_pair<S: Serializer>(v: &[f64; 2], s: S) -> Result<S::Ok, S::Error> {
    use serde::ser::SerializeTuple;
    let mut t = s.serialize_tuple(2)?;
    for x in v {
        t.serialize_element(&Whole(*x))?;
    }
    t.end()
}

fn int_if_whole_map<S: Serializer>(m: &BTreeMap<String, f64>, s: S) -> Result<S::Ok, S::Error> {
    use serde::ser::SerializeMap;
    let mut map = s.serialize_map(Some(m.len()))?;
    for (k, v) in m {
        map.serialize_entry(k, &Whole(*v))?;
    }
    map.end()
}

struct Whole(f64);
impl Serialize for Whole {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        int_if_whole(&self.0, s)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Catalogue {
    pub schema_version: u32,
    pub built: String,
    pub source_generated_at: String,
    pub fx_date: String,
    #[serde(serialize_with = "int_if_whole_map")]
    pub fx: BTreeMap<String, f64>,
    pub levels: Vec<String>,
    pub fields: Vec<String>,
    pub counts: Counts,
    pub universities: Vec<University>,
    pub courses: Vec<Course>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Counts {
    pub universities: usize,
    pub courses: usize,
    pub by_country: BTreeMap<String, usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct University {
    pub id: String,
    pub name: String,
    pub country: String,
    pub category: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub founded: String,
    pub city: String,
    pub province: String,
    pub campuses: Vec<String>,
    pub logo_url: String,
    pub photo: String,
    pub website: String,
    #[serde(serialize_with = "int_if_whole")]
    pub students: f64,
    pub can_work: bool,
    pub coop: bool,
    pub housing: bool,
    pub durations: Vec<String>,
    pub about: String,
    pub accommodation: String,
    pub featured: bool,
    pub course_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Course {
    pub key: String,
    pub name: String,
    pub university_id: String,
    pub country: String,
    pub level: usize,
    pub field: String,
    #[serde(serialize_with = "int_if_whole")]
    pub tuition_per_year: f64,
    pub currency: Option<String>,
    #[serde(serialize_with = "int_if_whole")]
    pub application_fee: f64,
    #[serde(serialize_with = "int_if_whole_pair")]
    pub duration_months: [f64; 2],
    pub intakes: Vec<Intake>,
    pub tags: Tags,
    pub city: String,
    pub province: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Intake {
    pub start: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub deadline: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct Tags {
    pub scholarship: bool,
    pub coop: bool,
    pub pathway: bool,
}

/// `details/<country>.json` — long HTML kept out of the main catalogue (SPEC §7.2).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct DetailFile {
    pub country: String,
    pub courses: BTreeMap<String, String>,
    pub universities: BTreeMap<String, UniversityDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct UniversityDetail {
    pub about: String,
    pub accommodation: String,
}

/// Provenance handed to the UI (FR-21) and stored in `current.json` / `meta.json`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BundleMeta {
    pub schema_version: u32,
    pub built: String,
    pub source_generated_at: String,
    pub fx_date: String,
    #[serde(serialize_with = "int_if_whole_map")]
    pub fx: BTreeMap<String, f64>,
    pub counts: Counts,
}

impl Catalogue {
    pub fn meta(&self) -> BundleMeta {
        BundleMeta {
            schema_version: self.schema_version,
            built: self.built.clone(),
            source_generated_at: self.source_generated_at.clone(),
            fx_date: self.fx_date.clone(),
            fx: self.fx.clone(),
            counts: self.counts.clone(),
        }
    }
}

/// One complete transform result, ready to commit.
#[derive(Debug, Clone, PartialEq)]
pub struct Bundle {
    pub catalogue: Catalogue,
    pub details: BTreeMap<String, DetailFile>,
}
