import { Component } from 'react';

function ErrorFallback({ error, onReset }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-[var(--color-surface)] rounded-2xl border border-red-100 p-8 max-w-md w-full text-center shadow-sm">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Something went wrong</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">{error?.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={onReset}
          className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={() => this.reset()} />;
    }
    return this.props.children;
  }
}
