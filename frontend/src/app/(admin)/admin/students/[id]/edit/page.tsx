'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageWrapper from '@/components/layout/PageWrapper';
import { Button, Input, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';

interface Course {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface StudentForm {
  name: string;
  email: string;
  course_id: string;
  branch_id: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  password: string;
}

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [formData, setFormData] = useState<StudentForm>({
    name: '',
    email: '',
    course_id: '',
    branch_id: '',
    status: 'ACTIVE',
    password: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentRes, coursesRes, branchesRes] = await Promise.all([
          apiClient.get<{ success: boolean; data: StudentForm & { id: string } }>(
            `/admin/students/${studentId}`
          ),
          apiClient.get<{ courses: Course[] }>('/admin/courses'),
          apiClient.get<{ data: Branch[] }>('/admin/branches'),
        ]);

        const s = studentRes.data.data;
        setFormData({
          name: s.name,
          email: s.email,
          course_id: s.course_id ?? '',
          branch_id: s.branch_id ?? '',
          status: s.status ?? 'ACTIVE',
          password: '',
        });

        setCourses(coursesRes.data.courses ?? []);
        setBranches(branchesRes.data.data ?? []);
      } catch {
        toast.error('Failed to load student data');
        router.push('/admin/students');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: Partial<StudentForm> = {
        name: formData.name,
        email: formData.email,
        course_id: formData.course_id,
        branch_id: formData.branch_id,
        status: formData.status,
      };

      if (formData.password.trim()) {
        (payload as StudentForm & { password: string }).password = formData.password;
      }

      await apiClient.put(`/admin/students/${studentId}`, payload);
      toast.success('Student updated successfully');
      router.push('/admin/students');
    } catch {
      toast.error('Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Edit Student">
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Edit Student">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Edit Student</h2>
            <Button variant="outline" onClick={() => router.push('/admin/students')}>
              ← Back
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Student full name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="student@example.com"
                required
              />
            </div>

            {/* Course */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course <span className="text-red-500">*</span>
              </label>
              <select
                name="course_id"
                value={formData.course_id}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="ACTIVE">ACTIVE – Student can log in and use the platform</option>
                <option value="INACTIVE">INACTIVE – Account is deactivated</option>
                <option value="SUSPENDED">SUSPENDED – Account is suspended</option>
              </select>
              {formData.status !== 'ACTIVE' && (
                <p className="mt-1 text-xs text-red-600">
                  ⚠ Changing status to {formData.status} will immediately block this student&apos;s
                  access, even if they are currently logged in.
                </p>
              )}
            </div>

            {/* Password (optional reset) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password{' '}
                <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
              </label>
              <Input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                minLength={formData.password ? 6 : undefined}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/students')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </PageWrapper>
  );
}
