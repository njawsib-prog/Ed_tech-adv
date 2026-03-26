-- EdTech Platform Database Schema
-- Migration 003: Performance Indexes

-- Students table indexes
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_course_id ON students(course_id);
CREATE INDEX idx_students_is_active ON students(is_active);

-- Results table indexes
CREATE INDEX idx_results_student_id ON results(student_id);
CREATE INDEX idx_results_test_id ON results(test_id);
CREATE INDEX idx_results_submitted_at ON results(submitted_at);

-- Test assignments indexes
CREATE INDEX idx_test_assignments_student_id ON test_assignments(student_id);
CREATE INDEX idx_test_assignments_test_id ON test_assignments(test_id);
CREATE INDEX idx_test_assignments_status ON test_assignments(status);

-- Notifications indexes
CREATE INDEX idx_notifications_target_type ON notifications(target_type);
CREATE INDEX idx_notifications_target_id ON notifications(target_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Notification reads indexes
CREATE INDEX idx_notification_reads_notification_id ON notification_reads(notification_id);
CREATE INDEX idx_notification_reads_student_id ON notification_reads(student_id);

-- Tests indexes
CREATE INDEX idx_tests_course_id ON tests(course_id);
CREATE INDEX idx_tests_is_active ON tests(is_active);
CREATE INDEX idx_tests_scheduled_at ON tests(scheduled_at);
CREATE INDEX idx_tests_created_by ON tests(created_by);

-- Questions index
CREATE INDEX idx_questions_test_id ON questions(test_id);
CREATE INDEX idx_questions_order_index ON questions(order_index);

-- Courses index
CREATE INDEX idx_courses_is_active ON courses(is_active);

-- Modules indexes
CREATE INDEX idx_modules_course_id ON modules(course_id);
CREATE INDEX idx_modules_order_index ON modules(order_index);

-- Subjects indexes
CREATE INDEX idx_subjects_module_id ON subjects(module_id);
CREATE INDEX idx_subjects_order_index ON subjects(order_index);

-- Study materials indexes
CREATE INDEX idx_study_materials_course_id ON study_materials(course_id);
CREATE INDEX idx_study_materials_module_id ON study_materials(module_id);
CREATE INDEX idx_study_materials_type ON study_materials(type);
CREATE INDEX idx_study_materials_order_index ON study_materials(order_index);

-- Complaints indexes
CREATE INDEX idx_complaints_student_id ON complaints(student_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_category ON complaints(category);
CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to);
CREATE INDEX idx_complaints_created_at ON complaints(created_at DESC);

-- Complaint replies indexes
CREATE INDEX idx_complaint_replies_complaint_id ON complaint_replies(complaint_id);
CREATE INDEX idx_complaint_replies_created_at ON complaint_replies(created_at);

-- Feedback indexes
CREATE INDEX idx_feedback_student_id ON feedback(student_id);
CREATE INDEX idx_feedback_target_type ON feedback(target_type);
CREATE INDEX idx_feedback_rating ON feedback(rating);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- Material views indexes
CREATE INDEX idx_material_views_material_id ON material_views(material_id);
CREATE INDEX idx_material_views_student_id ON material_views(student_id);

-- Activity log indexes
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_user_type ON activity_log(user_type);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- Settings index
CREATE UNIQUE INDEX idx_settings_key ON settings(key);