import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Copy, Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

/**
 * Private Vault ページ - Admin限定秘匿情報管理
 * マスキング表示がデフォルト、チェックボックスで一時表示
 * 監査ログに記録
 */
export default function Vault() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [revealed, setRevealed] = useState<Record<number, string | null>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});

  // API からデータ取得
  const { data: vaultEntries = [], isLoading } = trpc.vault.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  // Reveal mutation
  const revealMutation = trpc.vault.reveal.useMutation({
    onSuccess: (data, variables) => {
      setRevealed({ ...revealed, [variables.id]: data.actualValue });
    },
  });

  // Copy mutation
  const copyMutation = trpc.vault.copy.useMutation();

  // Admin限定チェック
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-light text-gray-900 mb-2">アクセス拒否</h1>
          <p className="text-gray-600 mb-6">
            Private Vault は Admin のみアクセス可能です
          </p>
          <Button
            onClick={() => setLocation("/")}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white"
          >
            トップに戻る
          </Button>
        </div>
      </div>
    );
  }

  const handleReveal = (id: number) => {
    if (revealed[id]) {
      // 既に表示中なら隠す
      setRevealed({ ...revealed, [id]: null });
    } else {
      // API を呼んで実際の値を取得
      revealMutation.mutate({ id });
    }
  };

  const handleCopy = async (id: number, maskedValue: string) => {
    // 表示中の値があればそれをコピー、なければ API を呼んで取得
    let valueToCopy = revealed[id];
    if (!valueToCopy) {
      const result = await copyMutation.mutateAsync({ id });
      valueToCopy = result.actualValue;
    }
    
    navigator.clipboard.writeText(valueToCopy || maskedValue);
    setCopied({ ...copied, [id]: true });
    setTimeout(() => setCopied({ ...copied, [id]: false }), 2000);
  };

  // カテゴリ一覧を動的に取得
  const categories = Array.from(new Set(vaultEntries.map((e) => e.category)));

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-light text-gray-900">Private Vault</h1>
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : vaultEntries.length === 0 ? (
          <div className="text-center py-12">
            <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">秘匿情報がまだ登録されていません</p>
          </div>
        ) : (
          /* カテゴリ別表示 */
          <div className="space-y-12">
            {categories.map((category) => {
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
                                {revealed[item.id] || item.maskedValue}
                              </code>
                              <button
                                onClick={() => handleReveal(item.id)}
                                disabled={revealMutation.isPending}
                                className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                                title={revealed[item.id] ? "隠す" : "表示"}
                              >
                                {revealed[item.id] ? (
                                  <EyeOff className="w-4 h-4 text-gray-600" />
                                ) : (
                                  <Eye className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                              <button
                                onClick={() => handleCopy(item.id, item.maskedValue)}
                                disabled={copyMutation.isPending}
                                className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
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
                                コピーしました（監査ログに記録）
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
        )}

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
