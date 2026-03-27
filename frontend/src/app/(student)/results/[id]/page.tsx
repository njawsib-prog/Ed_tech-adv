'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';

interface Result {
  id: string;
  score: number;
  total_marks: number;
  percentage: number;
  status: 'passed' | 'failed';
  time_taken_seconds: number;
  submitted_at: string;
  started_at: string;
  answers: Answer[];
  tests: {
    id: string;
    title: string;
    total_marks: number;
    passing_marks: number;
    duration_minutes: number;
    questions: Question[];
  };
}

interface Question {
  questionText: string;
  type: 'mcq' | 'trueFalse' | 'shortAnswer';
  options?: string[];
  correctAnswer: string;
  marks: number;
}

interface Answer {
  questionIndex: number;
  selected?: string;
  text?: string;
  marked?: boolean;
}

export default function ResultDetailPage() {
  const router = useRouter();
  const params = useParams();
  const resultId = params.id as string;
  
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [resultId]);

  const fetchResult = async () => {
    try {
      const response = await apiClient.get(`/api/student/results/${resultId}`);
      setResult(response.data);
    } catch (error) {
      console.error('Error fetching result:', error);
      alert('Failed to load result');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <PageWrapper title="Loading...">
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </PageWrapper>
    );
  }

  if (!result) {
    return (
      <PageWrapper title="Result Not Found">
        <Card>
          <div className="p-6 text-center">
            <p className="text-gray-500">Result not found.</p>
            <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  const questions = result.tests.questions || [];
  const answers = result.answers || [];

  return (
    <PageWrapper title={`Result: ${result.tests.title}`}>
      <div className="space-y-6">
        {/* Result Summary */}
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{result.tests.title}</h2>
                <p className="text-gray-500 mt-1">
                  Completed on {formatDate(result.submitted_at)}
                </p>
              </div>
              <Badge
                variant={result.status === 'passed' ? 'success' : 'danger'}
                className="text-lg px-4 py-2"
              >
                {result.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-4 gap-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">Score</p>
                <p className="text-2xl font-bold text-[var(--primary-color)]">
                  {result.score} / {result.total_marks}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">Percentage</p>
                <p className="text-2xl font-bold">
                  {result.percentage?.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">Passing: {result.tests.passing_marks}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">Time Taken</p>
                <p className="text-lg font-semibold">
                  {result.time_taken_seconds ? formatTime(result.time_taken_seconds) : 'N/A'}
                </p>
                <p className="text-sm text-gray-500">Allowed: {result.tests.duration_minutes} min</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">Questions</p>
                <p className="text-lg font-semibold">{questions.length}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Question Review */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Question Review</h3>
            <div className="space-y-4">
              {questions.map((question, index) => {
                const answer = answers[index];
                const isCorrect = answer?.selected === question.correctAnswer;
                const isAnswered = answer?.selected !== undefined;

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${
                      isCorrect ? 'border-green-200 bg-green-50' :
                      isAnswered ? 'border-red-200 bg-red-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">Question {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{question.marks} marks</span>
                        {isCorrect ? (
                          <Badge variant="success">Correct</Badge>
                        ) : isAnswered ? (
                          <Badge variant="danger">Incorrect</Badge>
                        ) : (
                          <Badge variant="warning">Not Answered</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-800 mb-3">{question.questionText}</p>
                    
                    {question.type === 'mcq' && question.options && (
                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => {
                          const isCorrectOption = option === question.correctAnswer;
                          const isSelectedOption = option === answer?.selected;

                          return (
                            <div
                              key={optIndex}
                              className={`p-2 rounded border ${
                                isCorrectOption
                                  ? 'border-green-500 bg-green-100 text-green-800'
                                  : isSelectedOption
                                  ? 'border-red-500 bg-red-100 text-red-800'
                                  : 'border-gray-200'
                              }`}
                            >
                              <span className="mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                              {option}
                              {isCorrectOption && ' ✓'}
                              {isSelectedOption && !isCorrectOption && ' ✗'}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {question.type === 'trueFalse' && (
                      <div className="flex gap-4">
                        {['True', 'False'].map(option => {
                          const isCorrectOption = option === question.correctAnswer;
                          const isSelectedOption = option === answer?.selected;

                          return (
                            <div
                              key={option}
                              className={`p-2 rounded border ${
                                isCorrectOption
                                  ? 'border-green-500 bg-green-100 text-green-800'
                                  : isSelectedOption
                                  ? 'border-red-500 bg-red-100 text-red-800'
                                  : 'border-gray-200'
                              }`}
                            >
                              {option}
                              {isCorrectOption && ' ✓'}
                              {isSelectedOption && !isCorrectOption && ' ✗'}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {question.type === 'shortAnswer' && (
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-gray-500">Your Answer:</span>
                          <p className="mt-1 p-2 bg-white rounded border">
                            {answer?.text || 'No answer provided'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Expected Answer:</span>
                          <p className="mt-1 p-2 bg-green-50 rounded border border-green-200">
                            {question.correctAnswer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.push('/results')}>
            Back to Results
          </Button>
          <Button variant="outline" onClick={() => router.push('/materials')}>
            Study Materials
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}