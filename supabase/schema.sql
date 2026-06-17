-- Run this in Supabase: SQL Editor → New query → paste → Run

create table if not exists tasks (
  id text primary key,
  task text not null,
  assignee text not null default '',
  status text not null default 'Active',
  created_at text not null default '',
  scheduled_at text not null default '',
  completed_at text not null default '',
  deleted_at text not null default '',
  record text not null default 'PRE'
);

create index if not exists tasks_record_idx on tasks (record);
