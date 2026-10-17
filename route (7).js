import { NextResponse } from "next/server";

export async function POST(req) {
  const { password } = await req.json();

  if (!process.env.APP_PASSWORD) {
    return NextResponse.json(
      { error: "Senha do app não configurada no servidor (APP_PASSWORD)." },
      { status: 500 }
    );
  }

  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("authed", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
