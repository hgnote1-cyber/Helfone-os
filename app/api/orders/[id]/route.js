import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(req, { params }) {
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("ordens")
    .update({
      cliente: body.cliente,
      telefone: body.telefone || "",
      aparelho: body.aparelho,
      defeito: body.defeito || "",
      senha: body.senha || "",
      orcamento: body.orcamento || "",
      tecnico: body.tecnico || "",
      status: body.status,
      obs: body.obs || "",
      checklist: body.checklist || [],
      entry_photos: body.entry_photos || [],
      exit_photos: body.exit_photos || [],
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
