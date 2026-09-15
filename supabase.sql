create table if not exists ordens (
  id uuid primary key default gen_random_uuid(),
  numero serial,
  created_at timestamptz default now(),
  cliente text not null,
  telefone text,
  aparelho text not null,
  imei text,
  defeito text,
  senha text,
  orcamento text,
  servico text,
  itens_servico jsonb default '[]',
  tecnico text,
  status text default 'avaliacao',
  obs text,
  checklist jsonb default '[]',
  entry_photos jsonb default '[]',
  exit_photos jsonb default '[]',
  status_history jsonb default '[]',
  forma_pagamento text,
  valor_pago text,
  garantia_dias text default '90',
  data_pagamento timestamptz
);

alter table ordens enable row level security;

create policy "permite tudo por enquanto"
  on ordens for all
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

create policy "leitura publica de fotos"
  on storage.objects for select
  using (bucket_id = 'fotos');

create policy "upload de fotos"
  on storage.objects for insert
  with check (bucket_id = 'fotos');

create table if not exists settings (
  id text primary key default 'default',
  meta_faturamento text
);

alter table settings enable row level security;

insert into settings (id, meta_faturamento) values ('default', '')
on conflict (id) do nothing;

alter table ordens add column if not exists orcamento_aprovado boolean default false;
