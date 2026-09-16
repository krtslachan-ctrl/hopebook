import { NextRequest, NextResponse } from "next/server";
import {
  checkPassword,
  createSessionToken,
  COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = String(body.password || "");
    if (!checkPassword(password)) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const token = createSessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(
      COOKIE_NAME,
      token,
      sessionCookieOptions(60 * 60 * 24 * 7)
    );
    return res;
  } catch (e) {
    console.error(e);
    const message =
      e instanceof Error && e.message.includes("ADMIN_")
        ? e.message
        : "로그인 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
