export interface ApiOptions {
  token?: string;
}

const SESSION_STORAGE_KEY = "auth_session";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// function getStoredAccessToken() {
//   const raw = localStorage.getItem(SESSION_STORAGE_KEY);
//   if (!raw) return null;

//   try {
//     const parsed = JSON.parse(raw) as { access_token?: string };
//     return parsed.access_token || null;
//   } catch {
//     localStorage.removeItem(SESSION_STORAGE_KEY);
//     return null;
//   }
// }

async function getClerkToken() {
  try {
    // Clerk globally attaches itself to the window object in the browser
    const clerk = (window as any).Clerk;
    if (clerk && clerk.session) {
      // Clerk's getToken() is asynchronous and handles refreshing automatically!
      return await clerk.session.getToken();
    }
    return null;
  } catch (error) {
    console.error("Failed to get Clerk token:", error);
    return null;
  }
}

async function request<T>(
    method: string, //HTTP method: GET, POST, etc.
    path: string, //endpoint path, e.g. "/auth/login"
    body?: unknown, //request body for POST/PUT/PATCH
    options: ApiOptions = {} //additional options, e.g. { token: "..." }
  ): Promise<T> { 
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "69420", // Bypass ngrok browser warning for API requests
  };

  const token = options.token || await getClerkToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  // console.log(token);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  let data: unknown = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : response.statusText || "Request failed";
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const api = {
  get<T>(path: string, options?: ApiOptions) {
    return request<T>("GET", path, undefined, options);
  },
  post<T>(path: string, body?: unknown, options?: ApiOptions) {
    return request<T>("POST", path, body, options);
  },
  put<T>(path: string, body?: unknown, options?: ApiOptions) {
    return request<T>("PUT", path, body, options);
  },
  patch<T>(path: string, body?: unknown, options?: ApiOptions) {
    return request<T>("PATCH", path, body, options);
  },
  delete<T>(path: string, options?: ApiOptions) {
    return request<T>("DELETE", path, undefined, options);
  },
};

