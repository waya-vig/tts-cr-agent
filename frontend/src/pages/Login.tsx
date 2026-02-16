import { useState } from "react";
import { useNavigate } from "react-router";
import api from "../services/api";
import { useAuthStore } from "../stores/authStore";
import type { Token, User } from "../types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await api.post("/auth/register", {
          email,
          password,
          company_name: companyName || null,
        });
      }

      const { data: tokenData } = await api.post<Token>("/auth/login", {
        email,
        password,
      });

      const { data: user } = await api.get<User>("/auth/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      setAuth(user, tokenData.access_token);
      navigate("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "認証に失敗しました";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.25_0.05_260)_0%,transparent_50%)]" />

      <Card className="relative w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">TTS CR Agent</CardTitle>
          <CardDescription>
            {isRegister ? "アカウントを作成" : "アカウントにログイン"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="company">会社名（任意）</Label>
                <Input
                  id="company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? "処理中..."
                : isRegister
                  ? "アカウント作成"
                  : "ログイン"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {isRegister
              ? "既にアカウントをお持ちですか？"
              : "アカウントをお持ちでないですか？"}{" "}
            <Button
              variant="link"
              size="sm"
              className="px-1"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
            >
              {isRegister ? "ログイン" : "新規登録"}
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
