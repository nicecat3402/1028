import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { OnPremApp } from './OnPremApp';
import '../index.css';
import './onprem.css';

class Recovery extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="onprem p-8 space-y-4" role="alert"><h1>畫面發生錯誤</h1><p>已成功儲存的資料仍在伺服器；未送出的表單請重新輸入。</p><button onClick={() => location.reload()}>重新載入</button></main> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<StrictMode><Recovery><OnPremApp /></Recovery></StrictMode>);
