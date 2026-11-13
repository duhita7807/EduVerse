import openpyxl, json, re, sys
from datetime import datetime
from collections import Counter

SRC = '/mnt/user-data/uploads/1790924166852_Students-Data_TNP.xlsx'
TODAY_YEAR = 2026  # per system date Oct 2026

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb['Students List']
headers = [c.value for c in ws[1]]
idx = {h: i for i, h in enumerate(headers)}

def cell(row, name):
    v = ws.cell(row=row, column=idx[name] + 1).value
    if v is None:
        return None
    v = str(v).strip()
    return None if v == '' or v.upper() == 'NA' else v

# ---------- Skill categorization ----------
PROGRAMMING = {'python','java','c++','c','c#','javascript','typescript','r','go','golang','ruby','php','kotlin','swift','scala','rust','matlab','dart','perl','sql','html','css'}
WEB = {'react','react.js','reactjs','angular','vue','vue.js','node.js','nodejs','express.js','express','django','flask','spring','spring boot','next.js','bootstrap','tailwind','jquery','laravel','asp.net','fastapi','webdev','web development'}
DATABASES = {'mongodb','mysql','postgresql','postgres','sqlite','oracle','firebase','redis','cassandra','mariadb','database sql','dbms','sql fundamentals'}
TOOLS = {'git','github','docker','kubernetes','aws','azure','gcp','jenkins','jira','postman','figma','linux','excel','power bi','powerbi','tableau','deployment','ci/cd','vs code','android studio'}

def categorize(tokens):
    out = {'programmingLanguages': set(), 'webTechnologies': set(), 'databases': set(), 'tools': set()}
    for t in tokens:
        t = t.strip()
        if not t:
            continue
        key = t.lower()
        if key in PROGRAMMING:
            out['programmingLanguages'].add(t)
        elif key in WEB:
            out['webTechnologies'].add(t)
        elif key in DATABASES:
            out['databases'].add(t)
        elif key in TOOLS:
            out['tools'].add(t)
        else:
            out['tools'].add(t)  # unrecognized tokens kept as general tools/skills, not dropped
    return {k: sorted(v) for k, v in out.items()}

def split_tokens(raw):
    if not raw:
        return []
    return [p.strip() for p in re.split(r'[;,]', raw) if p.strip()]

# ---------- Field parsers ----------
def parse_year(admission_year_raw):
    if not admission_year_raw or not admission_year_raw.isdigit():
        return None  # resolved later via fallback
    yr = TODAY_YEAR - int(admission_year_raw) + 1
    yr = max(1, min(4, yr))
    return f"{['1st','2nd','3rd','4th'][yr-1]} Year"

def parse_certifications(raw):
    if not raw:
        return []
    out = []
    for entry in raw.split(';'):
        entry = entry.strip()
        if not entry:
            continue
        parts = [p.strip() for p in entry.split(' - ')]
        if len(parts) < 2:
            continue
        marks_raw = parts[-1]
        provider = parts[-2] if len(parts) >= 2 else ''
        title = ' - '.join(parts[:-2]) if len(parts) > 2 else parts[0]
        if not title:
            continue
        out.append({'title': title[:200], 'issuedBy': (provider or '')[:150] if provider.upper() != 'NA' else ''})
    return out

DATE_DUR_RE = re.compile(r'(\d{4}-\d{2}-\d{2})\s*to\s*(\d{4}-\d{2}-\d{2})\s*\[([^\]]*)\]')

def parse_internships(raw_parts):
    out = []
    for raw in raw_parts:
        if not raw:
            continue
        for entry in raw.split(';'):
            entry = entry.strip()
            if not entry:
                continue
            m = re.match(r'^(.*?)\s*\(', entry)
            company = m.group(1).strip() if m else entry.split('(')[0].strip()
            if not company:
                continue
            dm = DATE_DUR_RE.search(entry)
            start_date = dm.group(1) if dm else None
            end_date = dm.group(2) if dm else None
            duration = dm.group(3) if dm else None
            out.append({
                'company': company[:200],
                'startDate': start_date,
                'endDate': end_date,
                'description': f"{duration} internship (from placement records)." if duration else '',
            })
    return out

def parse_projects(names_raw, skills_raw):
    if not names_raw:
        return []
    titles = [t.strip() for t in names_raw.split(';') if t.strip()]
    seen = set()
    tech = []
    for t in split_tokens(skills_raw):
        key = t.lower()
        if key not in seen:
            seen.add(key)
            tech.append(t)
    return [{'title': t[:200], 'technologies': tech[:15]} for t in titles]

def extract_github_username(url):
    if not url:
        return ''
    m = re.search(r'github\.com/([A-Za-z0-9\-_.]+)', url)
    return m.group(1).rstrip('/') if m else ''

# ---------- Build records ----------
records = []
skipped = []
year_fallback_count = 0
computed_years = []

# First pass: compute years where possible, to find the fallback mode
for r in range(2, ws.max_row + 1):
    y = parse_year(cell(r, 'Admission Year'))
    if y:
        computed_years.append(y)
fallback_year = Counter(computed_years).most_common(1)[0][0] if computed_years else "3rd Year"

for r in range(2, ws.max_row + 1):
    first = cell(r, 'First Name') or ''
    middle = cell(r, 'Middle Name') or ''
    last = cell(r, 'Last Name') or ''
    name = ' '.join(p for p in [first, middle, last] if p)
    email = cell(r, 'College/Official Email')
    roll = cell(r, 'Unique ID')
    college = cell(r, 'Campus')
    branch = cell(r, 'Degree 1 Primary Specializations')

    if not (name and email and roll and college and branch):
        skipped.append({'row': r, 'reason': 'missing required field', 'name': name, 'email': email})
        continue

    year = parse_year(cell(r, 'Admission Year'))
    if not year:
        year = fallback_year
        year_fallback_count += 1

    bio = cell(r, 'Career Objective')
    if bio and len(bio) > 300:
        bio = bio[:297] + '...'

    all_skill_tokens = (
        split_tokens(cell(r, 'Key Skills')) +
        split_tokens(cell(r, 'Projects Key Skills')) +
        split_tokens(cell(r, 'Internship Experience - Key Skills'))
    )
    skills = categorize(all_skill_tokens)

    projects = parse_projects(cell(r, 'Projects Name'), cell(r, 'Projects Key Skills'))
    internships = parse_internships([
        cell(r, 'Internship Experience - Organization Name (Industry - Stipend (INR Per Month) - Start date to End date[Duration]) - Mentor Name (Designation - Phone - Email) - Academic Guide Name 1'),
        cell(r, 'Internship Experience - Organization Name (Industry - Stipend (INR Per Month) - Start date to End date[Duration]) - Mentor Name (Designation - Phone - Email) - Academic Guide Name 2'),
        cell(r, 'Remaining Internship Experience - Organization Name (Industry - Stipend (INR Per Month) - Start date to End date[Duration]) - Mentor Name (Designation - Phone - Email) - Academic Guide Name'),
    ])
    certifications = parse_certifications(cell(r, 'Assessments/Certification (Name - Provider - Aggregate Marks)'))

    record = {
        'name': name,
        'email': email.lower(),
        'college': college,
        'branch': branch,
        'year': year,
        'rollNo': roll,
        'bio': bio or '',
        'skills': skills,
        'projects': projects,
        'internships': internships,
        'certifications': certifications,
        'githubUsername': extract_github_username(cell(r, 'Web Links - Github')),
        'linkedinProfile': cell(r, 'Web Links - LinkedIn') or '',
    }
    records.append(record)

# ---------- Dedupe by rollNo (a handful of students appear twice in the
# source with two different personal emails, same roll number) ----------
def completeness(rec):
    return (
        len(rec['bio']) + len(rec['projects']) * 10 + len(rec['internships']) * 10 +
        len(rec['certifications']) * 5 + sum(len(v) for v in rec['skills'].values()) +
        (5 if rec['githubUsername'] else 0) + (5 if rec['linkedinProfile'] else 0)
    )

by_roll = {}
dup_dropped = []
for rec in records:
    existing = by_roll.get(rec['rollNo'])
    if existing is None:
        by_roll[rec['rollNo']] = rec
    elif completeness(rec) > completeness(existing):
        dup_dropped.append(existing['email'])
        by_roll[rec['rollNo']] = rec
    else:
        dup_dropped.append(rec['email'])
records = list(by_roll.values())

print(f"Total rows: {ws.max_row - 1}")
print(f"Duplicate rollNo entries dropped (same student, kept fuller record): {len(dup_dropped)}")
print(f"Mapped records: {len(records)}")
print(f"Skipped (missing required field): {len(skipped)}")
print(f"Year filled via fallback ({fallback_year}): {year_fallback_count}")
print(f"With projects: {sum(1 for r in records if r['projects'])}")
print(f"With internships: {sum(1 for r in records if r['internships'])}")
print(f"With certifications: {sum(1 for r in records if r['certifications'])}")
print(f"With github: {sum(1 for r in records if r['githubUsername'])}")
print(f"With linkedin: {sum(1 for r in records if r['linkedinProfile'])}")
print(f"With any skills: {sum(1 for r in records if any(r['skills'].values()))}")

with open('/home/claude/seed/students.json', 'w') as f:
    json.dump(records, f, indent=2)

with open('/home/claude/seed/skipped.json', 'w') as f:
    json.dump(skipped, f, indent=2)

print("\nSample record:")
print(json.dumps(records[5], indent=2)[:1500])
