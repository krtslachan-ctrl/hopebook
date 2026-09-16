"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BookRequest, Status } from "@/lib/types";

const STATUSES: Status[] = ["접수", "검토중", "구매확정", "입수완료", "반려"];

const statusColor: Record<Status, string> = {
  접수: "bg-slate-100 text-slate-700",
  검토중: "bg-amber-100 text-amber-800",
  구매확정: "bg-blue-100 text-blue-800",
  입수완료: "bg-emerald-100 text-emerald-800",
  반려: "bg-red-100 text-red-800",
};

function formatKst(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<BookRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("전체");
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<Status>("접수");
  const [editMemo, setEditMemo] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "전체") params.set("status", statusFilter);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/requests?${params.toString()}`);
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "목록을 불러오지 못했습니다.");
        return;
      }
      setItems(data.items || []);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, q, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/session");
        const data = await res.json();
        if (!data.authenticated) {
          router.replace("/admin/login");
          return;
        }
        setAuthChecked(true);
      } catch {
        router.replace("/admin/login");
      }
    })();
  }, [router]);

  useEffect(() => {
    if (authChecked) load();
  }, [authChecked, load]);

  function openEdit(item: BookRequest) {
    setEditingId(item.id);
    setEditStatus(item.status);
    setEditMemo(item.admin_memo || "");
  }

  async function saveEdit() {
    if (editingId == null) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/requests/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus, admin_memo: editMemo }),
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "저장 실패");
        return;
      }
      setEditingId(null);
      await load();
    } catch {
      alert("네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: number) {
    if (!window.confirm("이 신청을 삭제할까요?")) return;
    try {
      const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "삭제 실패");
        return;
      }
      await load();
    } catch {
      alert("네트워크 오류");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "전체") params.set("status", statusFilter);
    if (q.trim()) params.set("q", q.trim());
    window.location.href = `/api/requests/export?${params.toString()}`;
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        인증 확인 중…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-[#1e3a5f] text-white shadow">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">교직원 희망도서</h1>
            <p className="text-xs text-blue-200">관리</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-blue-100 hover:text-white hover:underline">
              신청 페이지
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-blue-300/40 px-3 py-1.5 hover:bg-white/10"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        <div className="card p-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="label" htmlFor="statusFilter">
              상태 필터
            </label>
            <select
              id="statusFilter"
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="전체">전체</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-[2] min-w-[220px]">
            <label className="label" htmlFor="search">
              검색 (도서명 / 신청자)
            </label>
            <div className="flex gap-2">
              <input
                id="search"
                className="input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setQ(searchInput);
                }}
                placeholder="검색어 입력"
              />
              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={() => setQ(searchInput)}
              >
                검색
              </button>
            </div>
          </div>
          <button type="button" className="btn-primary shrink-0" onClick={exportCsv}>
            CSV 내보내기
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">신청 목록</h2>
            <span className="text-sm text-slate-500">{loading ? "불러오는 중…" : `${items.length}건`}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">신청일시</th>
                  <th className="px-4 py-3 font-medium">신청자</th>
                  <th className="px-4 py-3 font-medium">도서</th>
                  <th className="px-4 py-3 font-medium">우선순위</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">메모</th>
                  <th className="px-4 py-3 font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      신청 내역이 없습니다.
                    </td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-slate-500">#{item.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {formatKst(item.created_at)}
                      <span className="block text-[10px] text-slate-400">KST</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.applicant_name}</div>
                      <div className="text-xs text-slate-500">{item.department}</div>
                      <div className="text-xs text-slate-400">{item.email}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-500">
                        {item.author} · {item.publisher}
                        {item.isbn ? ` · ${item.isbn}` : ""}
                        {item.pub_year ? ` · ${item.pub_year}` : ""}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 line-clamp-2">{item.reason}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.priority === "긴급"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[item.status]}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px]">
                      {item.admin_memo || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          className="btn-secondary !py-1.5 !px-3 text-xs"
                          onClick={() => openEdit(item)}
                        >
                          상태/메모
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50"
                          onClick={() => deleteItem(item.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center">
          상태 흐름: 접수 → 검토중 → 구매확정 → 입수완료 | 반려
        </p>
      </main>

      {editingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold">신청 #{editingId} 수정</h3>
            <div>
              <label className="label" htmlFor="editStatus">
                상태
              </label>
              <select
                id="editStatus"
                className="input"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as Status)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="editMemo">
                관리자 메모
              </label>
              <textarea
                id="editMemo"
                className="input min-h-[100px]"
                value={editMemo}
                onChange={(e) => setEditMemo(e.target.value)}
                placeholder="내부 메모를 입력하세요"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingId(null)}
                disabled={saving}
              >
                취소
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
