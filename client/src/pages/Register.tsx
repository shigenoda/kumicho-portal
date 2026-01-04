import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Register() {
  const [, setLocation] = useLocation();
  const registerMutation = trpc.auth.register.useMutation();
  const [formData, setFormData] = useState({
    householdId: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // バリデーション
    if (!formData.householdId || !formData.name || !formData.email || !formData.password) {
      setError("すべての項目を入力してください");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (formData.password.length < 8) {
      setError("パスワードは8文字以上にしてください");
      return;
    }

    try {
      await registerMutation.mutateAsync({
        householdId: formData.householdId,
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      alert("登録が完了しました！ログインしてください。");
      setLocation("/login");
    } catch (err: any) {
      setError(err.message || "登録に失敗しました。もう一度お試しください。");
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
        <div className="container py-6 flex items-center relative">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-light">戻る</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-light text-white mb-4 tracking-tight">
              新規登録
            </h1>
            <p className="text-lg text-white/70 font-light">
              グリーンピア 組長ポータル
            </p>
          </div>

          {/* Form */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 text-sm">
                  {error}
                </div>
              )}

              {/* 部屋番号 */}
              <div>
                <label className="block text-white font-light mb-2 text-sm">
                  部屋番号 <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="例: 101"
                  value={formData.householdId}
                  onChange={(e) => setFormData({ ...formData, householdId: e.target.value })}
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/50 focus:ring-white/20"
                  required
                />
              </div>

              {/* 名前 */}
              <div>
                <label className="block text-white font-light mb-2 text-sm">
                  お名前 <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="例: 山田太郎"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/50 focus:ring-white/20"
                  required
                />
              </div>

              {/* メールアドレス */}
              <div>
                <label className="block text-white font-light mb-2 text-sm">
                  メールアドレス <span className="text-red-400">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/50 focus:ring-white/20"
                  required
                />
              </div>

              {/* パスワード */}
              <div>
                <label className="block text-white font-light mb-2 text-sm">
                  パスワード <span className="text-red-400">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="8文字以上"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/50 focus:ring-white/20"
                  required
                  minLength={8}
                />
              </div>

              {/* パスワード確認 */}
              <div>
                <label className="block text-white font-light mb-2 text-sm">
                  パスワード（確認） <span className="text-red-400">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="もう一度入力"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/50 focus:ring-white/20"
                  required
                  minLength={8}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-white text-black hover:bg-gray-100 py-3 rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registerMutation.isPending ? "登録中..." : "登録する"}
              </Button>

              {/* Login Link */}
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="text-white/70 hover:text-white font-light text-sm transition-colors"
                >
                  すでにアカウントをお持ちの方はこちら
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
