import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Edit2 } from "lucide-react";


export default function HandoverBag() {

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    notes: "",
  });

  const { data: items = [], refetch } = trpc.handover.getItems.useQuery();
  const createMutation = trpc.handover.createItem.useMutation();
  const updateMutation = trpc.handover.updateItem.useMutation();
  const deleteMutation = trpc.handover.deleteItem.useMutation();
  const toggleMutation = trpc.handover.toggleItem.useMutation();

  const handleOpenDialog = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || "",
        location: item.location,
        notes: item.notes || "",
      });
    } else {
      setEditingItem(null);
      setFormData({ name: "", description: "", location: "", notes: "" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({ name: "", description: "", location: "", notes: "" });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.location) {
      alert("品名と保管場所は必須です");
      return;
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          ...formData,
          isChecked: editingItem.isChecked,
        });
        alert("物品を更新しました");
      } else {
        await createMutation.mutateAsync(formData);
        alert("物品を追加しました");
      }
      handleCloseDialog();
      refetch();
    } catch (error) {
      alert("操作に失敗しました");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この物品を削除してもよろしいですか？")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      alert("物品を削除しました");
      refetch();
    } catch (error) {
      alert("削除に失敗しました");
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await toggleMutation.mutateAsync({ id });
      refetch();
    } catch (error) {
      alert("チェック状态の更新に失敗しました");
    }
  };

  const checkedCount = items.filter(item => item.isChecked).length;
  const totalCount = items.length;
  const completionPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-light text-gray-900 mb-2">引き継ぎ袋</h1>
          <p className="text-gray-600">鍵、印鑑、帳簿などの物品チェックリスト</p>
        </div>

        {/* 進捗バー */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">チェックリスト進捗</h2>
            <span className="text-2xl font-bold text-blue-600">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-3">
            {checkedCount} / {totalCount} 件完了
          </p>
        </Card>

        {/* アクションボタン */}
        <div className="mb-8">
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            物品を追加
          </Button>
        </div>

        {/* 物品リスト */}
        <div className="space-y-4">
          {items.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">物品がまだ登録されていません</p>
            </Card>
          ) : (
            items.map(item => (
              <Card key={item.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* チェックボックス */}
                  <div className="pt-1">
                    <Checkbox
                      checked={item.isChecked}
                      onCheckedChange={() => handleToggle(item.id)}
                      className="w-6 h-6"
                    />
                  </div>

                  {/* 物品情報 */}
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${item.isChecked ? "line-through text-gray-400" : "text-gray-900"}`}>
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                    <div className="flex gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-500">保管場所：</span>
                        <span className="text-gray-900 font-medium">{item.location}</span>
                      </div>
                      {item.notes && (
                        <div>
                          <span className="text-gray-500">備考：</span>
                          <span className="text-gray-900">{item.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(item)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 物品追加・編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "物品を編集" : "物品を追加"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">品名 *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例：鍵、印鑑、帳簿"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">説明</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="例：玄関の鍵、朱肉付き"
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">保管場所 *</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="例：組長宅、倉庫、管理室"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">備考</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="例：返却期限、特別な注意事項"
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingItem ? "更新を保存" : "追加"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
