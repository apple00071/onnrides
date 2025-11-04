'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, DollarSign, CreditCard, Banknote, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CashFlowData {
  openingBalance: number;
  cashCollections: number;
  cardCollections: number;
  upiCollections: number;
  cashRefunds: number;
  expenses: number;
  closingBalance: number;
  lastReconciled: string;
}

interface DailyTransaction {
  id: string;
  booking_id: string;
  customer_name: string;
  amount: number;
  payment_method: string;
  type: 'collection' | 'refund';
  timestamp: string;
}

export default function FinancialReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [cashFlow, setCashFlow] = useState<CashFlowData>({
    openingBalance: 0,
    cashCollections: 0,
    cardCollections: 0,
    upiCollections: 0,
    cashRefunds: 0,
    expenses: 0,
    closingBalance: 0,
    lastReconciled: new Date().toISOString()
  });
  const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
  const [newExpense, setNewExpense] = useState({ amount: '', description: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch today's transactions
      const response = await fetch(`/api/admin/finance/daily?date=${today}`);
      const result = await response.json();

      if (result.success) {
        setCashFlow(result.data.cashFlow);
        setTransactions(result.data.transactions);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async () => {
    try {
      const response = await fetch('/api/admin/finance/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          closingBalance: cashFlow.closingBalance,
          date: format(new Date(), 'yyyy-MM-dd')
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Daily reconciliation completed successfully",
        });
        fetchFinancialData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reconcile",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete reconciliation",
        variant: "destructive"
      });
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.description) {
      toast({
        title: "Error",
        description: "Please enter both amount and description",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/finance/expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(newExpense.amount),
          description: newExpense.description,
          date: format(new Date(), 'yyyy-MM-dd')
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Expense added successfully",
        });
        setNewExpense({ amount: '', description: '' });
        fetchFinancialData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add expense",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive"
      });
    }
  };

  const totalCollections = cashFlow.cashCollections + cashFlow.cardCollections + cashFlow.upiCollections;
  const expectedBalance = cashFlow.openingBalance + totalCollections - cashFlow.cashRefunds - cashFlow.expenses;
  const balanceDifference = cashFlow.closingBalance - expectedBalance;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Daily Financial Reconciliation</h1>
          <p className="text-gray-600">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
        </div>
        <Button onClick={handleReconcile} className="bg-[#f26e24] hover:bg-[#e05d13]">
          <Calculator className="w-4 h-4 mr-2" />
          Complete Reconciliation
        </Button>
      </div>

      {/* Cash Flow Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Opening Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{cashFlow.openingBalance.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Total Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{totalCollections.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 mt-1 space-y-1">
              <div>Cash: ₹{cashFlow.cashCollections.toLocaleString()}</div>
              <div>Card: ₹{cashFlow.cardCollections.toLocaleString()}</div>
              <div>UPI: ₹{cashFlow.upiCollections.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Banknote className="w-5 h-5 text-orange-600" />
              Closing Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₹{cashFlow.closingBalance.toLocaleString()}
            </div>
            <div className={`text-sm mt-1 ${balanceDifference === 0 ? 'text-green-600' : 'text-red-600'}`}>
              Expected: ₹{expectedBalance.toLocaleString()}
              {balanceDifference !== 0 && (
                <span className="ml-2">
                  ({balanceDifference > 0 ? '+' : ''}₹{balanceDifference.toLocaleString()})
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Today's Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No transactions today</p>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{transaction.customer_name}</div>
                      <div className="text-sm text-gray-600">
                        {transaction.booking_id} • {transaction.payment_method}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${transaction.type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                        {transaction.type === 'refund' ? '-' : '+'}₹{transaction.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(transaction.timestamp), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Management */}
        <Card>
          <CardHeader>
            <CardTitle>Add Daily Expense</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount (₹)</Label>
              <Input
                id="expense-amount"
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter expense amount"
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-description">Description</Label>
              <Input
                id="expense-description"
                value={newExpense.description}
                onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Fuel, snacks, maintenance, etc."
              />
            </div>

            <Button onClick={handleAddExpense} className="w-full">
              Add Expense
            </Button>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Today's Expenses:</span>
                <span className="font-medium">₹{cashFlow.expenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cash Refunds:</span>
                <span className="font-medium">₹{cashFlow.cashRefunds.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Status */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">Expected Balance</div>
              <div className="text-lg font-bold">₹{expectedBalance.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Actual Balance</div>
              <div className="text-lg font-bold">₹{cashFlow.closingBalance.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className={`text-sm ${balanceDifference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balanceDifference === 0 ? 'Balanced' : 'Difference'}
              </div>
              <div className={`text-lg font-bold ${balanceDifference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balanceDifference === 0 ? '✓' : `₹${balanceDifference.toLocaleString()}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
