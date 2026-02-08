import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const VAULT_PIN = "1234";

const SUGGESTED_CATEGORIES = [
  "銀行情報",
  "契約情報",
  "パスワード",
  "連絡先",
  "その他",
];

type VaultEntry = {
  id: number;
  category: string;
  key: string;
  maskedValue: string;
  actualValue: string;
  classification: "public" | "internal" | "confidential";
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function Vault() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // PIN protection state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [pinError, setPinError] = useState<string>("");
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Vault content state
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [revealTimers, setRevealTimers] = useState<Record<number, ReturnType<typeof setTimeout>>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState("");
  const [formKey, setFormKey] = useState("");
  const [formMaskedValue, setFormMaskedValue] = useState("");
  const [formActualValue, setFormActualValue] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // tRPC queries and mutations
  const { data: entries = [], isLoading } = trpc.data.getVaultEntries.useQuery(undefined, {
    enabled: isUnlocked,
  });

  const createEntry = trpc.data.createVaultEntry.useMutation({
    onSuccess: () => {
      utils.data.getVaultEntries.invalidate();
      resetForm();
    },
  });

  const updateEntry = trpc.data.updateVaultEntry.useMutation({
    onSuccess: () => {
      utils.data.getVaultEntries.invalidate();
      resetForm();
    },
  });

  const deleteEntry = trpc.data.deleteVaultEntry.useMutation({
    onSuccess: () => {
      utils.data.getVaultEntries.invalidate();
    },
  });

  // Cleanup reveal timers on unmount
  useEffect(() => {
    return () => {
      Object.values(revealTimers).forEach((timer) => clearTimeout(timer));
    };
  }, [revealTimers]);

  const resetForm = () => {
    setFormCategory("");
    setFormKey("");
    setFormMaskedValue("");
    setFormActualValue("");
    setShowAddForm(false);
    setEditingId(null);
    setShowCategoryDropdown(false);
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setPinError("");

    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handlePinSubmit();
    }
  };

  const handlePinSubmit = () => {
    const enteredPin = pin.join("");
    if (enteredPin.length < 4) {
      setPinError("4桁のPINを入力してください");
      return;
    }
    if (enteredPin === VAULT_PIN) {
      setIsUnlocked(true);
    } else {
      setPinError("PINが正しくありません");
      setPin(["", "", "", ""]);
      pinRefs.current[0]?.focus();
    }
  };

  const handleReveal = useCallback(
    (id: number) => {
      if (revealed[id]) {
        // Hide immediately
        setRevealed((prev) => ({ ...prev, [id]: false }));
        if (revealTimers[id]) {
          clearTimeout(revealTimers[id]);
          setRevealTimers((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      } else {
        // Reveal with 10-second auto-hide
        setRevealed((prev) => ({ ...prev, [id]: true }));
        const timer = setTimeout(() => {
          setRevealed((prev) => ({ ...prev, [id]: false }));
          setRevealTimers((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 10000);
        setRevealTimers((prev) => ({ ...prev, [id]: timer }));
      }
    },
    [revealed, revealTimers]
  );

  const handleCopy = (id: number, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [id]: false })), 2000);
  };

  const handleEdit = (entry: VaultEntry) => {
    setEditingId(entry.id);
    setFormCategory(entry.category);
    setFormKey(entry.key);
    setFormMaskedValue(entry.maskedValue);
    setFormActualValue(entry.actualValue);
    setShowAddForm(false);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("この項目を削除しますか？")) {
      deleteEntry.mutate({ id });
    }
  };

  const handleSubmit = () => {
    if (!formCategory.trim() || !formKey.trim() || !formMaskedValue.trim() || !formActualValue.trim()) {
      return;
    }

    if (editingId !== null) {
      updateEntry.mutate({
        id: editingId,
        category: formCategory.trim(),
        key: formKey.trim(),
        maskedValue: formMaskedValue.trim(),
        actualValue: formActualValue.trim(),
      });
    } else {
      createEntry.mutate({
        category: formCategory.trim(),
        key: formKey.trim(),
        maskedValue: formMaskedValue.trim(),
        actualValue: formActualValue.trim(),
      });
    }
  };

  // Group entries by category
  const groupedEntries = (entries as VaultEntry[]).reduce<Record<string, VaultEntry[]>>(
    (acc, entry) => {
      if (!acc[entry.category]) {
        acc[entry.category] = [];
      }
      acc[entry.category].push(entry);
      return acc;
    },
    {}
  );

  // Get unique categories from existing entries for suggestions
  const existingCategories = Array.from(
    new Set((entries as VaultEntry[]).map((e) => e.category))
  );
  const allCategories = Array.from(
    new Set([...SUGGESTED_CATEGORIES, ...existingCategories])
  );

  // ---------- PIN Screen ----------
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-full max-w-sm px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
              <Lock className="w-7 h-7 text-gray-700" />
            </div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              管理者認証
            </h1>
            <p className="text-sm text-gray-500 font-light">
              4桁のPINを入力してください
            </p>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  pinRefs.current[index] = el;
                }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(index, e)}
                className="w-14 h-14 text-center text-2xl font-light border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                autoFocus={index === 0}
              />
            ))}
          </div>

          {pinError && (
            <p className="text-sm text-red-600 text-center mb-4">{pinError}</p>
          )}

          <Button
            onClick={handlePinSubmit}
            className="w-full bg-gray-900 text-white hover:bg-gray-800 font-light h-11"
          >
            認証する
          </Button>

          <div className="mt-8 text-center">
            <button
              onClick={() => setLocation("/")}
              className="text-sm text-gray-400 hover:text-gray-600 font-light inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              トップに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Entry Form (inline, used for Add & Edit) ----------
  const renderForm = () => (
    <div className="border border-gray-200 rounded-lg p-6 mb-8 bg-gray-50/50">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-light text-gray-900">
          {editingId !== null ? "項目を編集" : "新規項目を追加"}
        </h3>
        <button
          onClick={resetForm}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category */}
        <div className="relative">
          <label className="block text-xs text-gray-500 mb-1.5 font-light">
            カテゴリ
          </label>
          <Input
            value={formCategory}
            onChange={(e) => {
              setFormCategory(e.target.value);
              setShowCategoryDropdown(true);
            }}
            onFocus={() => setShowCategoryDropdown(true)}
            onBlur={() =>
              setTimeout(() => setShowCategoryDropdown(false), 150)
            }
            placeholder="カテゴリを入力"
            className="font-light"
          />
          {showCategoryDropdown && formCategory.length === 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm max-h-40 overflow-y-auto">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setFormCategory(cat);
                    setShowCategoryDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          {showCategoryDropdown && formCategory.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm max-h-40 overflow-y-auto">
              {allCategories
                .filter((cat) =>
                  cat.toLowerCase().includes(formCategory.toLowerCase())
                )
                .map((cat) => (
                  <button
                    key={cat}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setFormCategory(cat);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {cat}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Key */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-light">
            項目名
          </label>
          <Input
            value={formKey}
            onChange={(e) => setFormKey(e.target.value)}
            placeholder="例: 銀行口座番号"
            className="font-light"
          />
        </div>

        {/* Masked Value */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-light">
            マスク表示値
          </label>
          <Input
            value={formMaskedValue}
            onChange={(e) => setFormMaskedValue(e.target.value)}
            placeholder="例: ****-****-1234"
            className="font-light"
          />
        </div>

        {/* Actual Value */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-light">
            実際の値
          </label>
          <Input
            value={formActualValue}
            onChange={(e) => setFormActualValue(e.target.value)}
            placeholder="例: 1234-5678-9012"
            className="font-light"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <Button
          onClick={resetForm}
          variant="ghost"
          className="font-light text-gray-600"
        >
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            !formCategory.trim() ||
            !formKey.trim() ||
            !formMaskedValue.trim() ||
            !formActualValue.trim() ||
            createEntry.isPending ||
            updateEntry.isPending
          }
          className="bg-gray-900 text-white hover:bg-gray-800 font-light"
        >
          {editingId !== null ? "更新" : "追加"}
        </Button>
      </div>
    </div>
  );

  // ---------- Vault Content ----------
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-medium text-gray-900">
                  Private Vault
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded text-xs text-gray-600 font-light">
                  <Shield className="w-3 h-3" />
                  管理者認証済み
                </span>
              </div>
              <p className="text-sm text-gray-500 font-light">
                秘匿情報の管理（取扱注意）
              </p>
            </div>
            <button
              onClick={() => setLocation("/")}
              className="text-sm text-gray-400 hover:text-gray-600 font-light inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              戻る
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Add Button */}
        {!showAddForm && editingId === null && (
          <div className="mb-8">
            <Button
              onClick={() => setShowAddForm(true)}
              variant="outline"
              className="font-light text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              新規項目を追加
            </Button>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && renderForm()}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-20">
            <p className="text-sm text-gray-400 font-light">読み込み中...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && entries.length === 0 && (
          <div className="text-center py-20 border border-dashed border-gray-200 rounded-lg">
            <Lock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-light">
              秘匿情報はまだ登録されていません
            </p>
          </div>
        )}

        {/* Grouped Entries */}
        <div className="space-y-10">
          {Object.entries(groupedEntries).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-lg font-light text-gray-900 mb-4 pb-2 border-b border-gray-100">
                {category}
              </h2>
              <div className="space-y-3">
                {items.map((entry) => (
                  <div key={entry.id}>
                    {/* Edit Form inline */}
                    {editingId === entry.id ? (
                      renderForm()
                    ) : (
                      <div className="group p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-sm font-medium text-gray-900">
                                {entry.key}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-gray-100 px-3 py-1.5 rounded font-mono text-gray-600 select-all">
                                {revealed[entry.id]
                                  ? entry.actualValue
                                  : entry.maskedValue}
                              </code>
                              <button
                                onClick={() => handleReveal(entry.id)}
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                title={revealed[entry.id] ? "隠す" : "表示"}
                              >
                                {revealed[entry.id] ? (
                                  <EyeOff className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <Eye className="w-4 h-4 text-gray-500" />
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  handleCopy(entry.id, entry.actualValue)
                                }
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                title="コピー"
                              >
                                <Copy
                                  className={`w-4 h-4 ${
                                    copied[entry.id]
                                      ? "text-green-600"
                                      : "text-gray-500"
                                  }`}
                                />
                              </button>
                              {copied[entry.id] && (
                                <span className="text-xs text-green-600 font-light">
                                  コピー済み
                                </span>
                              )}
                            </div>
                            {entry.updatedAt && (
                              <p className="text-xs text-gray-400 font-light mt-2">
                                更新:{" "}
                                {new Date(entry.updatedAt).toLocaleDateString(
                                  "ja-JP",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                              title="編集"
                            >
                              <Edit2 className="w-4 h-4 text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-1.5 hover:bg-red-50 rounded transition-colors"
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
