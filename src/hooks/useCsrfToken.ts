"use client";

import { useEffect, useState } from "react";

/**
 * Hook to get CSRF token for client-side requests
 * Fetches the token that middleware ensures exists
 * For server components, pass the token directly as a prop instead
 */
export function useCsrfToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/csrf", { credentials: "include" })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          setToken(data.token);
        } else {
          console.error("Failed to fetch CSRF token, status:", response.status);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch CSRF token:", error);
      });
  }, []);

  return token;
}

/**
 * Helper function to add CSRF token to fetch options
 */
export function addCsrfToken(
  token: string | null,
  options: RequestInit = {},
): RequestInit {
  if (!token) {
    return options;
  }

  return {
    ...options,
    headers: {
      ...options.headers,
      "x-csrf-token": token,
    },
  };
}
