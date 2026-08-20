import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getLimites, setLimites } from "@/lib/hours";

export async function GET() {
  const auth = await requireRole(["area", "admin"]);
  if ("error" in auth) return auth.error;
  return NextResponse.json(await getLimites());
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const limite50 = Number(body?.limite50);
  const limite100 = Number(body?.limite100);
  const limiteCombinado = Number(body?.limiteCombinado);

  if ([limite50, limite100, limiteCombinado].some((n) => !Number.isFinite(n) || n < 0)) {
    return NextResponse.json({ error: "Los topes deben ser números válidos (0 = sin tope)." }, { status: 400 });
  }

  await setLimites({ limite50, limite100, limiteCombinado });
  return NextResponse.json({ ok: true });
}
