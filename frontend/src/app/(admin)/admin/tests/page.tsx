'use client';

import { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';
import Switch from '@/components/ui/Switch';

interface Test {
  id: string;
  title: string;
  description: string;
  type: 'graded' | 'practice';
  course_id: string;
  courses?: { name: string };
  time_limit_mins: number;
  is_active: boolean;
  scheduled_at?: string;
  question_count: number;
  submission_count: number;
  created_at: string;
}

interface Course {
  id: string;
  name: string;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  order_index: number;
}

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ courseId: '', type: '' });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    timeLimit: 60,
    type: 'graded',
    scheduledAt: '',
    isActive: false
  });
  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'a'
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assignAllCourse, setAssignAllCourse] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => {
    fetchCourses();
    fetchTests();
  }, [filters]);

  const fetchCourses = async () => {
    try {
      const response = await apiClient.get('/api/admin/courses');
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchTests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.courseId) params.append('course_id', filters.courseId);
      if (filters.type) params.append('type', filters.type);

      const response = await apiClient.get<Test[]>(`/api/admin/tests?${params}`);
      setTests(response.data || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (testId: string) => {
    try {
      const response = await apiClient.get<Question[]>(`/api/admin/tests/${testId}/questions`);
      setQuestions(response.data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        course_id: formData.courseId,
        time_limit_mins: formData.timeLimit,
        type: formData.type,
        scheduled_at: formData.scheduledAt || null,
        is_active: formData.isActive
      };

      if (editingTest) {
        await apiClient.put(`/api/admin/tests/${editingTest.id}`, payload);
      } else {
        await apiClient.post('/api/admin/tests', payload);
      }

      setShowModal(false);
      resetForm();
      fetchTests();
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Failed to save test');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (test: Test) => {
    setEditingTest(test);
    setFormData({
      title: test.title,
      description: test.description || '',
      courseId: test.course_id,
      timeLimit: test.time_limit_mins,
      type: test.type,
      scheduledAt: test.scheduled_at ? test.scheduled_at.slice(0, 16) : '',
      isActive: test.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;
    try {
      await apiClient.delete(`/api/admin/tests/${id}`);
      fetchTests();
    } catch (error) {
      console.error('Error deleting test:', error);
      alert('Failed to delete test');
    }
  };

  const handleToggleActive = async (test: Test) => {
    try {
      await apiClient.put(`/api/admin/tests/${test.id}`, { is_active: !test.is_active });
      fetchTests();
    } catch (error) {
      console.error('Error toggling test:', error);
      alert('Failed to update test status');
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestId) return;
    setSaving(true);
    try {
      await apiClient.post(`/api/admin/tests/${selectedTestId}/questions`, {
        question_text: questionForm.questionText,
        option_a: questionForm.optionA,
        option_b: questionForm.optionB,
        option_c: questionForm.optionC,
        option_d: questionForm.optionD,
        correct_option: questionForm.correctOption
      });
      
      setQuestionForm({
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'a'
      });
      fetchQuestions(selectedTestId);
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Failed to add question');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await apiClient.delete(`/api/admin/tests/questions/${questionId}`);
      if (selectedTestId) fetchQuestions(selectedTestId);
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const handleAssignTest = async () => {
    if (!selectedTestId) return;
    setSaving(true);
    try {
      await apiClient.post(`/api/admin/tests/${selectedTestId}/assign`, {
        assign_all_course: assignAllCourse,
        student_ids: selectedStudents
      });
      
      setShowAssignModal(false);
      alert('Test assigned successfully');
    } catch (error) {
      console.error('Error assigning test:', error);
      alert('Failed to assign test');
    } finally {
      setSaving(false);
    }
  };

  const openQuestionsModal = (testId: string) => {
    setSelectedTestId(testId);
    fetchQuestions(testId);
    setShowQuestionModal(true);
  };

  const openAssignModal = (testId: string) => {
    setSelectedTestId(testId);
    setShowAssignModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      courseId: '',
      timeLimit: 60,
      type: 'graded',
      scheduledAt: '',
      isActive: false
    });
    setEditingTest(null);
  };

  const getStatusBadge = (test: Test) => {
    if (test.scheduled_at && new Date(test.scheduled_at) > new Date()) {
      return <Badge variant="info">Scheduled</Badge>;
    }
    return <Badge variant={test.is_active ? 'success' : 'warning'}>
      {test.is_active ? 'Active' : 'Inactive'}
    </Badge>;
  };

  return (
    <PageWrapper title="Tests">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tests</h1>
            <p className="text-gray-500">Create and manage tests for students</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            + Create Test
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course
                </label>
                <select
                  value={filters.courseId}
                  onChange={(e) => setFilters(f => ({ ...f, courseId: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option value="">All Courses</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="graded">Graded</option>
                  <option value="practice">Practice</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ courseId: '', type: '' })}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Tests Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : tests.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-gray-500">
              No tests found. Click &quot;Create Test&quot; to add one.
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Title</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Course</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Questions</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Submissions</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tests.map(test => (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{test.title}</p>
                          {test.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">{test.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{test.courses?.name || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <Badge variant={test.type === 'graded' ? 'info' : 'success'}>
                          {test.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">{test.time_limit_mins} min</td>
                      <td className="py-3 px-4 text-sm">{test.question_count}</td>
                      <td className="py-3 px-4 text-sm">{test.submission_count}</td>
                      <td className="py-3 px-4">{getStatusBadge(test)}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(test)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openQuestionsModal(test.id)}>
                            Questions
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openAssignModal(test.id)}>
                            Assign
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleToggleActive(test)}
                            className={test.is_active ? 'text-orange-600' : 'text-green-600'}
                          >
                            {test.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(test.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Add/Edit Test Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingTest ? 'Edit Test' : 'Create New Test'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              value={formData.courseId}
              onChange={(e) => setFormData(f => ({ ...f, courseId: e.target.value }))}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
            >
              <option value="">Select Course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
              <Input
                type="number"
                value={formData.timeLimit}
                onChange={(e) => setFormData(f => ({ ...f, timeLimit: parseInt(e.target.value) || 60 }))}
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(f => ({ ...f, type: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
              >
                <option value="graded">Graded</option>
                <option value="practice">Practice</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule (optional)</label>
            <Input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData(f => ({ ...f, scheduledAt: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Activate immediately
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingTest ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Questions Modal */}
      <Modal
        isOpen={showQuestionModal}
        onClose={() => { setShowQuestionModal(false); setSelectedTestId(null); }}
        title="Test Questions"
        size="lg"
      >
        <div className="space-y-4">
          <form onSubmit={handleQuestionSubmit} className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
              <textarea
                value={questionForm.questionText}
                onChange={(e) => setQuestionForm(f => ({ ...f, questionText: e.target.value }))}
                rows={2}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Option A</label>
                <Input
                  value={questionForm.optionA}
                  onChange={(e) => setQuestionForm(f => ({ ...f, optionA: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Option B</label>
                <Input
                  value={questionForm.optionB}
                  onChange={(e) => setQuestionForm(f => ({ ...f, optionB: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Option C</label>
                <Input
                  value={questionForm.optionC}
                  onChange={(e) => setQuestionForm(f => ({ ...f, optionC: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Option D</label>
                <Input
                  value={questionForm.optionD}
                  onChange={(e) => setQuestionForm(f => ({ ...f, optionD: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correct Option</label>
              <select
                value={questionForm.correctOption}
                onChange={(e) => setQuestionForm(f => ({ ...f, correctOption: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
              >
                <option value="a">A</option>
                <option value="b">B</option>
                <option value="c">C</option>
                <option value="d">D</option>
              </select>
            </div>
            <Button type="submit" disabled={saving} size="sm">
              {saving ? 'Adding...' : 'Add Question'}
            </Button>
          </form>

          <div className="divide-y divide-gray-100">
            {questions.length === 0 ? (
              <p className="text-center py-4 text-gray-500">No questions yet</p>
            ) : (
              questions.map((q, idx) => (
                <div key={q.id} className="py-3 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{idx + 1}. {q.question_text}</p>
                    <div className="text-xs text-gray-500 mt-1 space-x-2">
                      <span>A: {q.option_a}</span>
                      <span>B: {q.option_b}</span>
                      <span>C: {q.option_c}</span>
                      <span>D: {q.option_d}</span>
                    </div>
                    <Badge variant="success" className="mt-1">Correct: {q.correct_option.toUpperCase()}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-red-600"
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Assign Test Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setSelectedTestId(null); }}
        title="Assign Test"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose how to assign this test to students:
          </p>
          
          <Switch
            checked={assignAllCourse}
            onChange={setAssignAllCourse}
            label="Assign to all students in course"
            description="Automatically assign to all active students enrolled in the course"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => { setShowAssignModal(false); setSelectedTestId(null); }}>
              Cancel
            </Button>
            <Button onClick={handleAssignTest} disabled={saving}>
              {saving ? 'Assigning...' : 'Assign Test'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
