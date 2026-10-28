import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('應用程式發生錯誤', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main role="alert" className="max-w-xl mx-auto p-8 space-y-4 text-zinc-200">
          <h1 className="text-xl font-bold">畫面暫時無法顯示</h1>
          <p>發生未預期錯誤。重新載入可回到示範資料；尚未匯出的變更將遺失。</p>
          <button className="bg-blue-600 rounded px-4 py-3" onClick={() => window.location.reload()}>
            重新載入網站
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
