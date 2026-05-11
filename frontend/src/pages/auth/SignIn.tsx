import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import useAuth from "@hooks/useAuth";

const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email deve ter um formato válido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type SignInFormValues = z.infer<typeof signInSchema>;

const SignInPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = location.state?.message;
  const emailFromRegister = location.state?.email;

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: emailFromRegister || "",
      password: "",
    },
  });

  useEffect(() => {
    document.title = "Entrar | MyFinances";
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        navigate(location.pathname, { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, navigate, location.pathname]);

  const onSubmit = async (values: SignInFormValues) => {
    try {
      await signIn(values.email, values.password);
      navigate("/dashboard");
    } catch {
      form.setError("root", {
        message: "Email ou senha incorretos",
      });
    }
  };

  return (
    <AuthShell
      eyebrow="Acesso"
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta para continuar gerenciando suas finanças."
    >
      {successMessage && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-[color:var(--success)]/30 bg-[color:var(--success)]/10 p-3">
          <CheckCircle2 className="size-4 shrink-0 text-[color:var(--success)] mt-0.5" />
          <p className="text-sm text-[color:var(--success)]">{successMessage}</p>
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      autoComplete="current-password"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-center text-sm text-destructive">
              {form.formState.errors.root.message}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Spinner className="mr-2 size-4" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>

          <div className="space-y-2 pt-2 text-center">
            <a
              href="/auth/reset-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Esqueceu sua senha?
            </a>
            <p className="text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link
                to="/auth/sign-up"
                className="font-medium text-primary hover:underline"
              >
                Criar conta
              </Link>
            </p>
          </div>
        </form>
      </Form>
    </AuthShell>
  );
};

export default SignInPage;
