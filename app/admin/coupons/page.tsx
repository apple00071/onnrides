'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import AddCouponModal from './components/AddCouponModal';
import EditCouponModal from './components/EditCouponModal';
import DeleteCouponModal from './components/DeleteCouponModal';
import logger from '@/lib/logger';
import { Plus } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_booking_amount: number | null;
  max_discount_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await fetch('/api/admin/coupons');
      if (!response.ok) {
        throw new Error('Failed to fetch coupons');
      }
      const data = await response.json();
      setCoupons(data.coupons);
    } catch (error) {
      logger.error('Error fetching coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setIsEditModalOpen(true);
  };

  const handleDelete = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setIsDeleteModalOpen(true);
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (coupon.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleAddCoupon = () => {
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-xl border shadow-sm gap-4">
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Coupon Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage discounts and promotions</p>
        </div>
        <div className="flex justify-between items-center w-full sm:w-auto gap-3">
          <div className="md:hidden text-sm font-medium text-gray-500">
            {filteredCoupons.length} Coupons
          </div>
          <Button
            onClick={handleAddCoupon}
            className="bg-[#f26e24] hover:bg-[#d95e1d] text-white shadow-sm flex items-center gap-2 h-10 px-4 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add New Coupon</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <Input
            type="text"
            placeholder="Search coupons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm h-10 border-gray-300 rounded-xl text-sm"
          />
        </div>

        <div>
          {/* Desktop View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4 text-center">Min/Max</th>
                  <th className="px-6 py-4 text-center">Usage</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
                    </td>
                  </tr>
                ) : filteredCoupons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-medium">
                      No coupons found
                    </td>
                  </tr>
                ) : (
                  filteredCoupons.map((coupon) => (
                    <tr key={coupon.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{coupon.code}</div>
                        {coupon.description && (
                          <p className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5 line-clamp-1">{coupon.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-tighter capitalize">{coupon.discount_type}</td>
                      <td className="px-6 py-4 font-bold text-orange-600">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-[11px] font-bold text-gray-700">Min: ₹{coupon.min_booking_amount || 0}</div>
                        <div className="text-[10px] font-medium text-gray-400">Max: ₹{coupon.max_discount_amount || '∞'}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-xs font-bold text-gray-700">{coupon.times_used} <span className="text-gray-400 font-medium text-[10px]">/ {coupon.usage_limit || '∞'}</span></div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 tracking-tighter">Valid until: {formatDate(coupon.end_date)}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge className={`${coupon.is_active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'} font-bold uppercase text-[9px] px-2 py-0.5`}>
                          {coupon.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(coupon)}
                            className="h-8 w-8 p-0 border-gray-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                          >
                            <FaEdit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(coupon)}
                            className="h-8 w-8 p-0 border-gray-200 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <FaTrash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
            ) : filteredCoupons.length === 0 ? (
              <div className="text-center py-12 text-gray-500 font-bold text-sm bg-gray-50/50 rounded-xl border border-dashed">No coupons found</div>
            ) : (
              filteredCoupons.map((coupon) => (
                <div key={coupon.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 leading-none">{coupon.code}</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-tight">{coupon.discount_type} discount</p>
                    </div>
                    <Badge className={`${coupon.is_active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'} font-bold uppercase text-[9px] px-1.5 py-0`}>
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Value</span>
                      <p className="text-sm text-orange-600 font-bold leading-tight">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Usage</span>
                      <p className="text-sm text-gray-800 font-bold leading-tight">{coupon.times_used} / {coupon.usage_limit || '∞'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-3 border-t border-gray-50">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Min Order</span>
                      <p className="text-xs text-gray-800 font-bold">₹{coupon.min_booking_amount || 0}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Expires</span>
                      <p className="text-xs text-gray-800 font-bold">{formatDate(coupon.end_date)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(coupon)}
                      className="flex-1 h-9 text-xs font-bold border-gray-200 text-blue-600 rounded-lg"
                    >
                      <FaEdit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(coupon)}
                      className="flex-1 h-9 text-xs font-bold border-gray-200 text-red-600 rounded-lg"
                    >
                      <FaTrash className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <AddCouponModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchCoupons();
        }}
      />

      {selectedCoupon && (
        <>
          <EditCouponModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={() => {
              setIsEditModalOpen(false);
              fetchCoupons();
            }}
            coupon={selectedCoupon}
          />

          <DeleteCouponModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onSuccess={() => {
              setIsDeleteModalOpen(false);
              fetchCoupons();
            }}
            coupon={selectedCoupon}
          />
        </>
      )}
    </div>
  );
} 