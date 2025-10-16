"use client";

import { useEffect, useState } from "react";

/**
 * Helper to read CSRF token from cookie
 */
function getCsrfTokenFromCookie(): string | null {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "csrf-token") {
      return value;
    }
  }
  return null;
}

/**
 * Hook to get and manage CSRF token for client-side requests
 * The token is generated server-side and stored in a cookie
 * This hook reads it from the cookie for use in API requests
 */
export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Try to read existing token from cookie first
    const existingToken = getCsrfTokenFromCookie();

    if (existingToken) {
      setToken(existingToken);
      return;
    }

    // If no token exists, request one from the server
    fetch("/api/csrf", { credentials: "include" })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          const tokenFromResponse = data.token;

          // Use token from response since cookie might not be immediately available
          if (tokenFromResponse) {
            setToken(tokenFromResponse);
          } else {
            // Fallback: try reading from cookie
            const newToken = getCsrfTokenFromCookie();
            setToken(newToken);
          }
        } else {
          console.error("Failed to fetch CSRF token, status:", response.status);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch CSRF token:", error);
      });
  }, []); // Empty dependency array - only run once on mount

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
