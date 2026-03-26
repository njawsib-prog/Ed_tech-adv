import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

// Get all courses
export const getCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select(`
        *,
        modules (
          id,
          name,
          order_index,
          subjects (
            id,
            name,
            order_index
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Get counts for each course
    const coursesWithCounts = await Promise.all(
      (courses || []).map(async (course) => {
        const { count: studentCount } = await supabaseAdmin
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)
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

    res.json(coursesWithCounts);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new course
export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Course name is required' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('courses')
      .insert({ name, description, is_active: true })
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
    const { name, description, is_active } = req.body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('courses')
      .update(updateData)
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
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id)
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

// Get modules for a course
export const getCourseModules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('modules')
      .select(`
        *,
        subjects (*)
      `)
      .eq('course_id', id)
      .order('order_index');

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Get course modules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a module
export const createModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, order_index } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Module name is required' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('modules')
      .insert({
        course_id: id,
        name,
        order_index: order_index || 0,
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a module
export const updateModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, order_index } = req.body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (order_index !== undefined) updateData.order_index = order_index;

    const { data, error } = await supabaseAdmin
      .from('modules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a module
export const deleteModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('modules')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a subject
export const createSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, order_index } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Subject name is required' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('subjects')
      .insert({
        module_id: id,
        name,
        order_index: order_index || 0,
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a subject
export const updateSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, order_index } = req.body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (order_index !== undefined) updateData.order_index = order_index;

    const { data, error } = await supabaseAdmin
      .from('subjects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a subject
export const deleteSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseModules,
  createModule,
  updateModule,
  deleteModule,
  createSubject,
  updateSubject,
  deleteSubject,
};