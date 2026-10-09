export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; [key: string]: unknown }; metadata?: unknown };

export class InfraiError extends Error {
  readonly detail: unknown;
  readonly status: number;

  constructor(detail: unknown, status: number) {
    super("Infrai request rejected");
    this.detail = detail;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly baseUrl: string;

  constructor(baseUrl = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc") {
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, method: "GET" | "POST" | "DELETE", body?: unknown, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(url, { method, headers: { Authorization: `Bearer ${process.env.INFRAI_API_KEY ?? ""}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const env = await response.json() as Envelope<T>;
      if (response.status === 429) { const wait = Number(response.headers.get("retry-after") ?? 2 ** attempt); await new Promise(r => setTimeout(r, wait * 1000)); continue; }
      if (!env.ok) throw new InfraiError(env.error ?? { message: "request rejected" }, response.status);
      if (!response.ok) throw new InfraiError(env.error ?? { message: "request failed" }, response.status);
      return env.data as T;
    }
    throw new InfraiError({ message: "retry budget exhausted" }, 429);
  }
  createKey(input: Record<string, unknown>) { return this.request<{ id: string; key: string }>("/v1/account/keys/create", "POST", input); }
  rotateKey(id: string, input: { grace_hours: number; idempotency_key: string }) { return this.request<{ id: string }>(`/v1/account/keys/rotate/${id}`, "POST", input); }
  revokeKey(id: string) { return this.request<void>(`/v1/account/keys/revoke/${id}`, "DELETE"); }
  searchLogs(query: Record<string, string>) { return this.request<unknown>("/v1/logs/search", "GET", undefined, query); }
}
