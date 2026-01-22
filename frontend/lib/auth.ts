/**
 * Authentication helper functions
 */

export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
}

export function getUserId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('user_id');
}

export function getUsername(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('username');
}

export function isAuthenticated(): boolean {
    return !!getAuthToken();
}

export function logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    window.location.href = '/login';
}

export function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const userId = getUserId();
    if (userId) {
        headers['X-User-Id'] = userId;
    }

    return headers;
}

/**
 * Fetch wrapper that includes auth headers
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
        ...getAuthHeaders(),
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    // If unauthorized, redirect to login
    if (response.status === 401) {
        logout();
    }

    return response;
}

/**
 * Generic response handler
 */
export async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Unauthorized');
        }
        const error = await response.text();
        throw new Error(error || response.statusText);
    }
    return response.json();
}
