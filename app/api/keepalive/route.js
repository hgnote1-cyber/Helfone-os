import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    await supabaseAdmin.from("ordens").select("id").limit(1);
    return NextResponse.json({ ok: true, checked_at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
