create table users (
  id uuid primary key,
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table base_resumes (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table target_jobs (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  company text not null,
  role text not null,
  source_url text not null default '',
  description text not null,
  keywords jsonb not null default '[]'::jsonb,
  responsibilities jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table ats_reports (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  resume_version_id uuid not null,
  overall_score integer not null,
  keyword_coverage integer not null,
  matched_keywords jsonb not null default '[]'::jsonb,
  missing_keywords jsonb not null default '[]'::jsonb,
  missing_sections jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  diff_highlights jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table tailored_resume_versions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  base_resume_id uuid not null references base_resumes(id) on delete cascade,
  target_job_id uuid not null references target_jobs(id) on delete cascade,
  ats_report_id uuid not null references ats_reports(id) on delete cascade,
  title text not null,
  resume jsonb not null,
  change_summary jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table ats_reports
  add constraint ats_reports_resume_version_id_fkey
  foreign key (resume_version_id) references tailored_resume_versions(id) on delete cascade deferrable initially deferred;

create table applications (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  resume_version_id uuid not null references tailored_resume_versions(id) on delete cascade,
  target_job_id uuid not null references target_jobs(id) on delete cascade,
  company text not null,
  role text not null,
  source text not null default '',
  status text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
