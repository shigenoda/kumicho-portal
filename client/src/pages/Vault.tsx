import { Button } from "@/components/ui/button";
import { AlertCircle, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

/**
 * Private Vault ページ - 秘匿情報管理
 * マスキング表示がデフォルト、チェックボックスで一時表示
 * 監査ログに記録
 */
export default function Vault() {
  const [, setLocation] = useLocation();
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});

  // サンプルデータ
  const vaultEntries = [
    {
      id: 1,
      category: "連絡先",
      key: "管理会社電話",
      maskedValue: "****-****-****",
      actualValue: "0120-123-4567",
    },
    {
      id: 2,
      category: "連絡先",
      key: "町内会会長メール",
      maskedValue: "****@example.com",
      actualValue: "yamada@example.com",
    },
    {
      id: 3,
      category: "鍵/保管",
      key: "倉庫鍵の保管場所",
      maskedValue: "****",
      actualValue: "管理会社事務所 鍵ボックス No.5",
    },
    {
      id: 4,
      category: "重要書類",
      key: "規約ファイルの保管場所",
      maskedValue: "****",
      actualValue: "倉庫内 棚 C-2 段目 青いファイル",
    },
    {
      id: 5,
      category: "金銭関連",
      key: "会費集金口座",
      maskedValue: "****-****-****",
      actualValue: "〇〇銀行 支店 普通 1234567",
    },
  ];

  const handleCopy = (id: number, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied({ ...copied, [id]: true });
    setTimeout(() => setCopied({ ...copied, [id]: false }), 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-cover bg-center border-b border-gray-200 z-50" style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative">
          <h1 className="text-xl font-light text-white">Private Vault</h1>
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="text-white hover:text-white/70"
          >
            ← トップに戻る
          </Button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-24 pb-16 max-w-7xl mx-auto px-6">
        {/* 警告 */}
        <div className="mb-8 p-4 border border-red-200 bg-red-50 rounded">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-medium mb-1">秘匿情報の取扱注意</p>
              <p className="leading-relaxed">
                このセクションの情報は Admin
                限定です。アクセスと操作はすべて監査ログに記録されます。個人情報の取扱に注意してください。
              </p>
            </div>
          </div>
        </div>

        {/* カテゴリ別表示 */}
        <div className="space-y-12">
          {["連絡先", "鍵/保管", "重要書類", "金銭関連"].map((category) => {
            const items = vaultEntries.filter((item) => item.category === category);
            if (items.length === 0) return null;

            return (
              <section key={category}>
                <h2 className="text-xl font-light text-gray-900 mb-6">{category}</h2>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border border-gray-200 rounded hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 mb-2">
                            {item.key}
                          </h3>
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-gray-100 px-3 py-2 rounded font-mono text-gray-600">
                              {revealed[item.id]
                                ? item.actualValue
                                : item.maskedValue}
                            </code>
                            <button
                              onClick={() =>
                                setRevealed({
                                  ...revealed,
                                  [item.id]: !revealed[item.id],
                                })
                              }
                              className="p-2 hover:bg-gray-100 rounded transition-colors"
                              title={revealed[item.id] ? "隠す" : "表示"}
                            >
                              {revealed[item.id] ? (
                                <EyeOff className="w-4 h-4 text-gray-600" />
                              ) : (
                                <Eye className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                handleCopy(
                                  item.id,
                                  revealed[item.id]
                                    ? item.actualValue
                                    : item.maskedValue
                                )
                              }
                              className="p-2 hover:bg-gray-100 rounded transition-colors"
                              title="コピー"
                            >
                              <Copy
                                className={`w-4 h-4 ${
                                  copied[item.id]
                                    ? "text-green-600"
                                    : "text-gray-600"
                                }`}
                              />
                            </button>
                          </div>
                          {copied[item.id] && (
                            <p className="text-xs text-green-600 mt-2">
                              コピーしました
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* 注記 */}
        <div className="mt-16 p-6 bg-gray-50 rounded border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            このセクションについて
          </h3>
          <ul className="text-sm text-gray-600 space-y-2 leading-relaxed">
            <li>
              • すべてのアクセス・表示・コピー操作は監査ログに記録されます
            </li>
            <li>
              • 秘匿情報は Admin のみアクセス可能です
            </li>
            <li>
              • マスキング表示がデフォルトです。表示ボタンで一時的に確認できます
            </li>
            <li>
              • 個人情報の取扱に注意してください
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
