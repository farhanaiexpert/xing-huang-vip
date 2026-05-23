import { useEffect, useRef } from "react";
import { useAdminGetCommissionSettings, useAdminUpdateCommissionSettings, getAdminGetCommissionSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  settings: z.array(z.object({
    level: z.number(),
    rate: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1, "Must be a rate between 0 and 1"),
  })),
});

export default function Commissions() {
  const { data, isLoading } = useAdminGetCommissionSettings();
  const updateMutation = useAdminUpdateCommissionSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      settings: []
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "settings"
  });

  const isInitialized = useRef(false);

  useEffect(() => {
    if (data?.settings && !isInitialized.current) {
      form.reset({
        settings: data.settings.map(s => ({ level: s.level, rate: s.rate }))
      });
      isInitialized.current = true;
    }
  }, [data, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updateMutation.mutate({ data: { settings: values.settings } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminGetCommissionSettingsQueryKey() });
        toast({ title: "Commission settings updated" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Commissions</h1>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Affiliate Commission Rates</CardTitle>
          <CardDescription>Set the percentage rate for each referral level (e.g. 0.05 for 5%)</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-4 p-4 border border-border rounded-md bg-background">
                  <div className="flex-1">
                    <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Level {form.getValues(`settings.${index}.level`)}</div>
                    <div className="text-xs text-muted-foreground">Direct referrals</div>
                  </div>
                  <div className="w-32">
                    <FormField
                      control={form.control}
                      name={`settings.${index}.rate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} className="font-mono text-right" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
              
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
