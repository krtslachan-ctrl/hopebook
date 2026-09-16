import { NextRequest, NextResponse } from "next/server";
import { updateRequest } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import { STATUSES, type Status } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "잘못된 ID입니다." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const patch: { status?: Status; admin_memo?: string } = {};

    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: "상태가 올바르지 않습니다." },
          { status: 400 }
        );
      }
      patch.status = body.status;
    }
    if (body.admin_memo !== undefined) {
      patch.admin_memo = String(body.admin_memo);
    }

    const item = await updateRequest(id, patch);
    if (!item) {
      return NextResponse.json(
        { error: "신청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
