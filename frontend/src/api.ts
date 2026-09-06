export type User = {
  email: string;
  is_mentor: boolean;
  is_student: boolean;
};

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

async function ensureCsrf(): Promise<void> {
  if (getCookie("csrftoken")) return;
  await fetch("/accounts/api/csrf/", { credentials: "same-origin" });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  await ensureCsrf();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.method && options.method !== "GET") {
    headers["X-CSRFToken"] = getCookie("csrftoken");
  }
  const res = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail ?? "Wystąpił błąd.");
  }
  return data as T;
}

export async function login(email: string, password: string): Promise<User> {
  const data = await request<{ user: User }>("/accounts/api/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function register(
  email: string,
  password1: string,
  password2: string,
): Promise<User> {
  const data = await request<{ user: User }>("/accounts/api/register/", {
    method: "POST",
    body: JSON.stringify({ email, password1, password2 }),
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await request<{ detail: string }>("/accounts/api/logout/", { method: "POST" });
}

export async function me(): Promise<User | null> {
  const res = await fetch("/accounts/api/me/", { credentials: "same-origin" });
  if (res.status === 401) return null;
  const data = await res.json();
  return data.user as User;
}
