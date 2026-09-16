import type { BookRequest, CreateRequestInput, Priority, Status } from "./types";

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    applicant_name TEXT NOT NULL,
    department TEXT NOT NULL,
    email TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT,
    isbn TEXT,
    pub_year TEXT,
    reason TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT '보통',
    status TEXT NOT NULL DEFAULT '접수',
    admin_memo TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const SAMPLE_ROWS = [
  {
    applicant_name: "김민수",
    department: "컴퓨터공학과",
    email: "minsu.kim@univ.ac.kr",
    title: "Clean Code",
    author: "Robert C. Martin",
    publisher: "인사이트",
    isbn: "9788966260959",
    pub_year: "2013",
    reason: "소프트웨어 공학 강의 참고용 교재로 활용하고자 합니다.",
    priority: "보통",
    status: "접수",
    admin_memo: null as string | null,
  },
  {
    applicant_name: "이서연",
    department: "도서관",
    email: "seoyeon.lee@univ.ac.kr",
    title: "데이터베이스 시스템",
    author: "Abraham Silberschatz",
    publisher: "한국맥그로힐",
    isbn: "9788991762442",
    pub_year: "2014",
    reason: "정보시스템 운영팀 업무 참고 자료가 필요합니다.",
    priority: "긴급",
    status: "검토중",
    admin_memo: "입수 가능 여부 확인 중",
  },
  {
    applicant_name: "박지훈",
    department: "경영학과",
    email: "jihoon.park@univ.ac.kr",
    title: "좋은 기업을 넘어 위대한 기업으로",
    author: "Jim Collins",
    publisher: "김영사",
    isbn: "9788934930112",
    pub_year: "2002",
    reason: "전략경영 세미나 참가자용 추천도서로 신청합니다.",
    priority: "보통",
    status: "구매확정",
    admin_memo: "구매 발주 완료",
  },
];

function isTursoEnabled(): boolean {
  return Boolean(
    process.env.TURSO_DATABASE_URL?.trim() &&
      process.env.TURSO_AUTH_TOKEN?.trim()
  );
}

function rowToRequest(row: Record<string, unknown>): BookRequest {
  return {
    id: Number(row.id),
    applicant_name: row.applicant_name as string,
    department: row.department as string,
    email: row.email as string,
    title: row.title as string,
    author: row.author as string,
    publisher: (row.publisher as string) || null,
    isbn: (row.isbn as string) || null,
    pub_year: (row.pub_year as string) || null,
    reason: row.reason as string,
    priority: row.priority as BookRequest["priority"],
    status: row.status as Status,
    admin_memo: (row.admin_memo as string) || null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/* -------------------------------------------------------------------------- */
/* Turso (@libsql/client)                                                     */
/* -------------------------------------------------------------------------- */

type LibsqlClient = {
  execute: (stmt: {
    sql: string;
    args?: unknown[];
  }) => Promise<{
    rows: Record<string, unknown>[];
    rowsAffected: number;
    lastInsertRowid?: bigint | number | null;
  }>;
};

let tursoClient: LibsqlClient | null = null;
let tursoReady: Promise<void> | null = null;

async function getTurso(): Promise<LibsqlClient> {
  if (!tursoClient) {
    const { createClient } = await import("@libsql/client");
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    }) as unknown as LibsqlClient;
  }
  if (!tursoReady) {
    tursoReady = (async () => {
      const client = tursoClient!;
      await client.execute({ sql: SCHEMA_SQL });
      const countRes = await client.execute({
        sql: "SELECT COUNT(*) AS c FROM requests",
      });
      const n = Number(countRes.rows[0]?.c ?? 0);
      if (n === 0) {
        const now = new Date().toISOString();
        for (const s of SAMPLE_ROWS) {
          await client.execute({
            sql: `INSERT INTO requests (
              applicant_name, department, email, title, author, publisher,
              isbn, pub_year, reason, priority, status, admin_memo, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              s.applicant_name,
              s.department,
              s.email,
              s.title,
              s.author,
              s.publisher,
              s.isbn,
              s.pub_year,
              s.reason,
              s.priority,
              s.status,
              s.admin_memo,
              now,
              now,
            ],
          });
        }
      }
    })();
  }
  await tursoReady;
  return tursoClient!;
}

async function tursoList(opts?: {
  status?: string;
  q?: string;
}): Promise<BookRequest[]> {
  const client = await getTurso();
  const clauses: string[] = [];
  const args: unknown[] = [];

  if (opts?.status && opts.status !== "전체") {
    clauses.push("status = ?");
    args.push(opts.status);
  }
  if (opts?.q?.trim()) {
    clauses.push("(title LIKE ? OR applicant_name LIKE ?)");
    const like = `%${opts.q.trim()}%`;
    args.push(like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const res = await client.execute({
    sql: `SELECT * FROM requests ${where} ORDER BY created_at DESC, id DESC`,
    args,
  });
  return res.rows.map((r) => rowToRequest(r));
}


function normalizeCreateInput(input: CreateRequestInput): {
  applicant_name: string;
  department: string;
  email: string;
  title: string;
  author: string;
  publisher: string;
  isbn?: string;
  pub_year?: string;
  reason: string;
  priority: Priority;
} {
  const title = (input.title || "").trim();
  const author = (input.author || "").trim();
  const applicant_name = (input.applicant_name || "").trim();
  if (!applicant_name) {
    throw new Error("신청자 성명은 필수입니다.");
  }
  if (!title) {
    throw new Error("도서명은 필수입니다.");
  }
  if (!author) {
    throw new Error("저자는 필수입니다.");
  }
  return {
    applicant_name,
    title,
    author,
    publisher: (input.publisher || "").trim(),
    department: (input.department ?? "").trim(),
    email: (input.email ?? "-").trim() || "-",
    isbn: (input.isbn || "").trim() || undefined,
    pub_year: (input.pub_year || "").trim() || undefined,
    reason: (input.reason ?? "-").trim() || "-",
    priority: input.priority || "보통",
  };
}

async function tursoCreate(input: CreateRequestInput): Promise<BookRequest> {
  const data = normalizeCreateInput(input);
  const client = await getTurso();
  const now = new Date().toISOString();
  const result = await client.execute({
    sql: `INSERT INTO requests (
      applicant_name, department, email, title, author, publisher,
      isbn, pub_year, reason, priority, status, admin_memo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '접수', NULL, ?, ?)`,
    args: [
      data.applicant_name,
      data.department,
      data.email,
      data.title,
      data.author,
      data.publisher || "",
      data.isbn || null,
      data.pub_year || null,
      data.reason,
      data.priority,
      now,
      now,
    ],
  });
  const id = Number(result.lastInsertRowid);
  const rows = await client.execute({
    sql: "SELECT * FROM requests WHERE id = ?",
    args: [id],
  });
  if (!rows.rows[0]) {
    throw new Error("신청 저장 후 조회에 실패했습니다.");
  }
  return rowToRequest(rows.rows[0]);
}

async function tursoUpdate(
  id: number,
  data: { status?: Status; admin_memo?: string }
): Promise<BookRequest | null> {
  const client = await getTurso();
  const existing = await client.execute({
    sql: "SELECT * FROM requests WHERE id = ?",
    args: [id],
  });
  if (!existing.rows[0]) return null;

  const current = rowToRequest(existing.rows[0]);
  const status = data.status ?? current.status;
  const admin_memo =
    data.admin_memo !== undefined ? data.admin_memo : current.admin_memo;
  const now = new Date().toISOString();

  await client.execute({
    sql: `UPDATE requests SET status = ?, admin_memo = ?, updated_at = ? WHERE id = ?`,
    args: [status, admin_memo, now, id],
  });
  const rows = await client.execute({
    sql: "SELECT * FROM requests WHERE id = ?",
    args: [id],
  });
  return rows.rows[0] ? rowToRequest(rows.rows[0]) : null;
}

async function tursoGet(id: number): Promise<BookRequest | null> {
  const client = await getTurso();
  const rows = await client.execute({
    sql: "SELECT * FROM requests WHERE id = ?",
    args: [id],
  });
  return rows.rows[0] ? rowToRequest(rows.rows[0]) : null;
}

/* -------------------------------------------------------------------------- */
/* Local sql.js fallback                                                      */
/* -------------------------------------------------------------------------- */

type SqlJsDatabase = import("sql.js").Database;

let sqlJsDb: SqlJsDatabase | null = null;
let sqlJsInit: Promise<SqlJsDatabase> | null = null;

async function getSqlJs(): Promise<SqlJsDatabase> {
  if (sqlJsDb) return sqlJsDb;
  if (!sqlJsInit) {
    sqlJsInit = (async () => {
      const fs = await import("fs");
      const path = await import("path");
      const initSqlJs = (await import("sql.js")).default;

      const DATA_DIR = path.join(process.cwd(), "data");
      const DB_PATH = path.join(DATA_DIR, "requests.db");

      const persist = (db: SqlJsDatabase) => {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const data = db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
      };

      const SQL = await initSqlJs({
        locateFile: (file) =>
          path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
      });

      let db: SqlJsDatabase;
      if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
      } else {
        db = new SQL.Database();
      }

      db.run(SCHEMA_SQL);

      const count = db.exec("SELECT COUNT(*) AS c FROM requests");
      const n = count[0]?.values[0]?.[0] as number;
      if (n === 0) {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
          INSERT INTO requests (
            applicant_name, department, email, title, author, publisher,
            isbn, pub_year, reason, priority, status, admin_memo, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of SAMPLE_ROWS) {
          stmt.run([
            s.applicant_name,
            s.department,
            s.email,
            s.title,
            s.author,
            s.publisher,
            s.isbn,
            s.pub_year,
            s.reason,
            s.priority,
            s.status,
            s.admin_memo,
            now,
            now,
          ]);
        }
        stmt.free();
      }

      persist(db);
      sqlJsDb = db;
      // attach persist helper on the instance via closure usage below
      (db as unknown as { __persist?: () => void }).__persist = () =>
        persist(db);
      return db;
    })();
  }
  return sqlJsInit;
}

function sqlJsQueryAll(
  db: SqlJsDatabase,
  sql: string,
  params: unknown[] = []
): BookRequest[] {
  const stmt = db.prepare(sql);
  stmt.bind(params as never[]);
  const results: BookRequest[] = [];
  while (stmt.step()) {
    results.push(rowToRequest(stmt.getAsObject()));
  }
  stmt.free();
  return results;
}

function sqlJsPersist(db: SqlJsDatabase) {
  const p = (db as unknown as { __persist?: () => void }).__persist;
  if (p) p();
}

async function sqlJsList(opts?: {
  status?: string;
  q?: string;
}): Promise<BookRequest[]> {
  const db = await getSqlJs();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (opts?.status && opts.status !== "전체") {
    clauses.push("status = ?");
    params.push(opts.status);
  }
  if (opts?.q?.trim()) {
    clauses.push("(title LIKE ? OR applicant_name LIKE ?)");
    const like = `%${opts.q.trim()}%`;
    params.push(like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return sqlJsQueryAll(
    db,
    `SELECT * FROM requests ${where} ORDER BY created_at DESC, id DESC`,
    params
  );
}

async function sqlJsCreate(input: CreateRequestInput): Promise<BookRequest> {
  const data = normalizeCreateInput(input);
  const db = await getSqlJs();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO requests (
      applicant_name, department, email, title, author, publisher,
      isbn, pub_year, reason, priority, status, admin_memo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '접수', NULL, ?, ?)`,
    [
      data.applicant_name,
      data.department,
      data.email,
      data.title,
      data.author,
      data.publisher || "",
      data.isbn || null,
      data.pub_year || null,
      data.reason,
      data.priority,
      now,
      now,
    ]
  );
  const idRes = db.exec("SELECT last_insert_rowid() AS id");
  const id = Number(idRes[0].values[0][0]);
  sqlJsPersist(db);
  const rows = sqlJsQueryAll(db, "SELECT * FROM requests WHERE id = ?", [id]);
  if (!rows[0]) {
    throw new Error("신청 저장 후 조회에 실패했습니다.");
  }
  return rows[0];
}

async function sqlJsUpdate(
  id: number,
  data: { status?: Status; admin_memo?: string }
): Promise<BookRequest | null> {
  const db = await getSqlJs();
  const existing = sqlJsQueryAll(db, "SELECT * FROM requests WHERE id = ?", [
    id,
  ]);
  if (!existing.length) return null;

  const status = data.status ?? existing[0].status;
  const admin_memo =
    data.admin_memo !== undefined ? data.admin_memo : existing[0].admin_memo;
  const now = new Date().toISOString();

  db.run(
    `UPDATE requests SET status = ?, admin_memo = ?, updated_at = ? WHERE id = ?`,
    [status, admin_memo, now, id]
  );
  sqlJsPersist(db);
  return sqlJsQueryAll(db, "SELECT * FROM requests WHERE id = ?", [id])[0];
}

async function sqlJsGet(id: number): Promise<BookRequest | null> {
  const db = await getSqlJs();
  const rows = sqlJsQueryAll(db, "SELECT * FROM requests WHERE id = ?", [id]);
  return rows[0] || null;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export async function listRequests(opts?: {
  status?: string;
  q?: string;
}): Promise<BookRequest[]> {
  return isTursoEnabled() ? tursoList(opts) : sqlJsList(opts);
}

export async function createRequest(
  input: CreateRequestInput
): Promise<BookRequest> {
  return isTursoEnabled() ? tursoCreate(input) : sqlJsCreate(input);
}

export async function updateRequest(
  id: number,
  data: { status?: Status; admin_memo?: string }
): Promise<BookRequest | null> {
  return isTursoEnabled() ? tursoUpdate(id, data) : sqlJsUpdate(id, data);
}

export async function getRequest(id: number): Promise<BookRequest | null> {
  return isTursoEnabled() ? tursoGet(id) : sqlJsGet(id);
}

export function getDbBackend(): "turso" | "sqljs" {
  return isTursoEnabled() ? "turso" : "sqljs";
}
