-- Users table (simple username/password, no Supabase Auth)
create table public.users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password text not null,
  role text not null default 'student' check (role in ('teacher', 'student')),
  created_at timestamptz default now()
);

-- Assignments table
create table public.assignments (
  id text primary key,
  teacher_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  grade integer not null check (grade between 1 and 5),
  questions jsonb not null,
  created_at timestamptz default now()
);

-- Submissions table
create table public.submissions (
  id uuid default gen_random_uuid() primary key,
  assignment_id text references public.assignments(id) on delete cascade not null,
  student_id uuid references public.users(id) on delete cascade not null,
  student_username text not null,
  score integer not null default 0,
  correct_count integer not null default 0,
  total_questions integer not null default 0,
  answers jsonb,
  completed_at timestamptz default now()
);

-- Indexes
create index idx_assignments_teacher on public.assignments(teacher_id);
create index idx_submissions_assignment on public.submissions(assignment_id);
create index idx_submissions_student on public.submissions(student_id);

-- Disable RLS (using anon key with simple auth, no Supabase Auth)
alter table public.users enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

-- Allow all operations via anon key
create policy "Allow all on users" on public.users for all using (true) with check (true);
create policy "Allow all on assignments" on public.assignments for all using (true) with check (true);
create policy "Allow all on submissions" on public.submissions for all using (true) with check (true);
