'use client';

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Table, Button, Modal, Badge, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';

interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  students?: { name: string };
}

interface StudentWithAttendance {
  id: string;
  name: string;
  email: string;
  roll_number?: string;
  course_id?: string;
  branch_id?: string;
  courses?: { name: string } | null;
  branches?: { name: string } | null;
  attendance_status: string | null;
  attendance_id: string | null;
}

interface Branch {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
}

export default function AdminAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markData, setMarkData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const toast = useToast();

  useEffect(() => {
    Promise.all([fetchBranches(), fetchCourses()]);
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedBranch, selectedCourse, selectedDate]);

  const fetchBranches = async () => {
    try {
      const response = await apiClient.get('/admin/branches');
      setBranches(response.data.data || []);
    } catch {
      toast.error('Failed to load branches');
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await apiClient.get<{ courses: Course[] }>('/admin/courses');
      setCourses(response.data.courses || []);
    } catch {
      toast.error('Failed to load courses');
    }
  };

  const fetchStudentsForAttendance = async () => {
    setStudentsLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedBranch) params.set('branch_id', selectedBranch);
      if (selectedCourse) params.set('course_id', selectedCourse);

      const response = await apiClient.get<{ data: StudentWithAttendance[] }>(
        `/admin/attendance/students-listing?${params}`
      );
      const studentList = response.data.data || [];
      setStudents(studentList);

      // Pre-fill mark data from existing attendance records
      const initialMarkData: Record<string, string> = {};
      studentList.forEach((s: StudentWithAttendance) => {
        initialMarkData[s.id] = s.attendance_status ?? 'present';
      });
      setMarkData(initialMarkData);
    } catch {
      toast.error('Failed to load students for attendance');
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedBranch) params.set('branch_id', selectedBranch);
      if (selectedCourse) params.set('course_id', selectedCourse);

      const response = await apiClient.get(`/admin/attendance?${params}`);
      setAttendance(response.data.data || []);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMarkModal = async () => {
    await fetchStudentsForAttendance();
    setShowMarkModal(true);
  };

  const handleMarkAll = (status: string) => {
    const all: Record<string, string> = {};
    students.forEach((s) => { all[s.id] = status; });
    setMarkData(all);
  };

  const handleMarkAttendance = async () => {
    setSaving(true);
    try {
      const records = Object.entries(markData).map(([studentId, status]) => ({
        student_id: studentId,
        branch_id: selectedBranch || undefined,
        course_id: selectedCourse || undefined,
        date: selectedDate,
        status,
      }));
      await apiClient.post('/admin/attendance', { records });
      toast.success('Attendance saved successfully');
      setShowMarkModal(false);
      fetchAttendance();
    } catch {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'student',
      label: 'Student Name',
      render: (row: AttendanceRecord) => row.students?.name || 'Unknown',
    },
    {
      key: 'date',
      label: 'Date',
      render: (row: AttendanceRecord) => new Date(row.date).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: AttendanceRecord) => (
        <Badge
          variant={
            row.status === 'present' ? 'success' : row.status === 'absent' ? 'danger' : 'warning'
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
        <Button onClick={handleOpenMarkModal}>
          Mark Attendance
        </Button>
      }
    >
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="w-56">
          <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="w-56">
          <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={attendance}
        loading={loading}
        emptyMessage="No attendance records for the selected filters"
      />

      {/* Mark Attendance Modal */}
      <Modal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        title={`Mark Attendance – ${new Date(selectedDate).toLocaleDateString()}`}
        size="lg"
      >
        {studentsLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No students found for the selected filters.
          </div>
        ) : (
          <>
            {/* Bulk actions */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium text-gray-700">Mark All:</span>
              <Button size="sm" variant="outline" onClick={() => handleMarkAll('present')}>✅ Present</Button>
              <Button size="sm" variant="outline" onClick={() => handleMarkAll('absent')}>❌ Absent</Button>
              <Button size="sm" variant="outline" onClick={() => handleMarkAll('late')}>⏰ Late</Button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.id} className={markData[student.id] === 'present' ? 'bg-green-50' : markData[student.id] === 'absent' ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-500">{student.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {student.courses?.name || '–'}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
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

            <div className="mt-4 text-xs text-gray-400">
              {students.length} student(s) found •{' '}
              {Object.values(markData).filter((v) => v === 'present').length} present •{' '}
              {Object.values(markData).filter((v) => v === 'absent').length} absent
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setShowMarkModal(false)}>Cancel</Button>
          <Button onClick={handleMarkAttendance} disabled={saving || students.length === 0}>
            {saving ? 'Saving…' : 'Save Attendance'}
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
