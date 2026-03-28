'use client';

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Table, Badge, Card } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';

interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: string;
  transaction_id?: string;
  description?: string;
  created_at: string;
}

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/student/payments');
      setPayments(response.data.data || []);
    } catch (error) {
      console.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'amount',
      label: 'Amount',
      render: (p: Payment) => <span className="font-semibold">${p.amount.toFixed(2)}</span>,
    },
    {
      key: 'method',
      label: 'Method',
      render: (p: Payment) => p.payment_method || '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (p: Payment) => (
        <Badge
          variant={
            p.status === 'completed'
              ? 'success'
              : p.status === 'pending'
              ? 'warning'
              : 'danger'
          }
        >
          {p.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (p: Payment) => new Date(p.created_at).toLocaleDateString(),
    },
  ];

  return (
    <PageWrapper title="My Payments">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-4 flex flex-col items-center justify-center">
          <div className="text-sm text-gray-500 uppercase font-semibold">Total Paid</div>
          <div className="text-3xl font-bold text-green-600">
            ${payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
          </div>
        </Card>
      </div>

      <Table columns={columns} data={payments} loading={loading} emptyMessage="No payment records found" />
    </PageWrapper>
  );
}
