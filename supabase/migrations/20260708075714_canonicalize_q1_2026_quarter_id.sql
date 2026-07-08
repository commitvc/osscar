begin;

insert into public.quarters (
  id,
  label,
  quarter_start,
  quarter_end,
  is_current,
  published_at
)
select
  'Q1_2026',
  label,
  quarter_start,
  quarter_end,
  is_current,
  published_at
from public.quarters
where id = 'Q12026'
on conflict (id) do update
set
  label = excluded.label,
  quarter_start = excluded.quarter_start,
  quarter_end = excluded.quarter_end,
  is_current = excluded.is_current,
  published_at = excluded.published_at;

update public.organizations_full
set quarter_id = 'Q1_2026'
where quarter_id = 'Q12026';

update public.score_requests
set matched_quarter_id = 'Q1_2026'
where matched_quarter_id = 'Q12026';

delete from public.quarters
where id = 'Q12026';

commit;
