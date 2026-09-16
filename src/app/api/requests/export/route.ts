import { NextRequest, NextResponse } from "next/server";
import { listRequests } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const q = searchParams.get("q") || undefined;
  const items = await listRequests({ status, q });

  const headers = [
    "ID",
    "신청자",
    "소속",
    "이메일",
    "도서명",
    "저자",
    "출판사",
    "ISBN",
    "출판연도",
    "신청사유",
    "우선순위",
    "상태",
    "관리자메모",
    "신청일시",
    "수정일시",
  ];

  const lines = [headers.join(",")];
  for (const r of items) {
    lines.push(
      [
        r.id,
        r.applicant_name,
        r.department,
        r.email,
        r.title,
        r.author,
        r.publisher,
        r.isbn,
        r.pub_year,
        r.reason,
        r.priority,
        r.status,
        r.admin_memo,
        r.created_at,
        r.updated_at,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  const bom = "\uFEFF";
  const body = bom + lines.join("\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="book-requests.csv"`,
    },
  });
}
