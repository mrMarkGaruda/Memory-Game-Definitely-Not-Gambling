import { Component } from 'react'

/**
 * Generic error boundary to prevent the entire app from crashing.
 * Displays a gentle fallback UI and offers a reload button.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h1>Something went wrong.</h1>
          <p>The interface hit an unexpected error. Details have been logged to the console (dev only).</p>
          <pre className="error-fallback__msg">{String(this.state.error)}</pre>
          <button type="button" onClick={this.handleReload}>Reload App</button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
