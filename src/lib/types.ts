export type Priority = "보통" | "긴급";

export type Status =
  | "접수"
  | "검토중"
  | "구매확정"
  | "입수완료"
  | "반려";

export const STATUSES: Status[] = [
  "접수",
  "검토중",
  "구매확정",
  "입수완료",
  "반려",
];

export const PRIORITIES: Priority[] = ["보통", "긴급"];

export interface BookRequest {
  id: number;
  applicant_name: string;
  department: string;
  email: string;
  title: string;
  author: string;
  publisher: string | null;
  isbn: string | null;
  pub_year: string | null;
  reason: string;
  priority: Priority;
  status: Status;
  admin_memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRequestInput {
  applicant_name: string;
  department: string;
  email: string;
  title: string;
  author: string;
  publisher?: string;
  isbn?: string;
  pub_year?: string;
  reason: string;
  priority: Priority;
}
