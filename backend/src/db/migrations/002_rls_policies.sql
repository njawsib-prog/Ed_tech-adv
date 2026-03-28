-- EdTech Platform Database Schema
-- Migration 002: Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE institute_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Students can only view their own record
CREATE POLICY "Students can view own record" ON students
    FOR SELECT USING (auth.uid()::text = id::text);

-- Students can update their own record
CREATE POLICY "Students can update own record" ON students
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Students can only view their own results
CREATE POLICY "Students can view own results" ON results
    FOR SELECT USING (auth.uid()::text = student_id::text);

-- Students can only view their own test assignments
CREATE POLICY "Students can view own test assignments" ON test_assignments
    FOR SELECT USING (auth.uid()::text = student_id::text);

-- Students can view active courses
CREATE POLICY "Students can view active courses" ON courses
    FOR SELECT USING (is_active = true);

-- Students can view modules for their enrolled courses
CREATE POLICY "Students can view modules in enrolled courses" ON modules
    FOR SELECT USING (
        course_id IN (
            SELECT course_id FROM students WHERE id = auth.uid()::uuid
        )
    );

-- Students can view subjects for modules in their courses
CREATE POLICY "Students can view subjects in enrolled courses" ON subjects
    FOR SELECT USING (
        module_id IN (
            SELECT m.id FROM modules m
            JOIN courses c ON m.course_id = c.id
            JOIN students s ON s.course_id = c.id
            WHERE s.id = auth.uid()::uuid
        )
    );

-- Students can view active tests for their courses
CREATE POLICY "Students can view active tests" ON tests
    FOR SELECT USING (
        is_active = true AND
        course_id IN (
            SELECT course_id FROM students WHERE id = auth.uid()::uuid
        )
    );

-- Students can view questions for tests they are assigned to
CREATE POLICY "Students can view assigned test questions" ON questions
    FOR SELECT USING (
        test_id IN (
            SELECT test_id FROM test_assignments WHERE student_id = auth.uid()::uuid
        )
    );

-- Students can view study materials for their courses
CREATE POLICY "Students can view course materials" ON study_materials
    FOR SELECT USING (
        course_id IN (
            SELECT course_id FROM students WHERE id = auth.uid()::uuid
        )
    );

-- Students can view notifications targeted to them
CREATE POLICY "Students can view targeted notifications" ON notifications
    FOR SELECT USING (
        target_type = 'all' OR
        (target_type = 'course' AND target_id IN (SELECT course_id FROM students WHERE id = auth.uid()::uuid)) OR
        (target_type = 'student' AND target_id = auth.uid()::uuid)
    );

-- Students can view their own notification reads
CREATE POLICY "Students can view own notification reads" ON notification_reads
    FOR SELECT USING (student_id = auth.uid()::uuid);

-- Students can insert notification reads
CREATE POLICY "Students can mark notifications read" ON notification_reads
    FOR INSERT WITH CHECK (student_id = auth.uid()::uuid);

-- Students can view their own complaints
CREATE POLICY "Students can view own complaints" ON complaints
    FOR SELECT USING (student_id = auth.uid()::uuid);

-- Students can create complaints
CREATE POLICY "Students can create complaints" ON complaints
    FOR INSERT WITH CHECK (student_id = auth.uid()::uuid);

-- Students can update their own complaints
CREATE POLICY "Students can update own complaints" ON complaints
    FOR UPDATE USING (student_id = auth.uid()::uuid);

-- Students can view complaint replies for their complaints
CREATE POLICY "Students can view complaint replies" ON complaint_replies
    FOR SELECT USING (
        complaint_id IN (SELECT id FROM complaints WHERE student_id = auth.uid()::uuid)
    );

-- Students can create complaint replies
CREATE POLICY "Students can reply to own complaints" ON complaint_replies
    FOR INSERT WITH CHECK (
        sender_role = 'student' AND
        complaint_id IN (SELECT id FROM complaints WHERE student_id = auth.uid()::uuid)
    );

-- Students can view their own feedback
CREATE POLICY "Students can view own feedback" ON feedback
    FOR SELECT USING (student_id = auth.uid()::uuid);

-- Students can create feedback
CREATE POLICY "Students can create feedback" ON feedback
    FOR INSERT WITH CHECK (student_id = auth.uid()::uuid);

-- Students can view their own material views
CREATE POLICY "Students can view own material views" ON material_views
    FOR SELECT USING (student_id = auth.uid()::uuid);

-- Students can create material views
CREATE POLICY "Students can mark materials viewed" ON material_views
    FOR INSERT WITH CHECK (student_id = auth.uid()::uuid);

-- Admins have full access to all tables (using service role key)
-- Note: In production, you would create admin-specific policies based on admin role
-- For now, we'll use the service role key for admin operations which bypasses RLS

-- Admins can insert notifications
CREATE POLICY "Admins can insert notifications" ON notifications
    FOR INSERT WITH CHECK (
        created_by IN (SELECT id FROM admins)
    );

-- Admins can update notifications
CREATE POLICY "Admins can update notifications" ON notifications
    FOR UPDATE USING (
        created_by IN (SELECT id FROM admins)
    );

-- Admins can delete notifications
CREATE POLICY "Admins can delete notifications" ON notifications
    FOR DELETE USING (
        created_by IN (SELECT id FROM admins)
    );