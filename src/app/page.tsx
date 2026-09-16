"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type BookRow = {
  title: string;
  author: string;
  publisher: string;
};

const EMPTY_BOOK: BookRow = { title: "", author: "", publisher: "" };
const ROW_COUNT = 10;

function emptyBooks(): BookRow[] {
  return Array.from({ length: ROW_COUNT }, () => ({ ...EMPTY_BOOK }));
}

export default function HomePage() {
  const [applicantName, setApplicantName] = useState("");
  const [books, setBooks] = useState<BookRow[]>(emptyBooks);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [serverError, setServerError] = useState("");

  function setBookField(index: number, key: keyof BookRow, value: string) {
    setBooks((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`book_${index}_title`];
      delete next[`book_${index}_author`];
      delete next.books;
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!applicantName.trim()) {
      next.applicant_name = "신청자 성명을(를) 입력해 주세요.";
    }

    const used = books
      .map((b, i) => ({ ...b, i }))
      .filter(
        (b) => b.title.trim() || b.author.trim() || b.publisher.trim()
      );

    if (used.length === 0) {
      next.books = "최소 1권의 도서(도서명·저자)를 입력해 주세요.";
    }

    for (const b of used) {
      if (!b.title.trim()) {
        next[`book_${b.i}_title`] = "도서명을(를) 입력해 주세요.";
      }
      if (!b.author.trim()) {
        next[`book_${b.i}_author`] = "저자를(를) 입력해 주세요.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payloadBooks = books
        .map((b) => ({
          title: b.title.trim(),
          author: b.author.trim(),
          publisher: b.publisher.trim(),
        }))
        .filter((b) => b.title || b.author || b.publisher);

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_name: applicantName.trim(),
          books: payloadBooks,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || "신청에 실패했습니다.");
        return;
      }
      setSuccessCount(data.count ?? payloadBooks.length);
      setApplicantName("");
      setBooks(emptyBooks());
    } catch {
      setServerError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-[#1e3a5f] text-white shadow">
        <div className="mx-auto max-w-3xl px-4 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-blue-200">
              도서관
            </p>
            <h1 className="text-xl font-bold sm:text-2xl">교직원 희망도서</h1>
          </div>
          <Link
            href="/admin"
            className="text-sm text-blue-100 hover:text-white underline-offset-2 hover:underline"
          >
            관리자
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {successCount !== null ? (
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-2xl">
              ✓
            </div>
            <h2 className="text-xl font-bold text-slate-900">신청이 접수되었습니다</h2>
            <p className="mt-2 text-slate-600">
              총{" "}
              <span className="font-semibold text-[#1e3a5f]">{successCount}</span>
              권의 도서가 등록되었습니다.
            </p>
            <button
              type="button"
              className="btn-primary mt-6"
              onClick={() => setSuccessCount(null)}
            >
              추가 신청하기
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">신청서 작성</h2>
              <p className="mt-1 text-sm text-slate-600">
                한 번에 최대 10권까지 신청할 수 있습니다.{" "}
                <span className="text-red-600">*</span> 표시는 필수 항목입니다.
                비어 있는 행은 무시됩니다.
              </p>
            </div>

            <form onSubmit={onSubmit} className="card p-6 sm:p-8 space-y-5" noValidate>
              {serverError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <div>
                <label className="label" htmlFor="applicant_name">
                  신청자 성명 <span className="text-red-600">*</span>
                </label>
                <input
                  id="applicant_name"
                  className="input"
                  value={applicantName}
                  onChange={(e) => {
                    setApplicantName(e.target.value);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.applicant_name;
                      return next;
                    });
                  }}
                  placeholder="홍길동"
                />
                {errors.applicant_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.applicant_name}</p>
                )}
              </div>

              <hr className="border-slate-200" />

              <div>
                <h3 className="text-sm font-semibold text-slate-800">신청 도서</h3>
                {errors.books && (
                  <p className="mt-1 text-xs text-red-600">{errors.books}</p>
                )}
              </div>

              <div className="space-y-4">
                {books.map((book, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3"
                  >
                    <p className="text-xs font-medium text-slate-500">
                      {index + 1}권
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="label" htmlFor={`title_${index}`}>
                          도서명{" "}
                          <span className="text-slate-400 font-normal">
                            (사용 시 필수)
                          </span>
                        </label>
                        <input
                          id={`title_${index}`}
                          className="input"
                          value={book.title}
                          onChange={(e) =>
                            setBookField(index, "title", e.target.value)
                          }
                          placeholder="신청할 도서의 제목"
                        />
                        {errors[`book_${index}_title`] && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors[`book_${index}_title`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="label" htmlFor={`author_${index}`}>
                          저자{" "}
                          <span className="text-slate-400 font-normal">
                            (사용 시 필수)
                          </span>
                        </label>
                        <input
                          id={`author_${index}`}
                          className="input"
                          value={book.author}
                          onChange={(e) =>
                            setBookField(index, "author", e.target.value)
                          }
                        />
                        {errors[`book_${index}_author`] && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors[`book_${index}_author`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="label" htmlFor={`publisher_${index}`}>
                          출판사{" "}
                          <span className="text-slate-400 font-normal">(선택)</span>
                        </label>
                        <input
                          id={`publisher_${index}`}
                          className="input"
                          value={book.publisher}
                          onChange={(e) =>
                            setBookField(index, "publisher", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary min-w-[140px]" disabled={submitting}>
                  {submitting ? "제출 중…" : "신청하기"}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
