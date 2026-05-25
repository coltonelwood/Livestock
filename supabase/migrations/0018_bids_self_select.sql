-- 0018 — Let a bidder always read their own bids (for the buyer "My bids" view),
-- in addition to the public-lot bid-history policy.

create policy bids_select_own on public.bids
  for select using (bidder_id = auth.uid());
