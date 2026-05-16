/**
 * Profile Management Service
 * Enterprise-level profile and class management with full visibility
 */

const User = require('../models/User');
const Class = require('../models/Class');
const Section = require('../models/Section');
const StudentDetail = require('../models/StudentDetail');
const TeacherAssignment = require('../models/TeacherAssignment');
const ApiAuditLog = require('../models/ApiAuditLog');

class ProfileManagementService {
  constructor() {
    this.zones = ['blue', 'red', 'green'];
  }

  /**
   * Get comprehensive student profile with teacher visibility
   */
  async getStudentProfile(studentId, requestingUserId = null) {
    try {
      const student = await User.findById(studentId).select('-password_hash');
      if (!student) {
        throw new Error('Student not found');
      }

      const studentDetail = await StudentDetail.findOne({ user_id: studentId })
        .populate('class_id', 'name description academic_year')
        .populate('section_id', 'name capacity');

      if (!studentDetail) {
        throw new Error('Student details not found');
      }

      // Get teacher assignments scoped to this student's class/section/zone
      const sectionOr = [
        { section_id: null },
        { section_id: { $exists: false } }
      ];
      if (studentDetail.section_id) {
        sectionOr.push({ section_id: studentDetail.section_id });
      }

      const zoneOr = [
        { zone: null },
        { zone: { $exists: false } }
      ];
      if (studentDetail.zone) {
        zoneOr.push({ zone: studentDetail.zone });
      }

      const teacherAssignments = await TeacherAssignment.find({
        class_id: studentDetail.class_id,
        $and: [
          { $or: sectionOr },
          { $or: zoneOr }
        ]
      }).populate('teacher_id', 'full_name email').populate('section_id', 'name');

      // Get assigned teachers
      const assignedTeachers = teacherAssignments.map(assignment => ({
        teacher_id: assignment.teacher_id._id,
        full_name: assignment.teacher_id.full_name,
        email: assignment.teacher_id.email,
        assignment_type: assignment.section_id ? 'section' : 'class',
        class_name: studentDetail.class_id?.name,
        section_name: assignment.section_id?.name || null,
        zone: assignment.zone
      }));

      // Get student's recent activity
      const recentActivity = await ApiAuditLog.find({
        user_id: studentId,
        created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      })
      .select('api_module api_endpoint performance.duration_ms response_status created_at')
      .sort({ created_at: -1 })
      .limit(10);

      const profile = {
        user: {
          id: student._id,
          full_name: student.full_name,
          email: student.email,
          phone: student.phone,
          profile_photo: student.profile_photo,
          role: student.role,
          is_active: student.is_active,
          created_at: student.created_at,
          last_login: student.last_login
        },
        academic_info: {
          roll_number: studentDetail.roll_number,
          class: studentDetail.class_id,
          section: studentDetail.section_id,
          zone: studentDetail.zone,
          academic_year: studentDetail.class_id?.academic_year
        },
        teachers: assignedTeachers,
        recent_activity: recentActivity,
        statistics: {
          total_teachers: assignedTeachers.length,
          class_teachers: assignedTeachers.filter(t => t.assignment_type === 'class').length,
          section_teachers: assignedTeachers.filter(t => t.assignment_type === 'section').length,
          zone_teachers: assignedTeachers.filter(t => t.zone).length
        }
      };

      return {
        success: true,
        data: profile
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get comprehensive teacher profile with class and student management
   */
  async getTeacherProfile(teacherId, includeStudents = true) {
    try {
      const teacher = await User.findById(teacherId).select('-password_hash');
      if (!teacher) {
        throw new Error('Teacher not found');
      }

      // Get teacher's assignments
      const assignments = await TeacherAssignment.find({ teacher_id: teacherId })
        .populate('class_id', 'name description academic_year')
        .populate('section_id', 'name capacity')
        .sort({ 'class_id.name': 1, 'section_id.name': 1 });

      // Group assignments by class
      const classAssignments = {};
      assignments.forEach(assignment => {
        const classId = assignment.class_id?._id?.toString();
        if (classId) {
          if (!classAssignments[classId]) {
            classAssignments[classId] = {
              class: assignment.class_id,
              sections: [],
              zones: new Set()
            };
          }
          
          if (assignment.section_id) {
            classAssignments[classId].sections.push(assignment.section_id);
          }
          
          if (assignment.zone) {
            classAssignments[classId].zones.add(assignment.zone);
          }
        }
      });

      // Convert to array and add student counts
      const classesWithDetails = [];
      for (const [classId, classData] of Object.entries(classAssignments)) {
        const classInfo = {
          class: classData.class,
          sections: classData.sections,
          zones: Array.from(classData.zones),
          student_count: 0,
          zone_distribution: {}
        };

        if (includeStudents) {
          // Get students in this teacher's assigned classes/sections
          const studentQuery = {
            class_id: classId
          };
          
          // Add section filter if teacher has specific sections
          if (classData.sections.length > 0) {
            studentQuery.section_id = { $in: classData.sections.map(s => s._id) };
          }

          const students = await StudentDetail.find(studentQuery)
            .populate('user_id', 'full_name email')
            .populate('section_id', 'name');

          classInfo.student_count = students.length;
          
          // Calculate zone distribution
          students.forEach(student => {
            const zone = student.zone || 'unassigned';
            classInfo.zone_distribution[zone] = (classInfo.zone_distribution[zone] || 0) + 1;
          });

          classInfo.students = students.map(student => ({
            student_id: student.user_id._id,
            full_name: student.user_id.full_name,
            email: student.user_id.email,
            roll_number: student.roll_number,
            section: student.section_id?.name,
            zone: student.zone,
            is_active: student.user_id.is_active
          }));
        }

        classesWithDetails.push(classInfo);
      }

      // Get teacher's recent activity
      const recentActivity = await ApiAuditLog.find({
        user_id: teacherId,
        created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
      .select('api_module api_endpoint performance.duration_ms response_status created_at')
      .sort({ created_at: -1 })
      .limit(10);

      const profile = {
        user: {
          id: teacher._id,
          full_name: teacher.full_name,
          email: teacher.email,
          phone: teacher.phone,
          profile_photo: teacher.profile_photo,
          role: teacher.role,
          is_active: teacher.is_active,
          created_at: teacher.created_at,
          last_login: teacher.last_login
        },
        assignments: {
          total_classes: classesWithDetails.length,
          total_sections: classesWithDetails.reduce((sum, c) => sum + c.sections.length, 0),
          total_students: classesWithDetails.reduce((sum, c) => sum + c.student_count, 0),
          classes: classesWithDetails
        },
        recent_activity: recentActivity,
        statistics: {
          total_assignments: assignments.length,
          unique_zones: [...new Set(assignments.map(a => a.zone).filter(Boolean))].length,
          avg_students_per_class: classesWithDetails.length > 0 ? 
            Math.round(classesWithDetails.reduce((sum, c) => sum + c.student_count, 0) / classesWithDetails.length) : 0
        }
      };

      return {
        success: true,
        data: profile
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get class details with student list and zone management
   */
  async getClassDetails(classId, includeStudents = true, requestingUserId = null) {
    try {
      const classInfo = await Class.findById(classId);
      if (!classInfo) {
        throw new Error('Class not found');
      }

      // Get sections in this class
      const sections = await Section.find({ class_id })
        .sort({ name: 1 });

      // Get teacher assignments for this class
      const teacherAssignments = await TeacherAssignment.find({ class_id })
        .populate('teacher_id', 'full_name email')
        .populate('section_id', 'name');

      // Group teachers by section
      const teachersBySection = {};
      teacherAssignments.forEach(assignment => {
        const sectionId = assignment.section_id?._id?.toString() || 'class_level';
        if (!teachersBySection[sectionId]) {
          teachersBySection[sectionId] = [];
        }
        teachersBySection[sectionId].push({
          teacher_id: assignment.teacher_id._id,
          full_name: assignment.teacher_id.full_name,
          email: assignment.teacher_id.email,
          zone: assignment.zone
        });
      });

      let students = [];
      let zoneDistribution = {};

      if (includeStudents) {
        // Get all students in this class
        const studentDetails = await StudentDetail.find({ class_id })
          .populate('user_id', 'full_name email is_active')
          .populate('section_id', 'name')
          .sort({ 'user_id.full_name': 1 });

        students = studentDetails.map(student => ({
          student_id: student.user_id._id,
          full_name: student.user_id.full_name,
          email: student.user_id.email,
          roll_number: student.roll_number,
          section: student.section_id?.name || 'Unassigned',
          zone: student.zone || 'unassigned',
          is_active: student.user_id.is_active
        }));

        // Calculate zone distribution
        students.forEach(student => {
          const zone = student.zone;
          zoneDistribution[zone] = (zoneDistribution[zone] || 0) + 1;
        });
      }

      const classDetails = {
        class: {
          id: classInfo._id,
          name: classInfo.name,
          description: classInfo.description,
          academic_year: classInfo.academic_year,
          is_active: classInfo.is_active,
          created_at: classInfo.created_at
        },
        sections: sections.map(section => ({
          id: section._id,
          name: section.name,
          capacity: section.capacity,
          teachers: teachersBySection[section._id.toString()] || []
        })),
        teachers: {
          class_level: teachersBySection['class_level'] || [],
          total_unique: [...new Set(teacherAssignments.map(a => a.teacher_id._id.toString()))].length
        },
        students: {
          list: students,
          total_count: students.length,
          active_count: students.filter(s => s.is_active).length,
          zone_distribution: zoneDistribution
        },
        statistics: {
          total_sections: sections.length,
          total_students: students.length,
          total_teachers: teacherAssignments.length,
          zones_assigned: Object.keys(zoneDistribution).filter(z => z !== 'unassigned').length
        }
      };

      return {
        success: true,
        data: classDetails
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update student zones in bulk
   */
  async updateStudentZones(classId, zoneUpdates, requestingUserId) {
    try {
      const results = [];
      
      for (const update of zoneUpdates) {
        const { student_id, new_zone } = update;
        
        // Validate zone
        if (!this.zones.includes(new_zone)) {
          results.push({
            student_id,
            success: false,
            error: 'Invalid zone'
          });
          continue;
        }

        // Update student detail
        const updateResult = await StudentDetail.updateOne(
          { user_id: student_id, class_id: classId },
          { zone: new_zone, updated_at: new Date() }
        );

        if (updateResult.modifiedCount > 0) {
          results.push({
            student_id,
            success: true,
            new_zone
          });
        } else {
          results.push({
            student_id,
            success: false,
            error: 'Student not found or no changes needed'
          });
        }
      }

      return {
        success: true,
        data: {
          updated_count: results.filter(r => r.success).length,
          failed_count: results.filter(r => !r.success).length,
          results
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Assign teacher to class/section with zone
   */
  async assignTeacher(assignmentData, requestingUserId) {
    try {
      const {
        teacher_id,
        class_id,
        section_id = null,
        zone = null
      } = assignmentData;

      // Check if teacher exists
      const teacher = await User.findById(teacher_id);
      if (!teacher || teacher.role !== 'teacher') {
        throw new Error('Invalid teacher');
      }

      // Check if class exists
      const classInfo = await Class.findById(class_id);
      if (!classInfo) {
        throw new Error('Class not found');
      }

      // Check if section exists (if provided)
      if (section_id) {
        const section = await Section.findById(section_id);
        if (!section || section.class_id.toString() !== class_id) {
          throw new Error('Invalid section for this class');
        }
      }

      // Check if assignment already exists
      const existingAssignment = await TeacherAssignment.findOne({
        teacher_id,
        class_id,
        section_id: section_id || null,
        zone: zone || null
      });

      if (existingAssignment) {
        throw new Error('Assignment already exists');
      }

      // Create new assignment
      const assignment = new TeacherAssignment({
        teacher_id,
        class_id,
        section_id,
        zone,
        assigned_by: requestingUserId
      });

      await assignment.save();

      return {
        success: true,
        data: {
          assignment_id: assignment._id,
          message: 'Teacher assigned successfully'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove teacher assignment
   */
  async removeTeacherAssignment(assignmentId, requestingUserId) {
    try {
      const assignment = await TeacherAssignment.findById(assignmentId);
      if (!assignment) {
        throw new Error('Assignment not found');
      }

      await TeacherAssignment.deleteOne({ _id: assignmentId });

      return {
        success: true,
        data: {
          message: 'Teacher assignment removed successfully'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all classes with teacher assignments
   */
  async getAllClassesWithTeachers(includeStudents = false) {
    try {
      const classes = await Class.find({ is_active: true })
        .sort({ name: 1 });

      const classesWithTeachers = [];

      for (const classInfo of classes) {
        const classDetails = await this.getClassDetails(classInfo._id, includeStudents);
        if (classDetails.success) {
          classesWithTeachers.push(classDetails.data);
        }
      }

      return {
        success: true,
        data: classesWithTeachers
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get API usage statistics for monitoring
   */
  async getApiUsageStatistics(filters = {}) {
    try {
      const stats = await ApiAuditLog.getApiStatistics(filters);
      
      return {
        success: true,
        data: {
          ...stats,
          success_rate: stats.total_requests > 0 ? 
            (stats.successful_requests / stats.total_requests * 100).toFixed(2) : 0,
          error_rate: stats.total_requests > 0 ? 
            (stats.failed_requests / stats.total_requests * 100).toFixed(2) : 0
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get module usage breakdown
   */
  async getModuleUsage(timeRange = '24h') {
    try {
      const moduleUsage = await ApiAuditLog.getModuleUsage(timeRange);
      
      return {
        success: true,
        data: moduleUsage.map(module => ({
          ...module,
          unique_user_count: module.unique_users.length,
          error_rate: module.request_count > 0 ? 
            (module.error_count / module.request_count * 100).toFixed(2) : 0
        }))
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get error analysis for troubleshooting
   */
  async getErrorAnalysis(timeRange = '24h') {
    try {
      const errorAnalysis = await ApiAuditLog.getErrorAnalysis(timeRange);
      
      return {
        success: true,
        data: errorAnalysis.map(error => ({
          ...error,
          unique_user_count: error.unique_users.length,
          last_occurred_formatted: new Date(error.last_occurred).toLocaleString()
        }))
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search students by various criteria
   */
  async searchStudents(criteria, requestingUserId) {
    try {
      const {
        query,
        class_id,
        section_id,
        zone,
        is_active = true,
        limit = 50,
        offset = 0
      } = criteria;

      // Build search query
      const searchQuery = { is_active };
      
      if (class_id) searchQuery.class_id = class_id;
      if (section_id) searchQuery.section_id = section_id;
      if (zone) searchQuery.zone = zone;

      if (query) {
        // Search by name or roll number
        const users = await User.find({
          $and: [
            { role: 'student', is_active: true },
            {
              $or: [
                { full_name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
              ]
            }
          ]
        }).select('_id');

        searchQuery.user_id = { $in: users.map(u => u._id) };
      }

      const students = await StudentDetail.find(searchQuery)
        .populate('user_id', 'full_name email phone profile_photo')
        .populate('class_id', 'name academic_year')
        .populate('section_id', 'name')
        .sort({ 'user_id.full_name': 1 })
        .skip(offset)
        .limit(limit);

      // Get teacher assignments for each student
      const studentsWithTeachers = await Promise.all(
        students.map(async (student) => {
          const teacherAssignments = await TeacherAssignment.find({
            $or: [
              { class_id: student.class_id?._id },
              { section_id: student.section_id?._id }
            ]
          }).populate('teacher_id', 'full_name email');

          return {
            student_id: student.user_id._id,
            full_name: student.user_id.full_name,
            email: student.user_id.email,
            phone: student.user_id.phone,
            profile_photo: student.user_id.profile_photo,
            roll_number: student.roll_number,
            class: student.class_id,
            section: student.section_id,
            zone: student.zone,
            teachers: teacherAssignments.map(ta => ({
              teacher_id: ta.teacher_id._id,
              full_name: ta.teacher_id.full_name,
              email: ta.teacher_id.email,
              assignment_type: ta.section_id ? 'section' : 'class',
              zone: ta.zone
            }))
          };
        })
      );

      const total = await StudentDetail.countDocuments(searchQuery);

      return {
        success: true,
        data: {
          students: studentsWithTeachers,
          pagination: {
            total,
            limit,
            offset,
            has_more: offset + limit < total
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get dashboard statistics for admin
   */
  async getDashboardStatistics() {
    try {
      const [
        totalUsers,
        totalTeachers,
        totalStudents,
        totalClasses,
        totalSections,
        apiStats
      ] = await Promise.all([
        User.countDocuments({ is_active: true }),
        User.countDocuments({ role: 'teacher', is_active: true }),
        User.countDocuments({ role: 'student', is_active: true }),
        Class.countDocuments({ is_active: true }),
        Section.countDocuments(),
        this.getApiUsageStatistics({ startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      ]);

      // Get zone distribution
      const zoneStats = await StudentDetail.aggregate([
        { $match: { zone: { $ne: null } } },
        {
          $group: {
            _id: '$zone',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        success: true,
        data: {
          users: {
            total: totalUsers,
            teachers: totalTeachers,
            students: totalStudents,
            ratio: totalStudents > 0 ? (totalTeachers / totalStudents).toFixed(2) : '0'
          },
          classes: {
            total: totalClasses,
            sections: totalSections,
            avg_sections_per_class: totalClasses > 0 ? (totalSections / totalClasses).toFixed(1) : '0'
          },
          zones: {
            distribution: zoneStats,
            total_assigned: zoneStats.reduce((sum, z) => sum + z.count, 0)
          },
          api: apiStats.data || {}
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ProfileManagementService();
