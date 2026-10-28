import React, { useState } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  Layers,
  Sparkles,
  Play,
  Zap,
} from 'lucide-react';
import { OfflineQueueItem, Company } from '../types';

interface ScannerModalProps {
  offlineQueue: OfflineQueueItem[];
  setOfflineQueue: React.Dispatch<React.SetStateAction<OfflineQueueItem[]>>;
  companies: Company[];
  onAddNewScannedCard: (newCardData: {
    contactName: string;
    companyName: string;
    title: string;
    mobile: string;
    email: string;
    taxId: string;
    address: string;
    imageUrl: string;
  }) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  offlineQueue,
  setOfflineQueue,
  companies,
  onAddNewScannedCard,
}) => {
  const [isBurstMode, setIsBurstMode] = useState<boolean>(false);
  const [capturedCount, setCapturedCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'batch_upload' | 'queue'>('camera');

  // Simulated card presets for testing rapid scanner
  const MOCK_CARD_PRESETS = [
    {
      contactName: '林志豪',
      companyName: '珈鼎企業有限公司',
      title: '研發部 高級工程師',
      mobile: '0912-987-654',
      email: 'ch.lin@jiading.com.tw',
      taxId: '24519803',
      address: '新北市三重區光復路二段69號',
      imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&auto=format&fit=crop&q=80',
    },
    {
      contactName: '張雅筑',
      companyName: '達鈺精密工業股份有限公司',
      title: '品保部 高級品管師',
      mobile: '0922-334-455',
      email: 'yc.chang@dayu-precision.com.tw',
      taxId: '53128409',
      address: '新北市五股區五工三路88號',
      imageUrl: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=600&auto=format&fit=crop&q=80',
    },
    {
      contactName: '王啟元',
      companyName: '漢陽精密科技股份有限公司',
      title: '智財法務課 專案律師',
      mobile: '0938-112-990',
      email: 'cy.wang@hanyang-tech.com',
      taxId: '80193742',
      address: '新竹市東區科學園區工業東四路25號',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    },
  ];

  const handleCapture = () => {
    const preset = MOCK_CARD_PRESETS[capturedCount % MOCK_CARD_PRESETS.length];
    const newId = `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const mockSha = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newItem: OfflineQueueItem = {
      id: newId,
      blob_url: preset.imageUrl,
      filename: `card_capture_${capturedCount + 1}.jpg`,
      sha256: mockSha,
      status: 'queued',
      progress: 0,
      detected_name: preset.contactName,
      detected_company: preset.companyName,
      timestamp: new Date().toLocaleTimeString(),
    };

    setOfflineQueue((prev) => [newItem, ...prev]);
    setCapturedCount((c) => c + 1);

    if (!isBurstMode) {
      // If not burst mode, trigger immediate processing simulation
      triggerQueueProcessing();
    }
  };

  const triggerQueueProcessing = async () => {
    setIsProcessing(true);

    // Simulate task queue execution: OCR (RapidOCR) -> Entity Resolution -> Complete
    setOfflineQueue((prev) =>
      prev.map((item) => (item.status === 'queued' ? { ...item, status: 'processing_ocr', progress: 40 } : item))
    );

    setTimeout(() => {
      setOfflineQueue((prev) =>
        prev.map((item) =>
          item.status === 'processing_ocr'
            ? { ...item, status: 'resolving_entity', progress: 85 }
            : item
        )
      );

      setTimeout(() => {
        setOfflineQueue((prev) => {
          const completed = prev.map((item) => ({
            ...item,
            status: 'ready_for_review' as const,
            progress: 100,
          }));
          return completed;
        });
        setIsProcessing(false);
      }, 700);
    }, 800);
  };

  const handleApplyToSystem = (item: OfflineQueueItem) => {
    const preset = MOCK_CARD_PRESETS.find((p) => p.contactName === item.detected_name) || MOCK_CARD_PRESETS[0];
    onAddNewScannedCard(preset);
    setOfflineQueue((prev) => prev.filter((q) => q.id !== item.id));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Modes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f4f5] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Camera className="w-5 h-5" />
            </div>
            <span>名片智能採集與掃描</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            模擬流程：預設合成名片 • 記憶體佇列（不保存）• 尚未接入相機、檔案上傳或 OCR
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-lg flex items-center">
            <button
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'camera'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              相機取景
            </button>
            <button
              onClick={() => setActiveTab('batch_upload')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'batch_upload'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              檔案拖曳批次
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors relative ${
                activeTab === 'queue'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              離線佇列
              {offlineQueue.length > 0 && (
                <span className="ml-1.5 bg-blue-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                  {offlineQueue.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mode 1: Camera Preview with Live Edge Detection Box */}
      {activeTab === 'camera' && (
        <div className="space-y-4">
          <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/9] flex items-center justify-center shadow-2xl">
            {/* Camera Viewport Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 flex items-center justify-center">
              <div className="text-center space-y-2 opacity-60">
                <Camera className="w-12 h-12 text-zinc-600 mx-auto animate-pulse" />
                <p className="text-xs text-zinc-500 font-mono">示範取景（未啟用相機）</p>
              </div>
            </div>

            {/* Edge Detection & Perspective Guide Overlay */}
            <div className="relative z-10 w-[85%] sm:w-[65%] aspect-[1.6/1] border-2 border-blue-400/80 rounded-lg shadow-[0_0_25px_rgba(59,130,246,0.2)] flex flex-col justify-between p-3 pointer-events-none">
              {/* Corner marks */}
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-blue-400 -mt-1 -ml-1"></div>
                <div className="w-4 h-4 border-t-2 border-r-2 border-blue-400 -mt-1 -mr-1"></div>
              </div>

              <div className="text-center">
                <span className="bg-black/70 backdrop-blur text-blue-300 text-[11px] font-mono px-2.5 py-1 rounded-full border border-blue-500/30">
                  邊緣偵測吻合 • 水平度 0.2° (最佳)
                </span>
              </div>

              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-blue-400 -mb-1 -ml-1"></div>
                <div className="w-4 h-4 border-b-2 border-r-2 border-blue-400 -mb-1 -mr-1"></div>
              </div>
            </div>

            {/* Top Toolbar overlay */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBurstMode(!isBurstMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur border transition-all ${
                    isBurstMode
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-black/60 text-zinc-300 border-zinc-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isBurstMode ? '連拍模式開啟 (展會快速掃描)' : '單張拍攝模式'}
                </button>
              </div>

              <span className="text-[11px] font-mono bg-black/60 backdrop-blur text-zinc-300 px-3 py-1 rounded-full border border-zinc-700">
                已拍攝 {capturedCount} 張
              </span>
            </div>

            {/* Bottom 1/3 Floating Shutter Control (Mobile optimized) */}
            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6 z-20">
              <button
                id="demo-capture"
                aria-label="新增一張模擬名片"
                onClick={handleCapture}
                className="w-16 h-16 rounded-full bg-zinc-900 border-4 border-blue-500 flex items-center justify-center text-blue-400 shadow-xl hover:scale-105 active:scale-95 transition-all group"
                title="按下快門拍照"
              >
                <div className="w-11 h-11 rounded-full bg-blue-500 group-hover:bg-blue-400 transition-colors"></div>
              </button>
            </div>
          </div>

          {/* Tips under camera */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                支援連拍：展會收到大量名片時，開啟連拍連續按下快門，將自動排入離線佇列批次辨識。
              </span>
            </div>

            {offlineQueue.length > 0 && !isProcessing && (
              <button
                onClick={triggerQueueProcessing}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-blue-400 rounded-lg border border-zinc-700 font-medium shrink-0 flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5" />
                立即啟動佇列處理
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Drag and Drop Batch Upload */}
      {activeTab === 'batch_upload' && (
        <div className="space-y-4">
          <div
            onClick={handleCapture}
            className="border-2 border-dashed border-zinc-800 hover:border-blue-500/60 bg-zinc-900/40 hover:bg-zinc-900/70 rounded-2xl p-10 text-center cursor-pointer transition-all space-y-3"
          >
            <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-blue-400 mx-auto">
              <Upload className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-zinc-200 text-base">
                點擊此處或拖曳多張名片圖檔至此
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                支援 JPG, PNG, HEIC，一次最多 50 張。自動計算 SHA-256 去重並排入背景 OCR。
              </p>
            </div>
            <span className="inline-block text-xs text-blue-400/90 font-mono bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
              + 模擬上傳 1 組展會名片
            </span>
          </div>
        </div>
      )}

      {/* Mode 3 & Real-time Queue Panel */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm text-[#f4f4f5]">
              名片非同步處理佇列 ({offlineQueue.length} 筆)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {isProcessing && (
              <span className="flex items-center gap-1.5 text-xs text-blue-400 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                RapidOCR / VLM 序列化推論中...
              </span>
            )}
            {offlineQueue.length > 0 && !isProcessing && (
              <button
                onClick={triggerQueueProcessing}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                <Play className="w-3 h-3" />
                執行批次處理
              </button>
            )}
          </div>
        </div>

        {offlineQueue.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs">
            目前佇列無等待項目。點選上方快門或上傳區域以新增名片。
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60 max-h-80 overflow-y-auto">
            {offlineQueue.map((item) => (
              <div key={item.id} data-testid="scan-queue-item" className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0">
                    <img src={item.blob_url} alt="縮圖" className="w-full h-full object-cover" />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-200 truncate">
                        {item.detected_name || item.filename}
                      </span>
                      {item.status === 'ready_for_review' && (
                        <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 rounded">
                          辨識完成
                        </span>
                      )}
                      {item.status === 'processing_ocr' && (
                        <span className="text-[10px] bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 px-1.5 rounded">
                          RapidOCR 運算中
                        </span>
                      )}
                      {item.status === 'resolving_entity' && (
                        <span className="text-[10px] bg-purple-950/80 text-purple-400 border border-purple-800/60 px-1.5 rounded">
                          公司歸併比對
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">
                      {item.detected_company || '等待 OCR 抽取公司名...'}
                    </p>
                    <p className="text-[10px] font-mono text-zinc-500">
                      SHA: {item.sha256.substring(0, 12)}... • 拍攝時間: {item.timestamp}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.status === 'ready_for_review' ? (
                    <button
                      onClick={() => handleApplyToSystem(item)}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      匯入名片夾
                    </button>
                  ) : (
                    <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
