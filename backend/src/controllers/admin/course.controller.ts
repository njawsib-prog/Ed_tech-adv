import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

// Get all courses
export const getCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Get counts for each course
    const coursesWithCounts = await Promise.all(
      (courses || []).map(async (course) => {
        const { count: studentCount } = await supabaseAdmin
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)
          .eq('role', 'student')
          .eq('is_active', true);

        const { count: testCount } = await supabaseAdmin
          .from('tests')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        const { count: materialCount } = await supabaseAdmin
          .from('study_materials')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        return {
          ...course,
          student_count: studentCount || 0,
          test_count: testCount || 0,
          material_count: materialCount || 0,
        };
      })
    );

    res.json({ courses: coursesWithCounts });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new course
export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      title,
      description,
      price,
      duration_value,
      duration_unit,
      duration_hours,
      start_date,
      end_date,
      last_enrollment_date,
      thumbnail,
      instructor,
      category,
      status,
      is_published,
      modules
    } = req.body;

    if (!name && !title) {
      res.status(400).json({ error: 'Course name or title is required' });
      return;
    }

    const insertData: Record<string, unknown> = {
      name: name || title,
      title: title || name,
      is_active: true,
      status: status || 'active',
      modules: modules || []
    };

    if (description !== undefined) insertData.description = description;
    if (thumbnail !== undefined) insertData.thumbnail = thumbnail;
    if (instructor !== undefined) insertData.instructor = instructor;
    if (category !== undefined) insertData.category = category;
    if (price !== undefined) insertData.price = Number(price);
    if (duration_value !== undefined) insertData.duration_value = Number(duration_value);
    if (duration_unit !== undefined) insertData.duration_unit = duration_unit;
    if (duration_hours !== undefined) insertData.duration_hours = Number(duration_hours);
    if (start_date !== undefined) insertData.start_date = start_date;
    if (end_date !== undefined) insertData.end_date = end_date;
    if (last_enrollment_date !== undefined) insertData.last_enrollment_date = last_enrollment_date;
    if (is_published !== undefined) insertData.is_published = Boolean(is_published);

    const { data, error } = await supabaseAdmin
      .from('courses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a course
export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.updated_at) delete updates.updated_at;
    
    const { data, error } = await supabaseAdmin
      .from('courses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a course
export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if any active students are enrolled
    const { count } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id)
      .eq('role', 'student')
      .eq('is_active', true);

    if (count && count > 0) {
      res.status(400).json({ error: 'Cannot delete course with active students' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
};
