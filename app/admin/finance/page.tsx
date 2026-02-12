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
import { toast } from 'sonner';

interface CashFlowData {
  openingBalance: number;
  cashCollections: number;
  cardCollections: number;
  upiCollections: number;
  bankCollections: number;
  onlineCollections: number;
  cashRefunds: number;
  expenses: number;
  totalCollections: number;
  closingBalance: number;
  lastReconciled: string | null;
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
    bankCollections: 0,
    onlineCollections: 0,
    cashRefunds: 0,
    expenses: 0,
    totalCollections: 0,
    closingBalance: 0,
    lastReconciled: null
  });
  const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
  const [newExpense, setNewExpense] = useState({ amount: '', description: '' });

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
      toast.error("Error", {
        description: "Failed to load financial data",
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
        toast.success("Success", {
          description: "Daily reconciliation completed successfully",
        });
        fetchFinancialData();
      } else {
        toast.error("Error", {
          description: result.error || "Failed to reconcile",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to complete reconciliation",
      });
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.description) {
      toast.error("Error", {
        description: "Please enter both amount and description",
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
        toast.success("Success", {
          description: "Expense added successfully",
        });
        setNewExpense({ amount: '', description: '' });
        fetchFinancialData();
      } else {
        toast.error("Error", {
          description: result.error || "Failed to add expense",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to add expense",
      });
    }
  };

  const totalCollections = (cashFlow?.cashCollections || 0) + (cashFlow?.cardCollections || 0) + (cashFlow?.upiCollections || 0) + (cashFlow?.bankCollections || 0) + (cashFlow?.onlineCollections || 0);
  const expectedBalance = (cashFlow?.openingBalance || 0) + totalCollections + (cashFlow?.cashRefunds || 0) - (cashFlow?.expenses || 0);
  const balanceDifference = (cashFlow?.closingBalance || 0) - expectedBalance;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleReconcile}
          className="w-full sm:w-auto bg-[#f26e24] hover:bg-[#e05d13] h-10 px-6 font-bold rounded-xl shadow-sm transition-all"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Complete Reconciliation
        </Button>
      </div>

      {/* Cash Flow Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <Card className="border-gray-100 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 bg-gray-50/50">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Opening Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600 tracking-tight">
              ₹{cashFlow.openingBalance.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 bg-gray-50/50">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Total Collections
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600 tracking-tight">
              ₹{totalCollections.toLocaleString()}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-3 pt-3 border-t border-gray-50">
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase">Cash</span>
                <p className="text-[11px] font-bold text-gray-700 leading-none">₹{cashFlow.cashCollections.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase">Card</span>
                <p className="text-[11px] font-bold text-gray-700 leading-none">₹{cashFlow.cardCollections.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase">UPI</span>
                <p className="text-[11px] font-bold text-gray-700 leading-none">₹{cashFlow.upiCollections.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase">Online</span>
                <p className="text-[11px] font-bold text-gray-700 leading-none">₹{cashFlow.onlineCollections.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm overflow-hidden sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2 bg-gray-50/50">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-orange-600" />
              Closing Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600 tracking-tight">
              ₹{cashFlow.closingBalance.toLocaleString()}
            </div>
            <div className={`text-xs font-bold mt-2 flex items-center gap-1.5 ${balanceDifference === 0 ? 'text-green-600' : 'text-red-600'}`}>
              <span className="opacity-70">Expected:</span> ₹{expectedBalance.toLocaleString()}
              {balanceDifference !== 0 && (
                <Badge variant="destructive" className="h-4 text-[9px] font-black px-1 rounded">
                  {balanceDifference > 0 ? '+' : ''}₹{balanceDifference.toLocaleString()}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Transactions List */}
        <Card className="border-gray-100 shadow-sm flex flex-col h-full">
          <CardHeader className="py-4 border-b border-gray-50">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              Today's Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-3 md:px-6">
            <div className="space-y-2 max-h-[300px] md:max-h-96 overflow-y-auto pr-1">
              {transactions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed text-gray-400 font-bold text-sm">No transactions today</div>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-orange-200 transition-all">
                    <div>
                      <div className="font-bold text-sm text-gray-900 leading-tight">{transaction.customer_name}</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mt-0.5">
                        {transaction.booking_id} • {transaction.payment_method}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-black ${transaction.type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                        {transaction.type === 'refund' ? '-' : '+'}₹{transaction.amount.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase">
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
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="py-4 border-b border-gray-50">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-900">Add Daily Expense</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount" className="text-xs font-bold text-gray-600 uppercase ml-1">Amount (₹)</Label>
              <Input
                id="expense-amount"
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                className="h-10 border-gray-300 rounded-xl focus:ring-orange-500/20"
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expense-description" className="text-xs font-bold text-gray-600 uppercase ml-1">Description</Label>
              <Input
                id="expense-description"
                value={newExpense.description}
                onChange={(prev) => setNewExpense(e => ({ ...e, description: prev.target.value }))}
                placeholder="Fuel, snacks, etc."
                className="h-10 border-gray-300 rounded-xl focus:ring-orange-500/20"
              />
            </div>

            <Button onClick={handleAddExpense} className="w-full h-10 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all">
              Add Expense
            </Button>

            <Separator className="bg-gray-100" />

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-tight">Today's Expenses</span>
                <span className="text-sm font-black text-gray-900">₹{(cashFlow?.expenses || 0).toLocaleString()}</span>
              </div>
              <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100 text-right">
                <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-tight">Daily Refunds</span>
                <span className="text-sm font-black text-gray-900">₹{(cashFlow?.cashRefunds || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Status */}
      <Card className="border-gray-100 shadow-sm border-t-2 border-t-orange-500 overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-3 gap-2 text-center items-center">
            <div>
              <div className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-wider">Expected</div>
              <div className="text-xs md:text-base font-bold text-gray-900 tracking-tight">₹{(expectedBalance || 0).toLocaleString()}</div>
            </div>
            <div className="border-x border-gray-100 py-1">
              <div className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-wider">Actual</div>
              <div className="text-xs md:text-base font-bold text-gray-900 tracking-tight">₹{(cashFlow?.closingBalance || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider ${Math.abs(balanceDifference) < 1 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(balanceDifference) < 1 ? 'STATUS' : 'DIFF'}
              </div>
              <div className={`text-xs md:text-base font-black tracking-tight ${Math.abs(balanceDifference) < 1 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(balanceDifference) < 1 ? 'BALANCED' : `₹${(balanceDifference || 0).toLocaleString()}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
