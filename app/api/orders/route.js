import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("ordens")
    .select("*")
    .order("numero", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req) {
  const body = await req.json();

  if (!body.cliente?.trim() || !body.aparelho?.trim()) {
    return NextResponse.json(
      { error: "Informe cliente e aparelho." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("ordens")
    .insert({
      cliente: body.cliente,
      telefone: body.telefone || "",
      cpf: body.cpf || "",
      aparelho: body.aparelho,
      imei: body.imei || "",
      defeito: body.defeito || "",
      senha: body.senha || "",
      orcamento: body.orcamento || "",
      servico: body.servico || "",
      itens_servico: body.itens_servico || [],
      orcamento_aprovado: body.orcamento_aprovado || false,
      tecnico: body.tecnico || "",
      status: body.status || "avaliacao",
      obs: body.obs || "",
      checklist: body.checklist || [],
      entry_photos: body.entry_photos || [],
      exit_photos: body.exit_photos || [],
      status_history: body.status_history || [],
      forma_pagamento: body.forma_pagamento || "",
      valor_pago: body.valor_pago || "",
      garantia_dias: body.garantia_dias || "90",
      data_pagamento: body.data_pagamento || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
