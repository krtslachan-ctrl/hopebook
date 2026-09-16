import { NextRequest, NextResponse } from "next/server";
import { createRequest, listRequests } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

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

type BookPayload = {
  title?: unknown;
  author?: unknown;
  publisher?: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const applicant_name = String(body.applicant_name ?? "").trim();
    if (!applicant_name) {
      return NextResponse.json(
        { error: "필수 항목이 누락되었습니다: applicant_name" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.books)) {
      return NextResponse.json(
        { error: "books 배열이 필요합니다." },
        { status: 400 }
      );
    }

    const books = (body.books as BookPayload[])
      .map((b) => ({
        title: String(b?.title ?? "").trim(),
        author: String(b?.author ?? "").trim(),
        publisher: b?.publisher ? String(b.publisher).trim() : "",
      }))
      .filter((b) => b.title || b.author || b.publisher);

    if (books.length === 0) {
      return NextResponse.json(
        { error: "최소 1권의 도서(도서명·저자)를 입력해 주세요." },
        { status: 400 }
      );
    }
    if (books.length > 10) {
      return NextResponse.json(
        { error: "한 번에 최대 10권까지 신청할 수 있습니다." },
        { status: 400 }
      );
    }

    for (const book of books) {
      if (!book.title || !book.author) {
        return NextResponse.json(
          { error: "사용된 행에는 도서명과 저자가 모두 필요합니다." },
          { status: 400 }
        );
      }
    }

    const items = [];
    for (const book of books) {
      const item = await createRequest({
        applicant_name,
        title: book.title,
        author: book.author,
        publisher: book.publisher || "",
        department: "",
        email: "-",
        reason: "-",
        priority: "보통",
      });
      items.push(item);
    }

    return NextResponse.json(
      { ok: true, count: items.length, items },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    const message =
      e instanceof Error && e.message
        ? e.message
        : "신청 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
