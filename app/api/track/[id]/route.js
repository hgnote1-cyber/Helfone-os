import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import webpush from "@/lib/webpush";

async function notifyAll(title, body, url) {
  try {
    const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("*");
    if (!subs || subs.length === 0) return;
    await Promise.all(
      subs.map((row) =>
        webpush.sendNotification(row.subscription, JSON.stringify({ title, body, url })).catch(async (err) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
          }
        })
      )
    );
  } catch (e) {}
}

export async function GET(req, { params }) {
  const { data, error } = await supabaseAdmin
    .from("ordens")
    .select("numero, aparelho, status, status_history, created_at, cliente, orcamento, orcamento_aprovado")
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
    orcamento: data.orcamento,
    orcamento_aprovado: data.orcamento_aprovado || false,
  });
}

export async function POST(req, { params }) {
  const { action } = await req.json();

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  const { data: order, error: fetchError } = await supabaseAdmin
    .from("ordens")
    .select("status, status_history, orcamento_aprovado")
    .eq("id", params.id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Ordem não encontrada." }, { status: 404 });
  }

  if (order.orcamento_aprovado || order.status === "cancelado") {
    return NextResponse.json({ error: "Essa ordem já teve o orçamento respondido." }, { status: 409 });
  }

  const update =
    action === "approve"
      ? { orcamento_aprovado: true }
      : {
          status: "cancelado",
          status_history: [
            ...(order.status_history || []),
            { status: "cancelado", at: new Date().toISOString() },
          ],
        };

  const { data: fullOrder } = await supabaseAdmin
    .from("ordens")
    .select("numero, cliente, aparelho, orcamento")
    .eq("id", params.id)
    .single();

  const { error: updateError } = await supabaseAdmin.from("ordens").update(update).eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const nome = fullOrder?.cliente || "Cliente";
  if (action === "approve") {
    await notifyAll(
      "Orçamento aprovado!",
      `${nome} aprovou o orçamento da OS #${fullOrder?.numero} (${fullOrder?.aparelho || ""}) - R$ ${fullOrder?.orcamento || ""}`,
      `/`
    );
  } else {
    await notifyAll(
      "Orçamento recusado",
      `${nome} recusou o orçamento da OS #${fullOrder?.numero} (${fullOrder?.aparelho || ""}). A OS foi cancelada.`,
      `/`
    );
  }

  return NextResponse.json({ ok: true });
}
