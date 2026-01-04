import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const loginMutation = trpc.auth.login.useMutation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // バリデーション
    if (!formData.email || !formData.password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }

    try {
      await loginMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
      });

      // ログイン成功後、ホームページにリダイレクト
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "メールアドレスまたはパスワードが正しくありません");
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
              ログイン
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

              {/* メールアドレス */}
              <div>
                <label className="block text-white font-light mb-2 text-sm">
                  メールアドレス
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
                  パスワード
                </label>
                <Input
                  type="password"
                  placeholder="パスワードを入力"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/50 focus:ring-white/20"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-white text-black hover:bg-gray-100 py-3 rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginMutation.isPending ? "ログイン中..." : "ログイン"}
              </Button>

              {/* Register Link */}
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setLocation("/register")}
                  className="text-white/70 hover:text-white font-light text-sm transition-colors"
                >
                  アカウントをお持ちでない方はこちら
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
