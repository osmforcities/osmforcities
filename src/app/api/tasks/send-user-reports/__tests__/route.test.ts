import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../route";
import type { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/tasks/user-report", () => ({
  generateNextUserReport: vi.fn(),
  markReportSent: vi.fn(),
}));

import { sendEmail } from "@/lib/email";
import { generateNextUserReport, markReportSent } from "@/lib/tasks/user-report";

const mockSendEmail = vi.mocked(sendEmail);
const mockGenerateNextUserReport = vi.mocked(generateNextUserReport);
const mockMarkReportSent = vi.mocked(markReportSent);

describe("/api/tasks/send-user-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_ROUTE_SECRET = "test-secret";
  });

  const mockReport = {
    userId: "user-1",
    userEmail: "user@example.com",
    userLanguage: "en" as const,
    emailContent: {
      subject: "Test Report",
      html: "<p>Test</p>",
      text: "Test",
    },
    reportData: {
      reportsFrequency: "DAILY" as const,
      totalDatasets: 1,
      publicDatasetsCount: 1,
      latestChangeDate: "2025-01-01",
    },
  };

  it("returns 401 without Bearer token", async () => {
    const req = new Request("http://localhost/api/tasks/send-user-reports", {
      method: "POST",
    });

    const response = await POST(req as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Missing or invalid authorization header");
  });

  it("returns 401 with invalid Bearer token", async () => {
    const req = new Request("http://localhost/api/tasks/send-user-reports", {
      method: "POST",
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });

    const response = await POST(req as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid secret");
  });

  it("returns success when no users due for report", async () => {
    mockGenerateNextUserReport.mockResolvedValue(null);

    const req = new Request("http://localhost/api/tasks/send-user-reports", {
      method: "POST",
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await POST(req as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.usersNotified).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockMarkReportSent).not.toHaveBeenCalled();
  });

  it("sends email and updates lastReportSent on success", async () => {
    mockGenerateNextUserReport.mockResolvedValue(mockReport);
    mockSendEmail.mockResolvedValue(undefined);
    mockMarkReportSent.mockResolvedValue(undefined);

    const req = new Request("http://localhost/api/tasks/send-user-reports", {
      method: "POST",
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await POST(req as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: "user@example.com",
      subject: "Test Report",
      html: "<p>Test</p>",
      text: "Test",
    });
    expect(mockMarkReportSent).toHaveBeenCalledWith("user-1");
  });

  it("does not update lastReportSent if email send fails", async () => {
    mockGenerateNextUserReport.mockResolvedValue(mockReport);
    mockSendEmail.mockRejectedValue(new Error("Email service down"));

    const req = new Request("http://localhost/api/tasks/send-user-reports", {
      method: "POST",
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await POST(req as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to execute send-user-reports task");
    expect(mockSendEmail).toHaveBeenCalled();
    expect(mockMarkReportSent).not.toHaveBeenCalled();
  });

  it("succeeds even if markReportSent fails (email already sent)", async () => {
    mockGenerateNextUserReport.mockResolvedValue(mockReport);
    mockSendEmail.mockResolvedValue(undefined);
    mockMarkReportSent.mockRejectedValue(new Error("Database connection lost"));

    const req = new Request("http://localhost/api/tasks/send-user-reports", {
      method: "POST",
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await POST(req as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalled();
    expect(mockMarkReportSent).toHaveBeenCalled();
  });
});
