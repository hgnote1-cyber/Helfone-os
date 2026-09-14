import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(req, { params }) {
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("ordens")
    .update({
      cliente: body.cliente,
      telefone: body.telefone || "",
      cpf: body.cpf || "",
      aparelho: body.aparelho,
      imei: body.imei || "",
      defeito: body.defeito || "",
      senha: body.senha || "",
      orcamento: body.orcamento || "",
      tecnico: body.tecnico || "",
      status: body.status,
      obs: body.obs || "",
      checklist: body.checklist || [],
      entry_photos: body.entry_photos || [],
      exit_photos: body.exit_photos || [],
      status_history: body.status_history || [],
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(req, { params }) {
  const { data: order } = await supabaseAdmin
    .from("ordens")
    .select("entry_photos, exit_photos")
    .eq("id", params.id)
    .single();

  const allUrls = [...(order?.entry_photos || []), ...(order?.exit_photos || [])];
  const marker = "/fotos/";
  const paths = allUrls
    .map((url) => {
      const idx = url.indexOf(marker);
      return idx >= 0 ? url.slice(idx + marker.length) : null;
    })
    .filter(Boolean);

  if (paths.length > 0) {
    try {
      await supabaseAdmin.storage.from("fotos").remove(paths);
    } catch (e) {
      // segue mesmo se a limpeza de fotos falhar, pra não travar a exclusão da OS
    }
  }

  const { error } = await supabaseAdmin.from("ordens").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
