'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';

interface Report {
  id: string;
  type: string;
  data: any;
  created_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/admin/reports');
      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      setReports(data);
    } catch (error) {
      logger.error('Error:', error);
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-xl border shadow-sm gap-4">
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">System Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">View and export activity logs</p>
        </div>
        <div className="md:hidden text-sm font-medium text-gray-500">
          Admin / Reports
        </div>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        {/* Desktop View */}
        <div className="hidden md:block">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Type</th>
                <th className="px-6 py-4 text-left">Data</th>
                <th className="px-6 py-4 text-right">Created At</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900 uppercase">
                      {report.type}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <pre className="text-[10px] text-gray-600 font-mono bg-gray-50 p-2 rounded-lg max-w-sm truncate">
                      {JSON.stringify(report.data, null, 2)}
                    </pre>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-xs font-medium text-gray-600">
                      {format(new Date(report.created_at), 'MMM d, yyyy')}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400">
                      {format(new Date(report.created_at), 'HH:mm:ss')}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-100">
          {reports.map((report) => (
            <div key={report.id} className="p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
                <div className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-bold uppercase rounded">
                  {report.type}
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">{format(new Date(report.created_at), 'MMM d, HH:mm')}</span>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg overflow-hidden border border-gray-100 mt-2">
                <span className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Payload Data</span>
                <pre className="text-[10px] text-gray-600 font-mono break-all whitespace-pre-wrap">
                  {JSON.stringify(report.data, null, 2)}
                </pre>
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="p-12 text-center text-gray-500 font-bold text-sm bg-gray-50/50">No reports found</div>
          )}
        </div>
      </div>
    </div>
  );
} 