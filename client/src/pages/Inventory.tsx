import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Package, Plus, Edit, Save, Upload, Image, X } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Inventory() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: inventory = [], refetch } = trpc.inventory.list.useQuery();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (!isAuthenticated) {
    return <div className="page-container flex items-center justify-center min-h-screen">ログインが必要です</div>;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-purple-700 text-white py-6">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-4">
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
              <p className="text-purple-100">写真・数量・保管場所・状態</p>
            </div>
          </div>
          <CreateInventoryDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            onSuccess={() => {
              refetch();
              setIsCreateOpen(false);
            }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {inventory.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((item: any) => (
              <Card key={item.id} className="p-4 relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <EditInventoryDialog item={item} onSuccess={() => refetch()} />
                </div>
                {item.photo ? (
                  <img
                    src={item.photo}
                    alt={item.name}
                    className="w-full h-40 object-cover rounded-md mb-3"
                  />
                ) : (
                  <div className="w-full h-40 bg-muted rounded-md mb-3 flex items-center justify-center">
                    <Image className="w-12 h-12 text-muted-foreground" />
                  </div>
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
            <p className="text-muted-foreground mb-4">備品がまだ登録されていません</p>
            <CreateInventoryDialog
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              onSuccess={() => {
                refetch();
                setIsCreateOpen(false);
              }}
            />
          </Card>
        )}
      </main>
    </div>
  );
}

function PhotoUpload({ currentPhoto, onPhotoChange }: { currentPhoto: string; onPhotoChange: (url: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentPhoto);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ファイルサイズは5MB以下にしてください");
      return;
    }

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // アップロード
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/inventory-photo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("アップロードに失敗しました");
      }

      const data = await response.json();
      onPhotoChange(data.url);
      toast.success("写真をアップロードしました");
    } catch (error) {
      toast.error("アップロードに失敗しました");
      setPreview(currentPhoto);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">写真</label>
      {preview ? (
        <div className="relative">
          <img src={preview} alt="プレビュー" className="w-full h-40 object-cover rounded-md" />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={() => {
              setPreview("");
              onPhotoChange("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className="w-full h-40 border-2 border-dashed border-muted-foreground/25 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">クリックして写真を選択</span>
          <span className="text-xs text-muted-foreground">（最大5MB）</span>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      {uploading && (
        <p className="text-sm text-muted-foreground">アップロード中...</p>
      )}
    </div>
  );
}

function CreateInventoryDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState("");
  const [tags, setTags] = useState("");
  const [editorName, setEditorName] = useState("");

  const createInventory = trpc.edit.createInventory.useMutation({
    onSuccess: () => {
      toast.success("備品を登録しました");
      setName("");
      setQty(1);
      setLocation("");
      setCondition("");
      setNotes("");
      setPhoto("");
      setTags("");
      setEditorName("");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-white text-purple-700 hover:bg-purple-50">
          <Plus className="w-4 h-4 mr-2" />
          備品を追加
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>備品を追加</DialogTitle>
          <DialogDescription>新しい備品を登録します</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <PhotoUpload currentPhoto={photo} onPhotoChange={setPhoto} />
          <div>
            <label className="text-sm font-medium">品名</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="トング"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">数量</label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div>
              <label className="text-sm font-medium">保管場所</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="倉庫A"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">状態</label>
            <Input
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="良好"
            />
          </div>
          <div>
            <label className="text-sm font-medium">備考</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="備品に関するメモ"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">タグ（カンマ区切り）</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="河川清掃, 清掃用具"
            />
          </div>
          <div>
            <label className="text-sm font-medium">登録者名（任意）</label>
            <Input
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              placeholder="山田太郎"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => createInventory.mutate({
              name,
              qty,
              location,
              condition: condition || undefined,
              notes: notes || undefined,
              photo: photo || undefined,
              tags: tags.split(",").map(t => t.trim()).filter(Boolean),
              editorName: editorName || undefined,
            })}
            disabled={!name || !location || createInventory.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            備品を登録
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditInventoryDialog({ item, onSuccess }: { item: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.qty);
  const [location, setLocation] = useState(item.location);
  const [condition, setCondition] = useState(item.condition || "");
  const [notes, setNotes] = useState(item.notes || "");
  const [photo, setPhoto] = useState(item.photo || "");
  const [editorName, setEditorName] = useState("");

  const updateInventory = trpc.edit.updateInventory.useMutation({
    onSuccess: () => {
      toast.success("備品を更新しました");
      setOpen(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" className="h-8 w-8">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>備品を編集</DialogTitle>
          <DialogDescription>備品情報を編集します</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <PhotoUpload currentPhoto={photo} onPhotoChange={setPhoto} />
          <div>
            <label className="text-sm font-medium">品名</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">数量</label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div>
              <label className="text-sm font-medium">保管場所</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">状態</label>
            <Input
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">備考</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">編集者名（任意）</label>
            <Input
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              placeholder="山田太郎"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => updateInventory.mutate({
              id: item.id,
              name,
              qty,
              location,
              condition: condition || undefined,
              notes: notes || undefined,
              photo: photo || undefined,
              editorName: editorName || undefined,
            })}
            disabled={updateInventory.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            更新を保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
