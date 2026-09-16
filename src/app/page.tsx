"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type FormState = {
  applicant_name: string;
  department: string;
  email: string;
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  pub_year: string;
  reason: string;
  priority: "보통" | "긴급";
};

const initial: FormState = {
  applicant_name: "",
  department: "",
  email: "",
  title: "",
  author: "",
  publisher: "",
  isbn: "",
  pub_year: "",
  reason: "",
  priority: "보통",
};

export default function HomePage() {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [serverError, setServerError] = useState("");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    const required: (keyof FormState)[] = [
      "applicant_name",
      "department",
      "email",
      "title",
      "author",
      "reason",
      "priority",
    ];
    const labels: Record<string, string> = {
      applicant_name: "신청자 성명",
      department: "소속/부서",
      email: "이메일",
      title: "도서명",
      author: "저자",
      publisher: "출판사",
      reason: "신청 사유",
      priority: "우선순위",
    };
    for (const key of required) {
      if (!String(form[key]).trim()) {
        next[key] = `${labels[key]}을(를) 입력해 주세요.`;
      }
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "올바른 이메일 주소를 입력해 주세요.";
    }
    if (form.pub_year && !/^\d{4}$/.test(form.pub_year.trim())) {
      next.pub_year = "출판연도는 4자리 숫자로 입력해 주세요.";
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
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || "신청에 실패했습니다.");
        return;
      }
      setSuccessId(data.item?.id ?? data.request?.id ?? 0);
      setForm(initial);
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
        {successId !== null ? (
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-2xl">
              ✓
            </div>
            <h2 className="text-xl font-bold text-slate-900">신청이 접수되었습니다</h2>
            <p className="mt-2 text-slate-600">
              신청번호 <span className="font-semibold text-[#1e3a5f]">#{successId}</span> 로
              등록되었습니다. 처리 결과는 이메일로 안내될 수 있습니다.
            </p>
            <button
              type="button"
              className="btn-primary mt-6"
              onClick={() => setSuccessId(null)}
            >
              추가 신청하기
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">신청서 작성</h2>
              <p className="mt-1 text-sm text-slate-600">
                교직원 희망도서를 신청해 주세요. <span className="text-red-600">*</span> 표시는
                필수 항목입니다.
              </p>
            </div>

            <form onSubmit={onSubmit} className="card p-6 sm:p-8 space-y-5" noValidate>
              {serverError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <section className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="applicant_name">
                    신청자 성명 <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="applicant_name"
                    className="input"
                    value={form.applicant_name}
                    onChange={(e) => setField("applicant_name", e.target.value)}
                    placeholder="홍길동"
                  />
                  {errors.applicant_name && (
                    <p className="mt-1 text-xs text-red-600">{errors.applicant_name}</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="department">
                    소속/부서 <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="department"
                    className="input"
                    value={form.department}
                    onChange={(e) => setField("department", e.target.value)}
                    placeholder="예: 컴퓨터공학과"
                  />
                  {errors.department && (
                    <p className="mt-1 text-xs text-red-600">{errors.department}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="email">
                    이메일 <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="name@univ.ac.kr"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>
              </section>

              <hr className="border-slate-200" />

              <section className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="title">
                    도서명 <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="title"
                    className="input"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    placeholder="신청할 도서의 제목"
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-600">{errors.title}</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="author">
                    저자 <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="author"
                    className="input"
                    value={form.author}
                    onChange={(e) => setField("author", e.target.value)}
                  />
                  {errors.author && (
                    <p className="mt-1 text-xs text-red-600">{errors.author}</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="publisher">
                    출판사 <span className="text-slate-400 font-normal">(선택)</span>
                  </label>
                  <input
                    id="publisher"
                    className="input"
                    value={form.publisher}
                    onChange={(e) => setField("publisher", e.target.value)}
                  />
                  {errors.publisher && (
                    <p className="mt-1 text-xs text-red-600">{errors.publisher}</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="isbn">
                    ISBN <span className="text-slate-400 font-normal">(선택)</span>
                  </label>
                  <input
                    id="isbn"
                    className="input"
                    value={form.isbn}
                    onChange={(e) => setField("isbn", e.target.value)}
                    placeholder="978..."
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pub_year">
                    출판연도 <span className="text-slate-400 font-normal">(선택)</span>
                  </label>
                  <input
                    id="pub_year"
                    className="input"
                    value={form.pub_year}
                    onChange={(e) => setField("pub_year", e.target.value)}
                    placeholder="2024"
                    inputMode="numeric"
                  />
                  {errors.pub_year && (
                    <p className="mt-1 text-xs text-red-600">{errors.pub_year}</p>
                  )}
                </div>
              </section>

              <div>
                <label className="label" htmlFor="reason">
                  신청 사유 <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="reason"
                  className="input min-h-[110px] resize-y"
                  value={form.reason}
                  onChange={(e) => setField("reason", e.target.value)}
                  placeholder="강의·연구·업무 활용 목적 등을 구체적으로 적어 주세요."
                />
                {errors.reason && (
                  <p className="mt-1 text-xs text-red-600">{errors.reason}</p>
                )}
              </div>

              <div>
                <span className="label">
                  우선순위 <span className="text-red-600">*</span>
                </span>
                <div className="flex gap-4">
                  {(["보통", "긴급"] as const).map((p) => (
                    <label
                      key={p}
                      className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                        form.priority === p
                          ? "border-[#1e3a5f] bg-blue-50 text-[#1e3a5f] font-medium"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="priority"
                        className="accent-[#1e3a5f]"
                        checked={form.priority === p}
                        onChange={() => setField("priority", p)}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary min-w-[140px]" disabled={submitting}>
                  {submitting ? "제출 중…" : "신청하기"}
                </button>
              </div>
            </form>
          </>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          본 시스템은 로컬 데모용입니다. 실제 도서관 정책과 다를 수 있습니다.
        </p>
      </main>
    </div>
  );
}
