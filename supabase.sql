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
