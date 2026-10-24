import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled Application Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="shell" style={{ display: 'grid', placeItems: 'center', minHeight: '80vh', padding: '2rem' }}>
          <section className="panel" style={{ maxWidth: '480px', textAlign: 'center' }} role="alert">
            <p className="eyebrow" style={{ color: 'var(--danger, #dc2626)' }}>Application Error</p>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Something went wrong</h1>
            <p className="intro" style={{ marginBottom: '1.5rem', color: '#666' }}>
              An unexpected error occurred while rendering this view.
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  overflowX: 'auto',
                  marginBottom: '1.5rem',
                  color: '#475569'
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button type="button" onClick={this.handleReload}>
                Reload page
              </button>
              <button type="button" className="sec-clear-btn" onClick={this.handleReset}>
                Go to home
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
