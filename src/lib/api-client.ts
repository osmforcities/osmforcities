import { z } from "zod";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    schema: z.ZodSchema<T>,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Response validation failed for endpoint:", endpoint);
        console.error("Response data:", data);
        console.error("Validation errors:", error.errors);
        throw new Error(
          `Invalid response format from server: ${error.errors
            .map((e) => e.message)
            .join(", ")}`
        );
      }
      throw error;
    }
  }

  // Generic HTTP methods with validation
  async get<T>(endpoint: string, schema: z.ZodSchema<T>): Promise<T> {
    return this.request<T>(endpoint, schema, { method: "GET" });
  }

  async post<T>(
    endpoint: string,
    schema: z.ZodSchema<T>,
    data?: unknown
  ): Promise<T> {
    return this.request<T>(endpoint, schema, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    schema: z.ZodSchema<T>,
    data?: unknown
  ): Promise<T> {
    return this.request<T>(endpoint, schema, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(
    endpoint: string,
    schema: z.ZodSchema<T>,
    data?: unknown
  ): Promise<T> {
    return this.request<T>(endpoint, schema, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(
    endpoint: string,
    schema: z.ZodSchema<T>,
    data?: unknown
  ): Promise<T> {
    return this.request<T>(endpoint, schema, {
      method: "DELETE",
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
