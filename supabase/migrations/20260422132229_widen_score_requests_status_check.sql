alter table public.score_requests
  drop constraint if exists score_requests_status_check;

alter table public.score_requests
  add constraint score_requests_status_check
  check (status in ('sent','not_found','rate_limited','invalid_input','error'));
