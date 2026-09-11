import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req) {
  const { dataUrl } = await req.json();

  if (!dataUrl || !dataUrl.startsWith("data:image")) {
    return NextResponse.json({ error: "Imagem inválida." }, { status: 400 });
  }

  const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) {
    return NextResponse.json({ error: "Imagem inválida." }, { status: 400 });
  }
  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  const ext = contentType.split("/")[1] || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("fotos")
    .upload(fileName, buffer, { contentType });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("fotos")
    .getPublicUrl(fileName);

  return NextResponse.json({ url: publicUrlData.publicUrl });
}
