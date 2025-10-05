"use client";

import { useState, useEffect } from "react";

interface HealthCheck {
  name: string;
  status: "pass" | "fail";
  message: string;
  duration: number;
}

interface HealthReport {
  overall: "healthy" | "unhealthy";
  checks: HealthCheck[];
  timestamp: string;
  environment: string;
}

export default function HealthPage() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runHealthChecks = async (): Promise<void> => {
    setIsRunning(true);
    console.log("Starting health checks...");

    try {
      console.log("Fetching health check data...");
      const response = await fetch("/api/health-check-public");
      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`Health check failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Health check data received:", data);

      const simplifiedChecks = data.checks.map(
        (check: { status: string; [key: string]: unknown }) => ({
          ...check,
          status: check.status === "warning" ? "pass" : check.status,
        })
      );

      setReport({
        overall: data.overall === "degraded" ? "healthy" : data.overall,
        checks: simplifiedChecks,
        timestamp: data.timestamp,
        environment: data.environment,
      });
      console.log("Health check report set successfully");
    } catch (error) {
      console.error("Health check error:", error);
      setReport({
        overall: "unhealthy",
        checks: [
          {
            name: "Health Check System",
            status: "fail",
            message: error instanceof Error ? error.message : "Unknown error",
            duration: 0,
          },
        ],
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
    }

    setIsRunning(false);
    console.log("Health checks completed");
  };

  /**
   * Auto-run health checks on page load and every 30 seconds
   */
  useEffect(() => {
    // Run immediately on page load
    runHealthChecks();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (!isRunning) {
        runHealthChecks();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isRunning]);

  /**
   * Get status color classes
   */
  const getStatusColor = (status: string): string => {
    return status === "pass"
      ? "text-green-600 bg-green-50 border-green-200"
      : "text-red-600 bg-red-50 border-red-200";
  };

  /**
   * Get overall status color classes
   */
  const getOverallColor = (overall: string): string => {
    return overall === "healthy"
      ? "text-green-600 bg-green-50 border-green-200"
      : "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  System Health Check
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Simple monitoring - success or failure only
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Auto-refreshes every 30 seconds
                </div>
                <button
                  onClick={runHealthChecks}
                  disabled={isRunning}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? "Running..." : "Refresh Now"}
                </button>
              </div>
            </div>
          </div>

          {/* Health Report */}
          {report && (
            <div className="p-6">
              {/* Overall Status */}
              <div
                className={`mb-6 p-4 rounded-lg border ${getOverallColor(report.overall)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Overall Status: {report.overall.toUpperCase()}
                    </h2>
                    <p className="text-sm mt-1">
                      Environment: {report.environment} | Last checked:{" "}
                      {new Date(report.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {report.checks.filter((c) => c.status === "pass").length}{" "}
                      / {report.checks.length}
                    </div>
                    <div className="text-sm">checks passed</div>
                  </div>
                </div>
              </div>

              {/* Individual Checks */}
              <div className="space-y-3">
                {report.checks.map((check, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getStatusColor(check.status)}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      <div>
                        <p className="font-medium">{check.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {!report && !isRunning && (
            <div className="p-6 text-center text-gray-500">
              Loading health checks...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
