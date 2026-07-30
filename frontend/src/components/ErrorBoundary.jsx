import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-red-500/50 bg-slate-900 p-6 text-slate-100">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mt-2 text-sm text-slate-300">{this.state.error.message || 'Unexpected error'}</p>
        <button
          className="mt-4 rounded bg-emerald-500 px-4 py-2 font-semibold text-black"
          onClick={() => window.location.reload()}
        >
          Reload app
        </button>
      </div>
    );
  }
}
