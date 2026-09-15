import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("*")
    .eq("id", "default")
    .single();

  if (error) {
    return NextResponse.json({ meta_faturamento: "" });
  }
  return NextResponse.json(data);
}

export async function PUT(req) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("settings")
    .upsert({ id: "default", meta_faturamento: body.meta_faturamento || "" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
