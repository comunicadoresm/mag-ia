import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCreditHistory } from '@/hooks/useCreditHistory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

const sourceLabels: Record<string, string> = {
  script_generation: 'Geração de Roteiro',
  script_adjustment: 'Ajuste de Roteiro',
  chat_messages: 'Chat com Agente',
  plan_renewal: 'Renovação do Plano',
  subscription_renewal: 'Renovação Assinatura',
  bonus_purchase: 'Compra Avulsa',
  admin_adjustment: 'Ajuste Admin',
  trial_credits: 'Créditos Trial',
};

const typeLabels: Record<string, string> = {
  consumption: 'Consumo',
  plan_renewal: 'Renovação',
  subscription_renewal: 'Assinatura',
  bonus_purchase: 'Compra',
  admin_adjustment: 'Ajuste',
};

export function PurchaseHistoryTable() {
  const { transactions, isLoading } = useCreditHistory(15);

  return (
    <Card className="card-cm">
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">Histórico de Transações</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transação ainda.</p>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs text-right">Créditos</TableHead>
                  <TableHead className="text-xs text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(tx.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs">{typeLabels[tx.type] || tx.type}</TableCell>
                    <TableCell className="text-xs">{sourceLabels[tx.source] || tx.source}</TableCell>
                    <TableCell className={`text-xs text-right font-medium ${tx.amount < 0 ? 'text-destructive' : 'text-success'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">{tx.balance_after}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
