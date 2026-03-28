'use client';

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Table, Button, Modal, Badge, Input } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';

interface Payment {
  id: string;
  student_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: string;
  transaction_id?: string;
  description?: string;
  created_at: string;
  students?: { name: string; email: string };
}

interface Student {
  id: string;
  name: string;
  email: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    payment_method: 'Cash',
    transaction_id: '',
    description: '',
    status: 'completed' as const,
  });

  const toast = useToast();

  useEffect(() => {
    fetchPayments();
    fetchStudents();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/payments');
      setPayments(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await apiClient.get('/admin/students?limit=100');
      setStudents(response.data.students || []);
    } catch (error) {
      toast.error('Failed to load students');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/payments', {
        ...formData,
        amount: Number(formData.amount),
      });
      toast.success('Payment recorded successfully');
      setShowAddModal(false);
      fetchPayments();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const columns = [
    {
      key: 'student',
      label: 'Student',
      render: (p: Payment) => (
        <div>
          <div className="font-medium text-gray-900">{p.students?.name}</div>
          <div className="text-xs text-gray-500">{p.students?.email}</div>
        </div>
      ),
    },
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
    <PageWrapper
      title="Payments & Revenue"
      actions={<Button onClick={() => setShowAddModal(true)}>Record Payment</Button>}
    >
      <Table columns={columns} data={payments} loading={loading} emptyMessage="No payments found" />

      {/* Record Payment Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Record New Payment" size="md">
        <form onSubmit={handleRecordPayment}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                required
              >
                <option value="">Choose a student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Amount ($)"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
            <Input
              label="Payment Method"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
            />
            <Input
              label="Transaction ID (optional)"
              value={formData.transaction_id}
              onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Payment</Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
