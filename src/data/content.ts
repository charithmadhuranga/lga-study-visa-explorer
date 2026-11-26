/**
 * LGA company and country content, ported verbatim from reference/index.html
 * (search `LGA content` there). This is the only place static copy lives —
 * counts, fees and dates always come from the active catalogue bundle.
 *
 * Visa and work rules were checked November 2026 (source noted per country);
 * review before each intake, exactly as the reference README instructs.
 */

import type { CountryId, LevelIndex } from './types';

/** Contact details, one field each so screens can lay them out with icons. */
export const CONTACT_DETAILS = {
  phone: '+94 71 722 5223',
  email: 'admin@lgavisa.com',
  web: 'lgavisa.com',
  address: '1st Floor, 464 High Level Road, Nugegoda',
} as const;

/** The single-line form (reference verbatim) used in the copied shortlist summary. */
export const CONTACT = [
  CONTACT_DETAILS.phone,
  CONTACT_DETAILS.email,
  CONTACT_DETAILS.web,
  CONTACT_DETAILS.address,
].join(' · ');

export const CUR: Record<CountryId, string> = {
  uk: '£',
  australia: 'A$',
  canada: 'C$',
  'new-zealand': 'NZ$',
  usa: 'US$',
};

export const FXK: Record<CountryId, string> = {
  uk: 'GBP',
  australia: 'AUD',
  canada: 'CAD',
  'new-zealand': 'NZD',
  usa: 'USD',
};

/** Fields whose US OPT STEM extension applies */
export const STEM = [
  'Computing & IT',
  'Data & Analytics',
  'Engineering & Construction',
  'Science & Environment',
];

export interface Fact {
  /** Big number, e.g. "18 months" */
  0: string;
  /** Explanation under it */
  1: string;
}

export interface CountryContent {
  id: CountryId;
  name: string;
  /** Phrasing used after "Why …" and inside breadcrumbs */
  short: string;
  tag: string;
  facts: [string, string][];
  why: [string, string][];
  cities: string[];
  visa: string[];
  faq: [string, string][];
  /** Official source named in the footnote */
  src: string;
}

export const COUNTRIES: CountryContent[] = [
  {
    id: 'uk',
    name: 'United Kingdom',
    short: 'the UK',
    tag: 'World-renowned degrees, including fast-track one-year master’s',
    facts: [
      [
        '18 months',
        'Graduate Route for bachelor’s & master’s, applications from 1 Jan 2027 (3 years for PhD)',
      ],
      ['Sep & Jan', 'Main intakes at most universities'],
      ['20 hrs / week', 'Work limit during term time'],
      ['1 year', 'Typical taught master’s'],
    ],
    why: [
      [
        '1-year master’s degrees',
        'Save a full year of tuition and living costs compared to most other countries.',
      ],
      [
        'Home of world rankings',
        'Oxford, Cambridge, Imperial and dozens more globally celebrated institutions.',
      ],
      [
        'Graduate Route',
        'Stay and work after graduating with no job offer needed: 2 years if you apply by 31 Dec 2026, 18 months from 1 Jan 2027 (3 years for PhD).',
      ],
      [
        'Gateway to Europe',
        'Short flights and rail links make exploring Europe part of student life.',
      ],
    ],
    cities: ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Edinburgh', 'Sheffield'],
    visa: [
      'Accept your offer and receive your CAS (Confirmation of Acceptance for Studies)',
      'Hold tuition and living costs for 28 consecutive days before applying',
      'Tuberculosis test and approved English test where required',
      'Apply online, then give biometrics at the visa application centre',
    ],
    faq: [
      [
        'What is a CAS?',
        'An electronic reference from your university, issued after you accept your offer, required for the visa application.',
      ],
      [
        'Can dependants come with me?',
        'Since 2024, generally only students on research postgraduate programmes (PhD) and government-funded courses. We advise based on your course.',
      ],
      [
        'Is IELTS mandatory?',
        'Many universities accept PTE or other tests, but some routes need a UKVI-approved test. We check your exact requirement.',
      ],
    ],
    src: 'GOV.UK: Student visa, Graduate visa',
  },
  {
    id: 'australia',
    name: 'Australia',
    short: 'Australia',
    tag: 'Globally ranked education, great lifestyle and up to 3 years of post-study work',
    facts: [
      ['2–3 years', 'Post-study work (subclass 485), by qualification'],
      ['Feb & Jul', 'Major intakes (+ Nov at some universities)'],
      ['48 hrs / fortnight', 'Work limit during study'],
      ['AUD 2,500', 'Student visa (500) fee from 1 July 2026'],
    ],
    why: [
      [
        '7 of the world’s top 100 universities',
        'Group of Eight institutions lead research in medicine, engineering and business.',
      ],
      [
        'Work while you learn',
        'Up to 48 hours per fortnight during term: income and local experience.',
      ],
      [
        'Long post-study runway',
        'The Temporary Graduate visa (485) usually gives 2–3 years, depending on your qualification.',
      ],
      [
        'Safe & multicultural',
        'Large Sri Lankan student communities in Sydney, Melbourne and Adelaide.',
      ],
    ],
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Adelaide', 'Perth', 'Gold Coast'],
    visa: [
      'Accept your offer and receive your Confirmation of Enrolment (CoE)',
      'Prepare Genuine Student answers and financial evidence',
      'Arrange Overseas Student Health Cover (OSHC)',
      'Lodge the Student visa (subclass 500) online in ImmiAccount',
    ],
    faq: [
      [
        'Can my spouse or children join me?',
        'Since 2024, dependants are generally limited to students in research master’s and PhD courses. We check the rules for your course.',
      ],
      [
        'How long does the visa take?',
        'It varies by season, volume and how complete your file is. Home Affairs publishes estimates but never guarantees a date.',
      ],
    ],
    src: 'Department of Home Affairs: subclass 500 and 485',
  },
  {
    id: 'canada',
    name: 'Canada',
    short: 'Canada',
    tag: 'Quality education, welcoming communities and clear pathways to residency',
    facts: [
      ['Up to 3 years', 'Post-Graduation Work Permit (PGWP)'],
      ['Jan · May · Sep', 'Winter, summer & fall intakes'],
      ['24 hrs / week', 'Off-campus work during term'],
      ['No PAL needed', 'Master’s & PhD at public institutions (from 1 Jan 2026)'],
    ],
    why: [
      [
        'Affordable excellence',
        'Lower tuition and living costs than the US, UK or Australia for comparable quality.',
      ],
      [
        'PR-friendly policies',
        'Express Entry and PNP streams reward Canadian graduates with residency routes.',
      ],
      [
        'Co-op & internships',
        'Many programmes include paid co-op placements built into the curriculum.',
      ],
      ['Safe & inclusive', 'Consistently ranked among the safest, most multicultural countries.'],
    ],
    cities: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary', 'Halifax'],
    visa: [
      'Receive a Letter of Acceptance from a designated learning institution (DLI)',
      'Get a Provincial Attestation Letter (PAL) if your programme needs one',
      'Show proof of funds (often with a GIC)',
      'Apply online and give biometrics',
    ],
    faq: [
      [
        'Can I get PR after studying?',
        'Many graduates get a PGWP, then apply through Express Entry or a Provincial Nominee Program. Eligibility depends on your institution and course, so we check before you commit.',
      ],
      [
        'College or university?',
        'Colleges offer hands-on diplomas; universities offer degrees. Both can lead to a PGWP if you meet current rules.',
      ],
      [
        'Is SDS still available?',
        'No. The Student Direct Stream was discontinued in November 2024.',
      ],
    ],
    src: 'IRCC: study permit, PGWP, 2026 cap notice',
  },
  {
    id: 'new-zealand',
    name: 'New Zealand',
    short: 'New Zealand',
    tag: 'Practical, industry-linked education in one of the world’s safest countries',
    facts: [
      ['Up to 3 years', 'Post-study work visa, by qualification'],
      ['Feb & Jul', 'Main intakes at most institutions'],
      ['25 hrs / week', 'Work during term, full-time in breaks (from 3 Nov 2025)'],
      ['8 universities', 'All rank among the top 3% worldwide'],
    ],
    why: [
      [
        'Globally respected system',
        'All eight New Zealand universities rank among the top 3% worldwide.',
      ],
      ['Safety first', 'Consistently ranked among the world’s most peaceful countries.'],
      [
        'Skills shortage lists',
        'IT, healthcare, engineering and construction graduates are in demand.',
      ],
      ['Nature at your doorstep', 'Beaches, mountains and adventure sports within weekend reach.'],
    ],
    cities: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Dunedin', 'Palmerston North'],
    visa: [
      'Receive your Offer of Place',
      'Pay first-year tuition or show evidence of payment',
      'Show funds for living costs',
      'Apply for a Fee Paying Student Visa online',
    ],
    faq: [
      [
        'Are scholarships available?',
        'Yes. Universities offer merit-based tuition discounts and some government scholarships. We match you to what you qualify for.',
      ],
      [
        'Can I work full-time in breaks?',
        'Most tertiary students on a full-time course of one academic year or longer can work full-time during scheduled holidays.',
      ],
      [
        'Is there a visa interview?',
        'Rarely. Assessment is mostly on paper; complete files rarely face issues.',
      ],
    ],
    src: 'Immigration New Zealand: student visas, work rights (Nov 2025)',
  },
  {
    id: 'usa',
    name: 'United States',
    short: 'the USA',
    tag: 'World-leading universities, research opportunities and flexible career paths',
    facts: [
      ['12 + 24 months', 'OPT work, plus 24 months for STEM degrees'],
      ['Aug & Jan', 'Fall & spring intakes'],
      ['20 hrs / week', 'On-campus work during term'],
      ['F-1', 'Student visa, interview in Colombo'],
    ],
    why: [
      ['Top-ranked institutions', 'Home to many of the world’s highest-ranked universities.'],
      [
        'Flexible academics',
        'Combine majors, switch paths and choose from thousands of electives.',
      ],
      [
        'Funding & assistantships',
        'Graduate students can access TA/RA positions covering tuition plus a stipend.',
      ],
      ['Career powerhouse', 'Internships (CPT) and OPT open doors to leading employers.'],
    ],
    cities: ['Boston', 'New York', 'Chicago', 'San Francisco', 'Austin', 'Seattle'],
    visa: [
      'Receive your I-20 from the university',
      'Pay the SEVIS fee and complete the DS-160',
      'Attend the F-1 interview at the US Embassy in Colombo',
      'Show funding for at least the first year',
    ],
    faq: [
      [
        'How hard is the F-1 interview?',
        'A 2–5 minute conversation about your study plans, funding and intent to return home. Our mock interviews prepare you for it.',
      ],
      [
        'Can I get scholarships?',
        'Merit awards at private universities and graduate assistantships can cut costs a lot. We find realistic options in your shortlist.',
      ],
      [
        'Community college first?',
        'A budget route: 2 years at a community college, then transfer into a university’s third year.',
      ],
    ],
    src: 'U.S. Department of State, Study in the States',
  },
];

export const SERVICES: [string, string[]][] = [
  [
    'University admissions',
    [
      'Course and university shortlisting',
      'Applications and offer-letter follow-up',
      'Statements of purpose & Genuine Student guidance',
    ],
  ],
  [
    'Student visas',
    [
      'One-on-one visa consultations',
      'Financial documents and interview preparation',
      'Refusal reviews, appeals and pre-departure support',
    ],
  ],
  [
    'IELTS & PTE classes',
    [
      'In-house classes in Nugegoda and online',
      'Exam-style practice with feedback',
      'Mock tests to reach your target score',
    ],
  ],
];

export const WHY: [string, string][] = [
  [
    'Visa refusal specialists',
    'Refused before? We review the refusal letter line by line and rebuild a stronger application.',
  ],
  [
    'In-house IELTS & PTE',
    'Our own classes in Nugegoda and online, with exam-style practice and mock tests.',
  ],
  ['400+ institutions', 'Compare bachelor’s, master’s and MBA courses across five destinations.'],
  [
    'Transparent from day one',
    'A free first consultation, and every charge quoted in writing before you commit.',
  ],
];

export const STEPS: [string, string][] = [
  ['Free consultation', 'Ambitions, budget and timelines, with an honest feasibility read.'],
  ['Shortlist & apply', 'Polished applications to your best-fit universities.'],
  ['Receive offer', 'We follow up until you hold an offer letter.'],
  ['Financials & visa file', 'Tuition payment, funds arrangement and visa lodgement.'],
  ['Interview & decision', 'Mock interviews where required.'],
  ['Fly with confidence', 'Pre-departure briefing and support while you study.'],
];

export const DOCS: [string, string[]][] = [
  [
    'Academic documents',
    [
      'O/L & A/L certificates (or degree transcripts)',
      'English test score (IELTS / PTE / TOEFL)',
      'Passport valid beyond the course end date',
      'CV / work experience letters',
      'Statement of purpose (we refine it)',
      'Two reference letters',
    ],
  ],
  [
    'Financial documents',
    [
      'Bank statements / fixed deposits (typically a 28-day history)',
      'Sponsor letter & income proof',
      'Education loan approval (if applicable)',
      'GIC / tuition payment receipts (Canada)',
      'Property / asset valuations (supporting)',
      'CA statement summarising funds',
    ],
  ],
];

export interface PostStudyWork {
  headline: string;
  note: string;
}

/**
 * Post-study work rights shown on a course page — ported from `psw()` in the reference.
 * `level` is the schema-v2 level index, `field` the course field name.
 */
export function postStudyWork(country: CountryId, level: LevelIndex, field: string): PostStudyWork {
  if (country === 'uk') {
    return {
      headline: 'Graduate Route: 18 months',
      note: 'For applications from 1 Jan 2027. Apply by 31 Dec 2026 for 2 years.',
    };
  }
  if (country === 'australia') {
    return {
      headline: '485 visa: up to 2 years',
      note: 'Bachelor’s and coursework master’s. Research degrees can receive longer.',
    };
  }
  if (country === 'canada') {
    return level === 0
      ? {
          headline: 'PGWP: up to 3 years',
          note: 'Length follows programme length. Degree programmes are eligible in any field.',
        }
      : {
          headline: 'PGWP: up to 3 years',
          note: 'Master’s graduates of eligible programmes can receive 3 years.',
        };
  }
  if (country === 'new-zealand') {
    return {
      headline: 'Post-study work visa: up to 3 years',
      note: 'For bachelor’s and master’s qualifications studied in New Zealand.',
    };
  }
  return STEM.includes(field)
    ? {
        headline: 'OPT: 12 months + 24 for STEM',
        note: 'The 24-month extension applies if the programme is STEM-designated.',
      }
    : { headline: 'OPT: 12 months', note: 'Practical training after graduation on your F-1 visa.' };
}
