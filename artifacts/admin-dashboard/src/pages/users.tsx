import { useState } from "react";
import { useAdminGetUsers, useAdminUpdateUserStatus, useAdminUpdateUserRole, useAdminAdjustBalance, getAdminGetUsersQueryKey, UserResponse } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MoreHorizontal, Search, Loader2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

const adjustSchema = z.object({
  amount: z.string().refine(val => !isNaN(Number(val)), "Must be a number"),
  note: z.string().optional(),
});

export default function Users() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdminGetUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const updateStatusMutation = useAdminUpdateUserStatus();
  const updateRoleMutation = useAdminUpdateUserRole();
  const adjustBalanceMutation = useAdminAdjustBalance();

  const [adjustDialogUser, setAdjustDialogUser] = useState<UserResponse | null>(null);

  const form = useForm<z.infer<typeof adjustSchema>>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      amount: "",
      note: "",
    },
  });

  const onUpdateStatus = (id: string, status: "active" | "suspended" | "banned") => {
    updateStatusMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
        toast({ title: "Status updated" });
      }
    });
  };

  const onUpdateRole = (id: string, role: "user" | "admin") => {
    updateRoleMutation.mutate({ id, data: { role } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
        toast({ title: "Role updated" });
      }
    });
  };

  const onAdjustSubmit = (values: z.infer<typeof adjustSchema>) => {
    if (!adjustDialogUser) return;
    adjustBalanceMutation.mutate({ 
      id: adjustDialogUser.id, 
      data: { amount: values.amount, note: values.note } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
        toast({ title: "Balance adjusted" });
        setAdjustDialogUser(null);
        form.reset();
      }
    });
  };

  const users = data?.users || [];
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-8 bg-card border-border font-mono"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs uppercase text-muted-foreground">ID</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground">User</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground">Role</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-border">
                    <TableCell className="font-mono text-xs">{user.id.slice(0,8)}...</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.username}</span>
                        {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} className="font-mono text-[10px] uppercase">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "default" : user.status === "suspended" ? "secondary" : "destructive"} className="font-mono text-[10px] uppercase">
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setAdjustDialogUser(user)}>
                            <DollarSign className="mr-2 h-4 w-4" /> Adjust Balance
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Status</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onUpdateStatus(user.id, "active")} disabled={user.status === "active"}>Set Active</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdateStatus(user.id, "suspended")} disabled={user.status === "suspended"}>Set Suspended</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdateStatus(user.id, "banned")} disabled={user.status === "banned"} className="text-destructive">Set Banned</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Role</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onUpdateRole(user.id, "user")} disabled={user.role === "user"}>Make User</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdateRole(user.id, "admin")} disabled={user.role === "admin"}>Make Admin</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!adjustDialogUser} onOpenChange={(o) => !o && setAdjustDialogUser(null)}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAdjustSubmit)} className="space-y-4 pt-4">
              <div className="text-sm mb-4">Adjusting balance for <span className="font-bold">{adjustDialogUser?.username}</span></div>
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (USDT)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 50 or -50" {...field} className="font-mono bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Reason for adjustment" {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAdjustDialogUser(null)}>Cancel</Button>
                <Button type="submit" disabled={adjustBalanceMutation.isPending}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
