import { useAdminGetBets, useAdminSettleBet, getAdminGetBetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Bets() {
  const { data, isLoading } = useAdminGetBets();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const settleBetMutation = useAdminSettleBet();

  const onSettle = (id: string, status: "won" | "lost" | "void") => {
    settleBetMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminGetBetsQueryKey() });
        toast({ title: `Bet marked as ${status}` });
      }
    });
  };

  const bets = data?.bets || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Bets Ledger</h1>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs uppercase text-muted-foreground">ID / Time</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground">User ID</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground text-right">Stake</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground text-right">Odds</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground text-right">Return</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : bets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No bets found
                  </TableCell>
                </TableRow>
              ) : (
                bets.map((bet) => (
                  <TableRow key={bet.id} className="border-border">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{bet.id.slice(0,8)}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(bet.createdAt), "MMM d, HH:mm")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{bet.userId ? bet.userId.slice(0,8) : "N/A"}</TableCell>
                    <TableCell className="font-mono text-right">{bet.stake} {bet.currency}</TableCell>
                    <TableCell className="font-mono text-right">{bet.totalOdds}</TableCell>
                    <TableCell className="font-mono text-right text-primary">{bet.potentialReturn} {bet.currency}</TableCell>
                    <TableCell>
                      <Badge variant={bet.status === "won" ? "default" : bet.status === "lost" ? "destructive" : bet.status === "pending" ? "secondary" : "outline"} className="font-mono text-[10px] uppercase">
                        {bet.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {bet.status === "pending" ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs border-primary text-primary hover:bg-primary/20" onClick={() => onSettle(bet.id, "won")}>W</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-destructive text-destructive hover:bg-destructive/20" onClick={() => onSettle(bet.id, "lost")}>L</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onSettle(bet.id, "void")}>V</Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">SETTLED</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
