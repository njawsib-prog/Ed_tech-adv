'use client';

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Table, Button, Modal, Badge } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';

interface Attendance {
  id: string;
  student_id: string;
  student_name?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  students?: { name: string };
}

interface Student {
  id: string;
  name: string;
  branch_id: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function AdminAttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markData, setMarkData] = useState<Record<string, string>>({});

  const toast = useToast();

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedBranch, selectedDate]);

  useEffect(() => {
    if (selectedBranch) {
      fetchStudents(selectedBranch);
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const response = await apiClient.get('/admin/branches');
      setBranches(response.data.data || []);
      if (response.data.data?.length > 0) {
        setSelectedBranch(response.data.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load branches');
    }
  };

  const fetchStudents = async (branchId: string) => {
    try {
      const response = await apiClient.get(`/admin/students?branch_id=${branchId}`);
      setStudents(response.data.students || []);
      const initialMarkData: Record<string, string> = {};
      response.data.students?.forEach((s: Student) => {
        initialMarkData[s.id] = 'present';
      });
      setMarkData(initialMarkData);
    } catch (error) {
      toast.error('Failed to load students');
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        ...(selectedBranch && { branch_id: selectedBranch }),
      });
      const response = await apiClient.get(`/admin/attendance?${params}`);
      setAttendance(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    try {
      const records = Object.entries(markData).map(([studentId, status]) => ({
        student_id: studentId,
        branch_id: selectedBranch,
        date: selectedDate,
        status,
      }));
      await apiClient.post('/admin/attendance', { records });
      toast.success('Attendance marked successfully');
      setShowMarkModal(false);
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to mark attendance');
    }
  };

  const columns = [
    {
      key: 'student',
      label: 'Student Name',
      render: (row: Attendance) => row.students?.name || 'Unknown',
    },
    {
      key: 'date',
      label: 'Date',
      render: (row: Attendance) => new Date(row.date).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Attendance) => (
        <Badge
          variant={
            row.status === 'present'
              ? 'success'
              : row.status === 'absent'
              ? 'danger'
              : 'warning'
          }
        >
          {row.status.toUpperCase()}
        </Badge>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Attendance Management"
      actions={
        <Button onClick={() => setShowMarkModal(true)} disabled={!selectedBranch}>
          Mark Attendance
        </Button>
      }
    >
      <div className="mb-6 flex space-x-4">
        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={attendance}
        loading={loading}
        emptyMessage="No attendance records for this date/branch"
      />

      {/* Mark Attendance Modal */}
      <Modal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        title={`Mark Attendance - ${new Date(selectedDate).toLocaleDateString()}`}
        size="lg"
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="border border-gray-300 rounded-md p-1"
                      value={markData[student.id] || 'present'}
                      onChange={(e) => setMarkData({ ...markData, [student.id]: e.target.value })}
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="excused">Excused</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setShowMarkModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleMarkAttendance}>Save Attendance</Button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
