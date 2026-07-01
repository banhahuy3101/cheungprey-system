import { Component } from "react";

export default class TabErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryKey: 0 };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("TabErrorBoundary:", error, info);
  }
  handleRetry = () => {
    this.setState((s) => ({ hasError: false, error: null, retryKey: s.retryKey + 1 }));
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ maxWidth: "90%", width: 520, padding: "1.5rem", color: "#c00", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
            <h3 style={{ marginTop: 0 }}>Something went wrong</h3>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem", background: "#f8f8f8", padding: "0.75rem", borderRadius: 6, maxHeight: 200, overflow: "auto" }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button className="btn btn-secondary" onClick={this.handleRetry}>Try again</button>
              <button className="btn btn-secondary" onClick={() => window.location.reload()}>Reload page</button>
            </div>
          </div>
        </div>
      );
    }
    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
