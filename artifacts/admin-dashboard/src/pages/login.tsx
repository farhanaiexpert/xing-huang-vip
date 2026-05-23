import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  login: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, login } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && user.role === "admin") {
      setLocation("/overview");
    }
  }, [user, setLocation]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      login: "",
      password: "",
    },
  });

  const loginMutation = useLogin();

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    loginMutation.mutate({
      data: {
        login: values.login,
        password: values.password,
      }
    }, {
      onSuccess: (data) => {
        login(data.token);
      },
      onError: (err: any) => {
        toast({
          title: "Login failed",
          description: err.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold text-xl font-mono tracking-tighter mb-4 shadow-lg shadow-primary/20">
              CB
            </div>
            <h1 className="text-3xl font-bold tracking-tight">System Access</h1>
            <p className="text-muted-foreground text-sm">Authenticate to enter CupBett Operations</p>
          </div>

          <div className="bg-card border border-border p-6 rounded-lg shadow-xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="login"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Username</FormLabel>
                      <FormControl>
                        <Input placeholder="admin" {...field} className="font-mono bg-background" />
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
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="font-mono bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full font-mono uppercase tracking-wider" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Authenticating..." : "Initialize Session"}
                </Button>
              </form>
            </Form>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-mono uppercase opacity-50">Unauthorized access prohibited</p>
          </div>
        </div>
      </div>
    </div>
  );
}
