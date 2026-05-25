-- 0016 — Extend lead sources so CRM source tracking covers auctions and DTC
-- orders alongside web chat (receptionist), listing inquiries, manual, import.

alter type public.lead_source add value if not exists 'auction';
alter type public.lead_source add value if not exists 'order';
