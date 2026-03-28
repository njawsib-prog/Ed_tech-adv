'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Modal, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  order_index: number;
}

export default function TakeTestPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testId, setTestId] = useState<string>('');

  // Start test
  useEffect(() => {
    const startTest = async () => {
      try {
        const response = await apiClient.post(`/student/tests/${params.id}/start`);
        setQuestions(response.data.questions);
        setTestId(response.data.test_id);
        // Set timer (assuming 60 mins default)
        setTimeLeft(60 * 60); // in seconds
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to start test');
        router.push('/tests');
      } finally {
        setLoading(false);
      }
    };

    startTest();
  }, [params.id, router, toast]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || loading) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading]);

  // Prevent leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleMarkForReview = (questionId: string) => {
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSubmit = useCallback(async (auto = false) => {
    if (!auto && !showSubmitModal) {
      setShowSubmitModal(true);
      return;
    }

    setSubmitting(true);
    setShowSubmitModal(false);

    const answersArray = Object.entries(answers).map(([questionId, selectedOption]) => ({
      question_id: questionId,
      selected_option: selectedOption,
    }));

    try {
      const response = await apiClient.post(`/student/tests/${testId}/submit`, {
        answers: answersArray,
        time_taken_secs: 60 * 60 - timeLeft,
      });

      router.push(`/tests/${testId}/result?resultId=${response.data.result.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  }, [answers, testId, timeLeft, router, toast, showSubmitModal]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  const unanswered = questions.length - answered;
  const marked = markedForReview.size;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Test in Progress</h1>
          <div className="flex items-center gap-4">
            <div
              className={`text-2xl font-bold font-mono ${
                timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-900'
              }`}
            >
              {formatTime(timeLeft)}
            </div>
            <Button onClick={() => handleSubmit()} loading={submitting}>
              Submit Test
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Question Navigator */}
        <aside className="w-20 md:w-32 shrink-0">
          <div className="bg-white rounded-base shadow p-3 sticky top-24">
            <p className="text-sm font-medium text-gray-700 mb-2 text-center">Questions</p>
            <div className="grid grid-cols-4 md:grid-cols-5 gap-1">
              {questions.map((q, index) => {
                const isAnswered = answers[q.id];
                const isMarked = markedForReview.has(q.id);
                const isCurrent = index === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
                      isCurrent
                        ? 'ring-2 ring-offset-1'
                        : ''
                    } ${
                      isMarked
                        ? 'bg-amber-100 text-amber-800'
                        : isAnswered
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {currentQuestion && (
            <div className="bg-white rounded-base shadow p-6">
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">
                  Question {currentIndex + 1} of {questions.length}
                </p>
                <h2 className="text-lg font-medium text-gray-900">
                  {currentQuestion.question_text}
                </h2>
              </div>

              <div className="space-y-3">
                {['a', 'b', 'c', 'd'].map((option) => {
                  const optionKey = `option_${option}` as keyof Question;
                  const optionText = currentQuestion[optionKey];
                  const isSelected = answers[currentQuestion.id] === option;

                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswer(currentQuestion.id, option)}
                      className={`w-full p-4 text-left rounded-base border-2 transition-colors ${
                        isSelected
                          ? 'border-current bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={isSelected ? { borderColor: 'var(--color-primary)' } : {}}
                    >
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-sm font-medium mr-3">
                        {option.toUpperCase()}
                      </span>
                      {optionText}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => handleMarkForReview(currentQuestion.id)}
                  className={`text-sm ${
                    markedForReview.has(currentQuestion.id)
                      ? 'text-amber-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {markedForReview.has(currentQuestion.id) ? '★ Marked for Review' : '☆ Mark for Review'}
                </button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(currentIndex - 1)}
                  >
                    Previous
                  </Button>
                  {currentIndex < questions.length - 1 ? (
                    <Button onClick={() => setCurrentIndex(currentIndex + 1)}>
                      Next
                    </Button>
                  ) : (
                    <Button onClick={() => handleSubmit()}>
                      Submit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Test?"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Are you sure you want to submit your test?</p>
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-base text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{answered}</p>
              <p className="text-sm text-gray-500">Answered</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{marked}</p>
              <p className="text-sm text-gray-500">Marked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{unanswered}</p>
              <p className="text-sm text-gray-500">Unanswered</p>
            </div>
          </div>
          {unanswered > 0 && (
            <p className="text-amber-600 text-sm">
              ⚠️ You have {unanswered} unanswered question(s).
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowSubmitModal(false)}>
              Continue Test
            </Button>
            <Button className="flex-1" onClick={() => handleSubmit(true)} loading={submitting}>
              Submit Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}