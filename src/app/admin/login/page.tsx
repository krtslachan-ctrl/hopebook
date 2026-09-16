"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#1e3a5f] text-white">
        <div className="mx-auto max-w-md px-4 py-5">
          <h1 className="text-xl font-bold">관리자 로그인</h1>
          <p className="text-sm text-blue-200 mt-1">교직원 희망도서</p>
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <form onSubmit={onSubmit} className="card w-full max-w-md p-6 sm:p-8 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="label" htmlFor="password">
              관리자 비밀번호
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              autoFocus
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "확인 중…" : "로그인"}
          </button>
          <p className="text-center text-sm text-slate-500">
            <Link href="/" className="text-[#2c5282] hover:underline">
              ← 신청 페이지로 돌아가기
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
