import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req, { params }) {
  const { data, error } = await supabaseAdmin
    .from("ordens")
    .select("numero, aparelho, status, status_history, created_at, cliente")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Ordem não encontrada." }, { status: 404 });
  }

  const primeiroNome = (data.cliente || "").trim().split(" ")[0] || "";

  return NextResponse.json({
    numero: data.numero,
    aparelho: data.aparelho,
    status: data.status,
    status_history: data.status_history || [],
    created_at: data.created_at,
    primeiro_nome: primeiroNome,
  });
}
