import { useAdminGetTransactions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Transactions() {
  const { data, isLoading } = useAdminGetTransactions();

  const transactions = data?.transactions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs uppercase text-muted-foreground">Time / Ref</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground">User ID</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground">Type</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground text-right">Amount</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const isPositive = Number(tx.amount) > 0;
                  return (
                    <TableRow key={tx.id} className="border-border">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs">{format(new Date(tx.createdAt), "MMM d, HH:mm:ss")}</span>
                          {tx.reference && <span className="text-xs text-muted-foreground font-mono">{tx.reference.slice(0,8)}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{tx.userId ? tx.userId.slice(0,8) : "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[10px] uppercase">{tx.type}</Badge>
                      </TableCell>
                      <TableCell className={`font-mono text-right ${isPositive ? "text-primary" : "text-destructive"}`}>
                        {isPositive ? "+" : ""}{tx.amount} {tx.currency}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.status === "completed" ? "default" : "outline"} className="font-mono text-[10px] uppercase">
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
