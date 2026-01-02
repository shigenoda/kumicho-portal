import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Package, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function Inventory() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const { data: inventory = [] } = trpc.data.getInventory.useQuery();

  if (!isAuthenticated) {
    return <div className="page-container flex items-center justify-center min-h-screen">ログインが必要です</div>;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-cover bg-center text-white py-6" style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container flex items-center gap-4 relative">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" />
              倉庫・備品台帳
            </h1>
            <p className="text-white/70">写真・数量・保管場所・状态</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {inventory.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((item: any) => (
              <Card key={item.id} className="p-4 relative">
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                    className="p-2 hover:bg-gray-100 rounded transition-colors text-blue-600"
                    title="編集"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("この備品を削除しますか？")) {
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded transition-colors text-red-600"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {item.photo && (
                  <img
                    src={item.photo}
                    alt={item.name}
                    className="w-full h-40 object-cover rounded-md mb-3"
                  />
                )}
                <h3 className="font-semibold mb-2">{item.name}</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>📦 数量: {item.qty}個</p>
                  <p>📍 保管場所: {item.location}</p>
                  {item.condition && <p>🔧 状態: {item.condition}</p>}
                  {item.lastCheckedAt && (
                    <p>📅 最終棚卸: {new Date(item.lastCheckedAt).toLocaleDateString("ja-JP")}</p>
                  )}
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {item.tags.map((tag: string) => (
                      <span key={tag} className="inline-block px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {item.notes && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                    {item.notes}
                  </p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">備品がまだ登録されていません</p>
          </Card>
        )}
      </main>
    </div>
  );
}
