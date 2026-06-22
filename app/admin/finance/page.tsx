'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Calculator, 
  IndianRupee, 
  CreditCard, 
  Banknote, 
  FileText, 
  Calendar as CalendarIcon, 
  Search, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

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
  isReconciled?: boolean;
  reconciledClosingBalance?: number | null;
  reconciledDifference?: number | null;
}

interface DailyTransaction {
  id: string;
  booking_id?: string;
  customer_name: string;
  amount: number;
  payment_method: string;
  type: 'collection' | 'refund' | 'expense';
  timestamp: string;
}

export default function FinancialReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
    lastReconciled: null,
    isReconciled: false,
    reconciledClosingBalance: null,
    reconciledDifference: null
  });
  const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'collection' | 'refund' | 'expense'>('all');
  const [newExpense, setNewExpense] = useState({ amount: '', description: '' });
  const [actualClosingBalance, setActualClosingBalance] = useState<string>('');

  useEffect(() => {
    fetchFinancialData(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (cashFlow.isReconciled && cashFlow.reconciledClosingBalance !== null && cashFlow.reconciledClosingBalance !== undefined) {
      setActualClosingBalance(cashFlow.reconciledClosingBalance.toString());
    } else {
      setActualClosingBalance('');
    }
  }, [cashFlow]);

  const fetchFinancialData = async (dateObj: Date) => {
    try {
      setLoading(true);
      const queryDate = format(dateObj, 'yyyy-MM-dd');

      const response = await fetch(`/api/admin/finance/daily?date=${queryDate}`);
      const result = await response.json();

      if (result.success) {
        setCashFlow(result.data.cashFlow);
        setTransactions(result.data.transactions);
      } else {
        toast.error("Error", {
          description: result.error || "Failed to load financial data",
        });
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
    const reconciliationValue = actualClosingBalance !== '' ? parseFloat(actualClosingBalance) : expectedBalance;

    try {
      const response = await fetch('/api/admin/finance/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          closingBalance: reconciliationValue,
          date: format(selectedDate, 'yyyy-MM-dd')
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Success", {
          description: `Daily reconciliation for ${format(selectedDate, 'dd MMM yyyy')} completed successfully`,
        });
        fetchFinancialData(selectedDate);
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
          date: format(selectedDate, 'yyyy-MM-dd')
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Success", {
          description: "Expense added successfully",
        });
        setNewExpense({ amount: '', description: '' });
        fetchFinancialData(selectedDate);
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
  const expectedBalance = (cashFlow?.openingBalance || 0) + totalCollections - Math.abs(cashFlow?.cashRefunds || 0) - Math.abs(cashFlow?.expenses || 0);
  
  const balanceDifference = (cashFlow.isReconciled && cashFlow.reconciledDifference !== null && cashFlow.reconciledDifference !== undefined
    ? cashFlow.reconciledDifference 
    : (actualClosingBalance !== '' ? parseFloat(actualClosingBalance) - expectedBalance : 0)) ?? 0;

  // Filters and search logic
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.booking_id && t.booking_id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTab = activeTab === 'all' || t.type === activeTab;
    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  return (
    <div className="py-2 w-full space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight uppercase flex items-center gap-2">
            Finance & Ledger
            {cashFlow.isReconciled ? (
              <Badge className="bg-green-50 text-green-700 hover:bg-green-50 border-none px-2.5 py-0.5 text-xs font-semibold rounded-full gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
              </Badge>
            ) : (
              <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-none px-2.5 py-0.5 text-xs font-semibold rounded-full gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Pending Audit
              </Badge>
            )}
          </h1>
          <p className="text-gray-500 text-sm font-normal mt-1">Audit daily cash flow, record operational expenses, and lock reconciliation logs.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto justify-start text-left font-semibold h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 transition-colors"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>{format(selectedDate, "dd MMM yyyy")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Opening Balance */}
        <Card className="border-gray-100 shadow-sm overflow-hidden border-l-4 border-l-emerald-500 hover:shadow-md transition-all bg-white">
          <CardHeader className="pb-2 bg-gray-50/40">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              Opening Balance
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-1">
            <div className="text-2xl font-semibold text-emerald-600 tracking-tight">
              {formatCurrency(cashFlow.openingBalance)}
            </div>
            <p className="text-[11px] text-gray-400 font-normal leading-normal pt-1">
              Brought forward from previous reconciled day
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Daily Collections */}
        <Card className="border-gray-100 shadow-sm overflow-hidden border-l-4 border-l-blue-500 hover:shadow-md transition-all bg-white">
          <CardHeader className="pb-2 bg-gray-50/40">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              Total Collections
              <CreditCard className="w-4 h-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-blue-600 tracking-tight">
              {formatCurrency(totalCollections)}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] text-gray-400 font-normal uppercase tracking-wider">Today's Net Income:</span>
              <span className="text-xs font-semibold text-emerald-600">
                {formatCurrency(totalCollections - Math.abs(cashFlow.cashRefunds || 0) - Math.abs(cashFlow.expenses || 0))}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-medium text-gray-400 uppercase">Cash</span>
                <span className="text-xs font-semibold text-gray-700">{formatCurrency(cashFlow.cashCollections)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-medium text-gray-400 uppercase">UPI</span>
                <span className="text-xs font-semibold text-gray-700">{formatCurrency(cashFlow.upiCollections)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-medium text-gray-400 uppercase">Card</span>
                <span className="text-xs font-semibold text-gray-700">{formatCurrency(cashFlow.cardCollections)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-medium text-gray-400 uppercase">Online</span>
                <span className="text-xs font-semibold text-gray-700">{formatCurrency(cashFlow.onlineCollections)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Expected Closing Balance */}
        <Card className="border-gray-100 shadow-sm overflow-hidden border-l-4 border-l-slate-700 hover:shadow-md transition-all bg-white">
          <CardHeader className="pb-2 bg-gray-50/40">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              Expected Balance
              <Calculator className="w-4 h-4 text-slate-700" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-1">
            <div className="text-2xl font-semibold text-slate-900 tracking-tight">
              {formatCurrency(expectedBalance)}
            </div>
            <p className="text-[11px] text-gray-400 font-normal leading-normal pt-1">
              Opening + Collections - Refunds - Expenses
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Ledger Transactions (7 cols) */}
        <Card className="border-gray-100 shadow-sm lg:col-span-7 flex flex-col h-[580px] overflow-hidden bg-white">
          <CardHeader className="py-4 border-b border-gray-50 space-y-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#f26e24]" />
                Daily Ledger Log
              </CardTitle>
              <Badge variant="outline" className="text-gray-500 font-medium border-gray-200 px-2 py-0.5 rounded-md bg-white">
                {filteredTransactions.length} Items
              </Badge>
            </div>
            {/* Search and Tabs */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by customer name or Booking ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 border-gray-200 rounded-xl text-sm focus:ring-[#f26e24]/10 focus:border-[#f26e24]"
                />
              </div>
              <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                {(['all', 'collection', 'refund', 'expense'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all",
                      activeTab === tab
                        ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                        : "text-gray-400 hover:text-gray-700"
                    )}
                  >
                    {tab === 'collection' ? 'Payments' : tab === 'refund' ? 'Refunds' : tab === 'expense' ? 'Expenses' : 'All'}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 overflow-y-auto flex-1 bg-gray-50/20 px-4 md:px-6">
            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 font-medium text-sm">
                  No matching records found for this date.
                </div>
              ) : (
                filteredTransactions.map((transaction) => {
                  const isRefund = transaction.type === 'refund';
                  const isExpense = transaction.type === 'expense';
                  
                  return (
                    <div 
                      key={transaction.id} 
                      className={cn(
                        "flex justify-between items-center p-3.5 bg-white border rounded-xl shadow-xs transition-all hover:shadow-sm",
                        isRefund 
                          ? "border-l-4 border-l-red-500 border-gray-100" 
                          : isExpense 
                            ? "border-l-4 border-l-amber-500 border-gray-100" 
                            : "border-l-4 border-l-emerald-500 border-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          isRefund 
                            ? "bg-red-50 text-red-500" 
                            : isExpense 
                              ? "bg-amber-50 text-amber-500" 
                              : "bg-emerald-50 text-emerald-500"
                        )}>
                          {isRefund ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : isExpense ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900 leading-tight">
                            {transaction.customer_name}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1 flex items-center gap-1.5">
                            {transaction.booking_id && (
                              <span>{transaction.booking_id}</span>
                            )}
                            {transaction.booking_id && <span>•</span>}
                            <Badge variant="secondary" className="px-1 py-0 h-3.5 text-[8px] font-semibold uppercase rounded bg-gray-100 text-gray-600 border-none">
                              {transaction.payment_method}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "text-sm font-semibold tracking-tight",
                          isRefund 
                            ? "text-red-600" 
                            : isExpense 
                              ? "text-amber-600" 
                              : "text-emerald-600"
                        )}>
                          {isRefund || isExpense ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                        </div>
                        <div className="text-[9px] text-gray-400 font-medium uppercase mt-1">
                          {format(new Date(transaction.timestamp), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Audits & Expense Addition (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card A: Audit & Reconciliation Form */}
          <Card className="border-gray-100 shadow-sm border-t-4 border-t-[#f26e24] bg-white">
            <CardHeader className="py-4 border-b border-gray-50">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-900">
                Ledger Audit & Reconciliation
              </CardTitle>
              <CardDescription className="text-[11px] font-normal">Verify expected ledger balance with actual hand balance.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="actual-balance" className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">
                  Actual Closing Balance (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                  <Input
                    id="actual-balance"
                    type="number"
                    value={actualClosingBalance}
                    onChange={(e) => setActualClosingBalance(e.target.value)}
                    placeholder="Enter final count or closing balance..."
                    className="pl-8 h-12 border-gray-200 rounded-xl focus:ring-[#f26e24]/20 font-semibold text-gray-950 bg-white"
                  />
                </div>
              </div>

              {/* Real-time Calculation Panel */}
              <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-semibold uppercase">Expected Balance</span>
                  <span className="font-semibold text-gray-700">{formatCurrency(expectedBalance)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-semibold uppercase">Actual Counted</span>
                  <span className="font-semibold text-gray-900">
                    {actualClosingBalance !== '' ? formatCurrency(parseFloat(actualClosingBalance)) : formatCurrency(expectedBalance)}
                  </span>
                </div>
                <Separator className="bg-gray-200/60" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Audit Difference</span>
                  <div className="flex items-center gap-1.5">
                    {balanceDifference === 0 ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 rounded-lg font-semibold text-[10px] uppercase gap-1 h-6">
                        <CheckCircle2 className="w-3 h-3" /> Balanced
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-2 rounded-lg font-semibold text-[10px] uppercase gap-1 h-6">
                        <AlertTriangle className="w-3 h-3" /> Discrepancy: {balanceDifference > 0 ? '+' : ''}{formatCurrency(balanceDifference)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleReconcile}
                className="w-full h-11 font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm bg-[#f26e24] hover:bg-[#e05d13] text-white hover:shadow-md"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {cashFlow.isReconciled ? 'Update Reconciliation' : 'Complete Reconciliation'}
              </Button>
            </CardContent>
          </Card>

          {/* Card B: Add Expense Form */}
          <Card className="border-gray-100 shadow-sm bg-white">
            <CardHeader className="py-4 border-b border-gray-50">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-500" />
                Record Operational Expense
              </CardTitle>
              <CardDescription className="text-[11px] font-normal">Log snacks, fuel, or minor repairs paid from desk drawer.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="expense-amount" className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">
                  Amount (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                  <Input
                    id="expense-amount"
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="pl-8 h-10 border-gray-200 rounded-xl focus:ring-emerald-500/20 text-sm font-semibold text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expense-description" className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">
                  Description
                </Label>
                <Input
                  id="expense-description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Snacks, cleaning items, vehicle wash..."
                  className="h-10 border-gray-200 rounded-xl text-sm font-normal focus:ring-emerald-500/20 text-gray-900"
                />
              </div>

              <Button 
                onClick={handleAddExpense} 
                className="w-full h-10 bg-slate-900 hover:bg-black text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                Record Expense
              </Button>

              <Separator className="bg-gray-100" />

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-100/80">
                  <span className="text-[9px] font-semibold text-gray-400 uppercase block tracking-wider">Today's Expenses</span>
                  <span className="text-base font-semibold text-slate-800">{formatCurrency(cashFlow.expenses || 0)}</span>
                </div>
                <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-100/80 text-right">
                  <span className="text-[9px] font-semibold text-gray-400 uppercase block tracking-wider">Today's Refunds</span>
                  <span className="text-base font-semibold text-slate-800">{formatCurrency(cashFlow.cashRefunds || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
