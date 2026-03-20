import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import api from "../services/api";
import { useAuthStore } from "../stores/authStore";
import type { User } from "../types";

export default function TikTokCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(
        `TikTok認証エラー: ${searchParams.get("error_description") || errorParam}`
      );
      return;
    }

    if (!code || !state) {
      setError("認証コードが見つかりません");
      return;
    }

    const exchangeCode = async () => {
      try {
        // Send code to backend
        const { data: tokenData } = await api.post<{
          access_token: string;
          token_type: string;
          is_new_user: boolean;
          tiktok_display_name: string | null;
        }>("/auth/tiktok/callback", { code, state });

        // Fetch user profile with new token
        const { data: user } = await api.get<User>("/auth/me", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        setAuth(user, tokenData.access_token);
        navigate("/dashboard");
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || "TikTok認証に失敗しました";
        setError(msg);
      }
    };

    exchangeCode();
  }, [searchParams, navigate, setAuth]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            ログインに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">TikTokアカウントを接続中...</p>
      </div>
    </div>
  );
}
