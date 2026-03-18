"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(
      `[ErrorBoundary:${this.props.componentName}]`,
      error,
      info.componentStack
    );
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="glass-card rounded-xl p-6 text-center"
          style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}
        >
          <p className="text-red-400 text-sm mb-3">
            Something went wrong in {this.props.componentName}. Tap to retry.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <p className="text-xs text-red-300/50 mt-3 font-mono text-left break-all">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
