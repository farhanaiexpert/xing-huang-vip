import { useAdminGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Activity, CheckCircle, Clock, Banknote, Receipt } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function Overview() {
  const { data: stats, isLoading, isError } = useAdminGetStats();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        Error loading stats.
      </div>
    );
  }

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount)).replace('$', 'USDT ');
  };

  const cards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users },
    { title: "Active Users", value: stats.activeUsers, icon: UserCheck },
    { title: "Suspended Users", value: stats.suspendedUsers, icon: UserX },
    { title: "Total Volume", value: formatCurrency(stats.totalVolume), icon: Banknote },
    { title: "Total Bets", value: stats.totalBets, icon: Activity },
    { title: "Settled Bets", value: stats.settledBets, icon: CheckCircle },
    { title: "Pending Bets", value: stats.pendingBets, icon: Clock },
    { title: "Total Transactions", value: stats.totalTransactions, icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-mono">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
