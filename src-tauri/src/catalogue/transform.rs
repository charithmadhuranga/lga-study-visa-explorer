//! Upstream → schema v2 transform (SPEC §8.3): a rule-for-rule port of
//! `reference/tools/build_data.py`, minus image processing.
//!
//! Deterministic by construction: the caller passes `today` (no clock reads in here) and all
//! maps are ordered, so the same input always produces byte-identical output.
//!
//! One deliberate fix over the reference: a course's summary is filed under its
//! **university's** country — the country the UI loads details for. The reference filed it
//! under the course's own `country`, which hid ~16 summaries (SPEC §12 D14).

use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

use serde::Deserialize;

use super::model::{
    currency_for, Bundle, Catalogue, Counts, Course, DetailFile, Intake, Tags, University,
    UniversityDetail, LEVELS, SCHEMA_VERSION,
};
use super::sanitize::sanitize;

// ---------------------------------------------------------------- upstream input

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpstreamSummary {
    pub generated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpstreamCourses {
    pub generated_at: String,
    pub fx_to_usd: BTreeMap<String, f64>,
    pub fx_date: String,
    pub courses: Vec<UCourse>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UCourse {
    pub key: String,
    pub name: String,
    pub level: String,
    pub field: String,
    pub university_id: String,
    #[serde(default)]
    pub city: Option<String>,
    #[serde(default)]
    pub province: Option<String>,
    #[serde(default)]
    pub cities: Option<Vec<Option<String>>>,
    #[serde(default)]
    pub tuition_per_year: Option<f64>,
    #[serde(default)]
    pub application_fee: Option<f64>,
    #[serde(default)]
    pub duration_months: Option<Vec<f64>>,
    #[serde(default)]
    pub intakes: Option<Vec<UIntake>>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub summary_html: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UIntake {
    #[serde(default)]
    pub start: Option<String>,
    #[serde(default)]
    pub deadline: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpstreamUniversities {
    pub universities: Vec<UUniversity>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UUniversity {
    pub id: String,
    pub name: String,
    pub country: String,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default, rename = "type")]
    pub kind: Option<String>,
    #[serde(default)]
    pub founded: Option<serde_json::Value>,
    #[serde(default)]
    pub logo_url: Option<String>,
    #[serde(default)]
    pub website: Option<String>,
    #[serde(default)]
    pub students: Option<f64>,
    #[serde(default)]
    pub can_work_and_study: Option<bool>,
    #[serde(default)]
    pub coop_participating: Option<bool>,
    #[serde(default)]
    pub on_campus_housing: Option<bool>,
    #[serde(default)]
    pub typical_duration: Option<Vec<ULabelValue>>,
    #[serde(default)]
    pub about_text: Option<String>,
    #[serde(default)]
    pub about_html: Option<String>,
    #[serde(default)]
    pub accommodation_html: Option<String>,
    #[serde(default)]
    pub curated: Option<bool>,
    #[serde(default)]
    pub course_count: Option<u64>,
    #[serde(default)]
    pub location: Option<ULocation>,
    #[serde(default)]
    pub campuses: Option<Vec<ULocation>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ULabelValue {
    pub label: String,
    pub value: String,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct ULocation {
    #[serde(default)]
    pub city: Option<String>,
    #[serde(default)]
    pub province: Option<String>,
}

// ---------------------------------------------------------------- errors

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum TransformError {
    #[error("upstream has no courses")]
    NoCourses,
    #[error("upstream has no universities with courses")]
    NoUniversities,
    #[error("fxToUsd.USD must be 1.0, got {0}")]
    BadUsdRate(String),
    #[error("course {key} references unknown university {university}")]
    UnknownUniversity { key: String, university: String },
    #[error("course {key} has unknown level {level:?}")]
    UnknownLevel { key: String, level: String },
    #[error("university {id} has unknown country {country:?}")]
    UnknownCountry { id: String, country: String },
    #[error("duplicate course key {0}")]
    DuplicateKey(String),
}

/// SPEC §8.1 "Validate": everything that would make the bundle unusable or misleading.
pub fn validate(
    courses: &UpstreamCourses,
    unis: &UpstreamUniversities,
) -> Result<(), TransformError> {
    if courses.courses.is_empty() {
        return Err(TransformError::NoCourses);
    }
    match courses.fx_to_usd.get("USD") {
        Some(v) if (*v - 1.0).abs() < f64::EPSILON => {}
        other => return Err(TransformError::BadUsdRate(format!("{other:?}"))),
    }
    let known: HashSet<&str> = unis.universities.iter().map(|u| u.id.as_str()).collect();
    for u in &unis.universities {
        if currency_for(&u.country).is_none() {
            return Err(TransformError::UnknownCountry {
                id: u.id.clone(),
                country: u.country.clone(),
            });
        }
    }
    let mut keys = HashSet::new();
    for c in &courses.courses {
        if !known.contains(c.university_id.as_str()) {
            return Err(TransformError::UnknownUniversity {
                key: c.key.clone(),
                university: c.university_id.clone(),
            });
        }
        if !LEVELS.contains(&c.level.as_str()) {
            return Err(TransformError::UnknownLevel {
                key: c.key.clone(),
                level: c.level.clone(),
            });
        }
        if !keys.insert(c.key.as_str()) {
            return Err(TransformError::DuplicateKey(c.key.clone()));
        }
    }
    Ok(())
}

// ---------------------------------------------------------------- the transform

/// Main-campus city/region for featured universities whose scraped record has no location
/// (`LOCFIX` in build_data.py, verbatim).
const LOCFIX: &[(&str, &str, &str)] = &[
    (
        "Australian National University",
        "Canberra",
        "Australian Capital Territory",
    ),
    ("Monash University", "Melbourne", "Victoria"),
    ("University of Melbourne", "Melbourne", "Victoria"),
    ("University of Queensland", "Brisbane", "Queensland"),
    ("University of Sydney", "Sydney", "New South Wales"),
    ("McMaster University", "Hamilton", "Ontario"),
    (
        "University of British Columbia",
        "Vancouver",
        "British Columbia",
    ),
    ("University of Toronto", "Toronto", "Ontario"),
    (
        "Massey University",
        "Palmerston North",
        "Manawatū-Whanganui",
    ),
    ("University of Auckland", "Auckland", "Auckland"),
    ("University of Canterbury", "Christchurch", "Canterbury"),
    ("University of Otago", "Dunedin", "Otago"),
    ("Imperial College London", "London", "Greater London"),
    ("King's College London", "London", "Greater London"),
    ("University of Glasgow", "Glasgow", "Scotland"),
    ("University of Manchester", "Manchester", "North West"),
    ("Stanford University", "Stanford", "California"),
    (
        "University of California, Berkeley",
        "Berkeley",
        "California",
    ),
    (
        "University of Illinois Urbana-Champaign",
        "Urbana-Champaign",
        "Illinois",
    ),
];

fn fix_typo(s: &mut Option<String>) {
    if s.as_deref() == Some("Camrbridge") {
        *s = Some("Cambridge".into());
    }
}

fn non_empty(s: &Option<String>) -> Option<&str> {
    s.as_deref().filter(|v| !v.is_empty())
}

/// Python `re.sub(r'\s+', ' ', t).strip()` then the 230-character sentence cut.
pub fn first_sentences(text: &str, n: usize) -> String {
    let t = text.split_whitespace().collect::<Vec<_>>().join(" ");
    let chars: Vec<char> = t.chars().collect();
    if chars.len() <= n {
        return t;
    }
    let cut: String = chars[..n].iter().collect();
    if let Some(dot) = cut.rfind(". ") {
        if cut[..dot].chars().count() > 80 {
            return cut[..=dot].to_string();
        }
    }
    match cut.rfind(' ') {
        Some(space) => format!("{}…", &cut[..space]),
        None => format!("{cut}…"),
    }
}

/// `today` is `YYYY-MM-DD`; `photos` is the set of university ids that have a bundled campus
/// photo (`None` = unknown, e.g. in dev — every id gets a path and the UI falls back if absent).
pub fn transform(
    upstream_courses: &UpstreamCourses,
    upstream_unis: &UpstreamUniversities,
    today: &str,
    photos: Option<&HashSet<String>>,
) -> Result<Bundle, TransformError> {
    validate(upstream_courses, upstream_unis)?;

    // Work on copies: rules 2–3 mutate.
    let mut courses = upstream_courses.courses.clone();
    let mut unis = upstream_unis.universities.clone();

    // Rule 2: the source typo, on courses and campuses.
    for c in &mut courses {
        fix_typo(&mut c.city);
        if let Some(list) = &mut c.cities {
            for x in list.iter_mut() {
                fix_typo(x);
            }
        }
    }
    for u in &mut unis {
        if let Some(loc) = &mut u.location {
            fix_typo(&mut loc.city);
        }
        if let Some(list) = &mut u.campuses {
            for x in list.iter_mut() {
                fix_typo(&mut x.city);
            }
        }
        // Rule 3: LOCFIX.
        let has_city = u
            .location
            .as_ref()
            .and_then(|l| non_empty(&l.city))
            .is_some();
        if !has_city {
            if let Some((_, city, prov)) = LOCFIX.iter().find(|(n, _, _)| *n == u.name) {
                u.location = Some(ULocation {
                    city: Some((*city).into()),
                    province: Some((*prov).into()),
                });
            }
        }
    }

    // Rule 8: levels fixed; fields sorted with "Other" last (over every upstream course).
    let mut fields: Vec<String> = courses
        .iter()
        .map(|c| c.field.clone())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect();
    fields.sort_by_key(|f| (f == "Other", f.clone()));

    let mut by_uni: HashMap<&str, Vec<&UCourse>> = HashMap::new();
    for c in &courses {
        by_uni.entry(c.university_id.as_str()).or_default().push(c);
    }

    // Universities sorted by (country, name); rule 1 drops those without courses.
    let mut order: Vec<&UUniversity> = unis.iter().collect();
    order.sort_by(|a, b| (&a.country, &a.name).cmp(&(&b.country, &b.name)));

    let mut details: BTreeMap<String, DetailFile> = BTreeMap::new();
    let mut universities: Vec<University> = Vec::new();
    let mut country_of: HashMap<&str, &str> = HashMap::new();

    for u in order {
        if u.course_count.unwrap_or(0) == 0 {
            continue;
        }
        let mine: &[&UCourse] = by_uni.get(u.id.as_str()).map_or(&[], Vec::as_slice);
        let loc = u.location.clone().unwrap_or_default();
        let mut city = non_empty(&loc.city).map(str::to_string);
        let mut province = loc.province.clone();

        let mut campuses: Vec<String> = u
            .campuses
            .iter()
            .flatten()
            .filter_map(|x| non_empty(&x.city).map(str::to_string))
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect();

        // Rule 4: fall back to the cities its courses are taught in.
        if city.is_none() || campuses.is_empty() {
            if city.is_none() {
                if let Some((c, p)) = most_common_location(mine) {
                    city = Some(c);
                    province = p;
                }
            }
            if campuses.is_empty() {
                campuses = mine
                    .iter()
                    .flat_map(|c| match &c.cities {
                        Some(list) if !list.is_empty() => list.clone(),
                        _ => vec![c.city.clone()],
                    })
                    .flatten()
                    .filter(|x| !x.is_empty())
                    .collect::<BTreeSet<_>>()
                    .into_iter()
                    .collect();
            }
        }
        if campuses.is_empty() {
            if let Some(c) = &city {
                campuses = vec![c.clone()];
            }
        }

        let accommodation = sanitize(u.accommodation_html.as_deref().unwrap_or(""));
        let photo = match photos {
            Some(set) if !set.contains(&u.id) => String::new(),
            _ => format!("img/uni/{}.webp", u.id),
        };

        universities.push(University {
            id: u.id.clone(),
            name: u.name.clone(),
            country: u.country.clone(),
            category: u.category.clone().unwrap_or_default(),
            kind: u.kind.clone().unwrap_or_default(),
            founded: founded_string(u.founded.as_ref()),
            city: city.unwrap_or_default(),
            province: province.unwrap_or_default(),
            campuses,
            logo_url: u.logo_url.clone().unwrap_or_default(),
            photo,
            website: u.website.clone().unwrap_or_default(),
            students: u.students.unwrap_or(0.0),
            can_work: u.can_work_and_study.unwrap_or(false),
            coop: u.coop_participating.unwrap_or(false),
            housing: u.on_campus_housing.unwrap_or(false),
            durations: u
                .typical_duration
                .iter()
                .flatten()
                .map(|d| format!("{}: {}", d.label, d.value))
                .collect(),
            about: first_sentences(u.about_text.as_deref().unwrap_or(""), 230),
            accommodation: accommodation.clone(),
            featured: u.curated.unwrap_or(false),
            course_count: 0,
        });
        country_of.insert(u.id.as_str(), u.country.as_str());
        details
            .entry(u.country.clone())
            .or_insert_with(|| DetailFile {
                country: u.country.clone(),
                ..DetailFile::default()
            })
            .universities
            .insert(
                u.id.clone(),
                UniversityDetail {
                    about: sanitize(u.about_html.as_deref().unwrap_or("")),
                    accommodation,
                },
            );
    }

    if universities.is_empty() {
        return Err(TransformError::NoUniversities);
    }
    let index: HashMap<String, usize> = universities
        .iter()
        .enumerate()
        .map(|(i, u)| (u.id.clone(), i))
        .collect();

    let mut out_courses = Vec::new();
    let mut by_country: BTreeMap<String, usize> = BTreeMap::new();

    for c in &courses {
        let Some(&ui) = index.get(&c.university_id) else {
            continue; // university dropped by rule 1
        };
        let country = country_of[c.university_id.as_str()].to_string();
        universities[ui].course_count += 1;
        *by_country.entry(country.clone()).or_default() += 1;

        // Rule 6: upcoming intakes only, sorted by their `start|deadline` encoding.
        let mut intakes: Vec<(String, Intake)> = c
            .intakes
            .iter()
            .flatten()
            .filter_map(|i| {
                let start = i.start.clone().filter(|s| !s.is_empty())?;
                if start.as_str() < today {
                    return None;
                }
                match i.deadline.as_deref() {
                    None => Some((
                        start.clone(),
                        Intake {
                            start,
                            deadline: None,
                        },
                    )),
                    Some(d) if d == start => Some((
                        start.clone(),
                        Intake {
                            start,
                            deadline: None,
                        },
                    )),
                    Some(d) => Some((
                        format!("{start}|{d}"),
                        Intake {
                            deadline: (!d.is_empty()).then(|| d.to_string()),
                            start,
                        },
                    )),
                }
            })
            .collect();
        intakes.sort_by(|a, b| a.0.cmp(&b.0));

        let tags = c.tags.as_deref().unwrap_or(&[]);
        let dm = c.duration_months.as_deref().unwrap_or(&[]);
        let min = dm.iter().copied().fold(f64::INFINITY, f64::min);
        let max = dm.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        let fee = c.tuition_per_year.unwrap_or(0.0);
        let level = LEVELS.iter().position(|l| *l == c.level).ok_or_else(|| {
            TransformError::UnknownLevel {
                key: c.key.clone(),
                level: c.level.clone(),
            }
        })?;

        out_courses.push(Course {
            key: c.key.clone(),
            name: c.name.clone(),
            university_id: c.university_id.clone(),
            country: country.clone(),
            level,
            field: c.field.clone(),
            tuition_per_year: fee,
            currency: (fee != 0.0)
                .then(|| currency_for(&country).map(str::to_string))
                .flatten(),
            application_fee: c.application_fee.unwrap_or(0.0),
            duration_months: if dm.is_empty() {
                [0.0, 0.0]
            } else {
                [min, max]
            },
            intakes: intakes.into_iter().map(|(_, i)| i).collect(),
            tags: Tags {
                scholarship: tags.iter().any(|t| t == "scholarship"),
                coop: tags.iter().any(|t| t == "coop"),
                pathway: tags.iter().any(|t| t == "pathway"),
            },
            city: c.city.clone().unwrap_or_default(),
            province: c.province.clone().unwrap_or_default(),
        });

        let summary = sanitize(c.summary_html.as_deref().unwrap_or(""));
        if !summary.is_empty() {
            if let Some(detail) = details.get_mut(&country) {
                detail.courses.insert(c.key.clone(), summary);
            }
        }
    }

    let counts = Counts {
        universities: universities.len(),
        courses: out_courses.len(),
        by_country,
    };

    Ok(Bundle {
        catalogue: Catalogue {
            schema_version: SCHEMA_VERSION,
            built: today.to_string(),
            source_generated_at: upstream_courses.generated_at.clone(),
            fx_date: upstream_courses.fx_date.clone(),
            fx: upstream_courses.fx_to_usd.clone(),
            levels: LEVELS.iter().map(|l| (*l).to_string()).collect(),
            fields,
            counts,
            universities,
            courses: out_courses,
        },
        details,
    })
}

/// `Counter((city, province)).most_common(1)` — ties go to the first seen, like Python.
fn most_common_location(mine: &[&UCourse]) -> Option<(String, Option<String>)> {
    let mut seen: Vec<((String, Option<String>), usize)> = Vec::new();
    for c in mine {
        let Some(city) = non_empty(&c.city) else {
            continue;
        };
        let key = (city.to_string(), c.province.clone());
        match seen.iter_mut().find(|(k, _)| *k == key) {
            Some((_, n)) => *n += 1,
            None => seen.push((key, 1)),
        }
    }
    let best = seen.iter().map(|(_, n)| *n).max()?;
    seen.into_iter().find(|(_, n)| *n == best).map(|(k, _)| k)
}

fn founded_string(v: Option<&serde_json::Value>) -> String {
    match v {
        Some(serde_json::Value::String(s)) => s.clone(),
        Some(serde_json::Value::Number(n)) => n.to_string(),
        _ => String::new(),
    }
}

// ---------------------------------------------------------------- tests

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn courses(list: serde_json::Value) -> UpstreamCourses {
        serde_json::from_value(json!({
            "generatedAt": "2026-11-22T15:11:57Z",
            "fxToUsd": { "USD": 1.0, "GBP": 1.3 },
            "fxDate": "2026-11",
            "courses": list
        }))
        .unwrap()
    }

    fn unis(list: serde_json::Value) -> UpstreamUniversities {
        serde_json::from_value(json!({ "universities": list })).unwrap()
    }

    fn uni(id: &str, name: &str, count: u64) -> serde_json::Value {
        json!({
            "id": id, "name": name, "country": "uk", "category": "University", "type": "Public",
            "founded": "1900", "logoUrl": "https://logo", "students": null,
            "canWorkAndStudy": true, "coopParticipating": null, "onCampusHousing": false,
            "typicalDuration": [{ "label": "Average graduate program", "value": "One Year" }],
            "aboutText": "Short about.", "aboutHtml": "<p>About <script>x</script></p>",
            "accommodationHtml": "<h2>Halls</h2>", "curated": false, "courseCount": count,
            "location": { "city": "", "province": null }, "campuses": []
        })
    }

    fn course(key: &str, uni: &str) -> serde_json::Value {
        json!({
            "key": key, "name": "MSc Data", "level": "Master's", "field": "Data & Analytics",
            "universityId": uni, "city": "Camrbridge", "province": "England",
            "cities": ["Camrbridge", "London"], "tuitionPerYear": 20000, "applicationFee": 75.0,
            "durationMonths": [12, 18], "tags": ["scholarship", "top", "pathway"],
            "intakes": [
                { "start": "2027-09-01", "deadline": "2027-09-01" },
                { "start": "2026-01-01", "deadline": null },
                { "start": "2027-01-10", "deadline": "2026-12-01" }
            ],
            "summaryHtml": "<p>Great <b>course</b></p>"
        })
    }

    #[test]
    fn ports_the_reference_rules() {
        let b = transform(
            &courses(json!([course("k1", "u1"), course("k2", "u1")])),
            &unis(json!([uni("u1", "Uni One", 2), uni("u0", "Empty Uni", 0)])),
            "2026-11-23",
            None,
        )
        .unwrap();
        let c = &b.catalogue;
        assert_eq!(
            c.counts.universities, 1,
            "rule 1 drops universities with no courses"
        );
        assert_eq!(c.counts.courses, 2);
        assert_eq!(c.counts.by_country.get("uk"), Some(&2));

        let u = &c.universities[0];
        assert_eq!(
            u.city, "Cambridge",
            "rule 2 typo + rule 4 most common course city"
        );
        assert_eq!(u.province, "England");
        assert_eq!(u.campuses, vec!["Cambridge", "London"]);
        assert_eq!(u.course_count, 2);
        assert_eq!(u.durations, vec!["Average graduate program: One Year"]);
        assert_eq!(u.accommodation, "<h4>Halls</h4>");
        assert_eq!(u.photo, "img/uni/u1.webp");

        let k = &c.courses[0];
        assert_eq!(k.level, 1);
        assert_eq!(k.currency.as_deref(), Some("GBP"));
        assert_eq!(k.duration_months, [12.0, 18.0]);
        assert_eq!(
            k.tags,
            Tags {
                scholarship: true,
                coop: false,
                pathway: true
            },
            "rule 7 ignores other tags"
        );
        assert_eq!(
            k.intakes,
            vec![
                Intake {
                    start: "2027-01-10".into(),
                    deadline: Some("2026-12-01".into())
                },
                Intake {
                    start: "2027-09-01".into(),
                    deadline: None
                },
            ],
            "rule 6: past intake dropped, deadline only when different, sorted"
        );

        let d = &b.details["uk"];
        assert_eq!(d.courses["k1"], "<p>Great <b>course</b></p>");
        assert_eq!(d.universities["u1"].about, "<p>About </p>");
    }

    #[test]
    fn locfix_applies_only_when_location_is_missing() {
        let b = transform(
            &courses(json!([course("k1", "u1")])),
            &unis(json!([uni("u1", "University of Glasgow", 1)])),
            "2026-11-23",
            Some(&HashSet::new()),
        )
        .unwrap();
        let u = &b.catalogue.universities[0];
        assert_eq!(
            (u.city.as_str(), u.province.as_str()),
            ("Glasgow", "Scotland")
        );
        assert_eq!(u.photo, "", "no bundled photo for this id");
    }

    #[test]
    fn output_is_deterministic() {
        let run = || {
            let b = transform(
                &courses(json!([course("k1", "u1"), course("k2", "u1")])),
                &unis(json!([uni("u1", "Uni One", 2)])),
                "2026-11-23",
                None,
            )
            .unwrap();
            serde_json::to_string(&b.catalogue).unwrap()
        };
        assert_eq!(run(), run());
        assert!(
            run().contains("\"applicationFee\":75,"),
            "whole numbers written as integers"
        );
    }

    #[test]
    fn validation_rejects_broken_upstream() {
        let ok_unis = unis(json!([uni("u1", "Uni One", 1)]));
        assert_eq!(
            transform(&courses(json!([])), &ok_unis, "2026-11-23", None).unwrap_err(),
            TransformError::NoCourses
        );
        assert!(matches!(
            transform(
                &courses(json!([course("k1", "ghost")])),
                &ok_unis,
                "2026-11-23",
                None
            ),
            Err(TransformError::UnknownUniversity { .. })
        ));
        let mut bad_level = course("k1", "u1");
        bad_level["level"] = json!("PhD");
        assert!(matches!(
            transform(&courses(json!([bad_level])), &ok_unis, "2026-11-23", None),
            Err(TransformError::UnknownLevel { .. })
        ));
        let mut bad_fx = courses(json!([course("k1", "u1")]));
        bad_fx.fx_to_usd.insert("USD".into(), 0.9);
        assert!(matches!(
            transform(&bad_fx, &ok_unis, "2026-11-23", None),
            Err(TransformError::BadUsdRate(_))
        ));
        assert_eq!(
            transform(
                &courses(json!([course("k1", "u1"), course("k1", "u1")])),
                &ok_unis,
                "2026-11-23",
                None
            )
            .unwrap_err(),
            TransformError::DuplicateKey("k1".into())
        );
    }

    #[test]
    fn about_snippet_matches_first_sentences() {
        let long = "A".repeat(90) + ". " + &"b ".repeat(120);
        let s = first_sentences(&long, 230);
        assert_eq!(s, "A".repeat(90) + ".");
        let words = "word ".repeat(60);
        assert!(first_sentences(&words, 230).ends_with("word…"));
        assert_eq!(first_sentences("  short \n text ", 230), "short text");
    }
}
