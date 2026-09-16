import { NextRequest, NextResponse } from "next/server";
import { createRequest, listRequests } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import { PRIORITIES, type Priority } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const q = searchParams.get("q") || undefined;
  const items = await listRequests({ status, q });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const required = [
      "applicant_name",
      "department",
      "email",
      "title",
      "author",
      "reason",
      "priority",
    ] as const;

    for (const key of required) {
      if (!body[key] || String(body[key]).trim() === "") {
        return NextResponse.json(
          { error: `필수 항목이 누락되었습니다: ${key}` },
          { status: 400 }
        );
      }
    }

    const email = String(body.email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "올바른 이메일 주소를 입력해 주세요." },
        { status: 400 }
      );
    }

    const priority = String(body.priority).trim() as Priority;
    if (!PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: "우선순위가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const item = await createRequest({
      applicant_name: String(body.applicant_name).trim(),
      department: String(body.department).trim(),
      email,
      title: String(body.title).trim(),
      author: String(body.author).trim(),
      publisher: body.publisher ? String(body.publisher).trim() : "",
      isbn: body.isbn ? String(body.isbn).trim() : undefined,
      pub_year: body.pub_year ? String(body.pub_year).trim() : undefined,
      reason: String(body.reason).trim(),
      priority,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "신청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
