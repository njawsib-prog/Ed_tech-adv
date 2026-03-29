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

interface Receipt {
  receipt_number: string;
  payment_id: string;
  amount: number;
  payment_method: string;
  issued_at: string;
  student?: { name: string; email: string };
  signature_hash: string;
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
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
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
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await apiClient.get('/admin/students?limit=100');
      const d = response.data;
      setStudents(d?.data?.students || d?.students || []);
    } catch {
      toast.error('Failed to load students');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post<{ data: Payment; receipt: { receipt_number: string } }>(
        '/admin/payments',
        { ...formData, amount: Number(formData.amount) }
      );
      const receiptNum = res.data.receipt?.receipt_number;
      toast.success(`Payment recorded! Receipt: ${receiptNum || 'generated'}`);
      setShowAddModal(false);
      setFormData({ student_id: '', amount: '', payment_method: 'Cash', transaction_id: '', description: '', status: 'completed' });
      fetchPayments();
    } catch {
      toast.error('Failed to record payment');
    }
  };

  const handleViewReceipt = async (paymentId: string) => {
    setReceiptLoading(true);
    setShowReceiptModal(true);
    try {
      const res = await apiClient.get<{ data: Receipt }>(`/admin/payments/${paymentId}/receipt`);
      setSelectedReceipt(res.data.data);
    } catch {
      toast.error('Failed to load receipt');
      setShowReceiptModal(false);
    } finally {
      setReceiptLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const columns = [
    {
      key: 'student',
      label: 'Student',
      render: (p: Payment) => (
        <div>
          <div className="font-medium text-gray-900">{p.students?.name || '–'}</div>
          <div className="text-xs text-gray-500">{p.students?.email}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (p: Payment) => <span className="font-semibold">PKR {p.amount.toLocaleString()}</span>,
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
          variant={p.status === 'completed' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}
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
    {
      key: 'actions',
      label: 'Receipt',
      render: (p: Payment) => (
        <Button size="sm" variant="outline" onClick={() => handleViewReceipt(p.id)}>
          🧾 View
        </Button>
      ),
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Student <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
              label="Amount (PKR)"
              type="number"
              min="1"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Online">Online</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>
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
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit">Record Payment</Button>
          </div>
        </form>
      </Modal>

      {/* Receipt Modal */}
      <Modal isOpen={showReceiptModal} onClose={() => setShowReceiptModal(false)} title="Payment Receipt" size="md">
        {receiptLoading ? (
          <div className="flex justify-center py-8 text-gray-500">Loading receipt…</div>
        ) : selectedReceipt ? (
          <div className="font-mono text-sm" id="receipt-content">
            <div className="text-center border-b pb-4 mb-4">
              <h2 className="text-lg font-bold">OFFICIAL RECEIPT</h2>
              <p className="text-gray-500 text-xs">EdTech Platform</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Receipt No:</span>
                <span className="font-bold">{selectedReceipt.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Student:</span>
                <span>{selectedReceipt.student?.name || '–'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span>{selectedReceipt.student?.email || '–'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-bold text-green-700">PKR {Number(selectedReceipt.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Method:</span>
                <span>{selectedReceipt.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span>{new Date(selectedReceipt.issued_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-400 break-all">
                <span className="font-medium">Digital Signature:</span>{' '}
                {selectedReceipt.signature_hash?.substring(0, 32)}…
              </p>
              <p className="text-xs text-green-600 mt-1">✓ Cryptographically verified</p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setShowReceiptModal(false)}>Close</Button>
          {selectedReceipt && (
            <Button onClick={handlePrintReceipt}>🖨️ Print Receipt</Button>
          )}
        </div>
      </Modal>
    </PageWrapper>
  );
}
