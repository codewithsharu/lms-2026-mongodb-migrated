import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiUserPlus,
  FiUpload,
  FiBook,
  FiUsers,
  FiCalendar,
  FiDownload
} from 'react-icons/fi';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import Modal from '../../components/ui/Modal';
import { classAPI } from '../../services/api';

const zoneBadgeClass = (zone) => {
  if (zone === 'blue') return 'status-badge info';
  if (zone === 'red') return 'status-badge error';
  if (zone === 'green') return 'status-badge success';
  return 'status-badge warning';
};

const normalizeSectionName = (name) => String(name || '').toUpperCase().trim();

const ClassManage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState(null);
  const [classDetails, setClassDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('sections');

  const [showClassModal, setShowClassModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingSection, setEditingSection] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);

  const [classForm, setClassForm] = useState({ name: '', description: '', academic_year: '' });
  const [sectionForm, setSectionForm] = useState({ name: '' });
  const [assignForm, setAssignForm] = useState({ teacher_id: '', section_id: '' });
  const [bulkAssignFile, setBulkAssignFile] = useState(null);

  const [teachers, setTeachers] = useState([]);
  const [formLoading, setFormLoading] = useState(false);

  const validateAcademicYear = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return { valid: false, error: 'Academic year is required' };
    const match = raw.match(/^(\d{4})-(\d{4})$/);
    if (!match) return { valid: false, error: 'Academic year must be in YYYY-YYYY format' };
    const startYear = Number(match[1]);
    const endYear = Number(match[2]);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear <= startYear) {
      return { valid: false, error: 'Academic year end must be greater than start year' };
    }
    return { valid: true };
  };

  useEffect(() => {
    fetchClassDetails();
  }, [classId]);

  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      const [detailsResponse, sectionsResponse] = await Promise.all([
        classAPI.getById(classId),
        classAPI.getSections(classId)
      ]);

      const details = detailsResponse.data;
      const sectionStats = sectionsResponse.data || [];
      const sectionStatsMap = new Map(sectionStats.map((section) => [section.id, section]));

      const sectionTeacherCounts = (details.teacher_assignments || []).reduce((acc, assignment) => {
        const sectionId = assignment.section?.id;
        if (!sectionId) return acc;
        acc.set(sectionId, (acc.get(sectionId) || 0) + 1);
        return acc;
      }, new Map());

      const mergedSections = (details.sections || []).map((section) => {
        const stats = sectionStatsMap.get(section.id);
        return {
          ...section,
          student_count: stats?.student_count || 0,
          teacher_count: sectionTeacherCounts.get(section.id) || 0
        };
      });

      setClassInfo(details);
      setClassDetails({
        ...details,
        sections: mergedSections
      });
    } catch {
      toast.error('Failed to fetch class details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await classAPI.getTeachers();
      setTeachers(response.data);
    } catch {
      toast.error('Failed to fetch teachers');
    }
  };

  const openEditClass = () => {
    if (!classInfo) return;
    setClassForm({
      name: classInfo.name,
      description: classInfo.description || '',
      academic_year: classInfo.academic_year || ''
    });
    setShowClassModal(true);
  };

  const resetClassForm = () => {
    setClassForm({ name: '', description: '', academic_year: '' });
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!String(classForm.name || '').trim()) {
      toast.error('Class name is required');
      return;
    }
    if (!String(classForm.description || '').trim()) {
      toast.error('Description is required');
      return;
    }
    const yearCheck = validateAcademicYear(classForm.academic_year);
    if (!yearCheck.valid) {
      toast.error(yearCheck.error);
      return;
    }
    setFormLoading(true);

    try {
      await classAPI.update(classId, classForm);
      toast.success('Class updated successfully');
      setShowClassModal(false);
      resetClassForm();
      fetchClassDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const payload = {
        name: normalizeSectionName(sectionForm.name)
      };

      if (editingSection) {
        await classAPI.updateSection(classId, editingSection.id, payload);
        toast.success('Section updated successfully');
      } else {
        await classAPI.createSection(classId, payload);
        toast.success('Section created successfully');
      }

      setShowSectionModal(false);
      resetSectionForm();
      fetchClassDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const openAddSection = () => {
    setEditingSection(null);
    setSectionForm({ name: '' });
    setShowSectionModal(true);
  };

  const openEditSection = (section) => {
    setEditingSection(section);
    setSectionForm({
      name: normalizeSectionName(section.name)
    });
    setShowSectionModal(true);
  };

  const resetSectionForm = () => {
    setEditingSection(null);
    setSectionForm({ name: '' });
  };

  const openAssignTeacher = async () => {
    setAssignForm({ teacher_id: '', section_id: '' });
    setEditingAssignmentId(null);
    await fetchTeachers();
    setShowAssignModal(true);
  };

  const openEditAssignment = async (assignment) => {
    setAssignForm({
      teacher_id: assignment.teacher?.id || assignment.teacher?._id || '',
      section_id: assignment.section?.id || assignment.section?._id || ''
    });
    setEditingAssignmentId(assignment.id || assignment._id);
    await fetchTeachers();
    setShowAssignModal(true);
  };

  const openBulkAssignTeacher = () => {
    setBulkAssignFile(null);
    setShowBulkAssignModal(true);
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (editingAssignmentId) {
        await classAPI.removeAssignment(editingAssignmentId);
      }
      await classAPI.assignTeacher(classId, assignForm);
      toast.success(editingAssignmentId ? 'Teacher assignment updated' : 'Teacher assigned successfully');
      setShowAssignModal(false);
      setEditingAssignmentId(null);
      fetchClassDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Assignment failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await classAPI.removeAssignment(assignmentId);
      toast.success('Assignment removed');
      fetchClassDetails();
    } catch {
      toast.error('Failed to remove assignment');
    }
  };

  const handleBulkAssignTeachers = async (e) => {
    e.preventDefault();

    if (!bulkAssignFile) {
      toast.error('Please choose a CSV file');
      return;
    }

    setFormLoading(true);

    try {
      const response = await classAPI.bulkAssignTeachers(classId, bulkAssignFile);
      const summary = response.data?.summary || {};
      toast.success(`Bulk done: ${summary.created_count || 0} created, ${summary.skipped_count || 0} skipped`);
      setShowBulkAssignModal(false);
      setBulkAssignFile(null);
      fetchClassDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Bulk assignment failed');
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteModal = (type, item) => {
    setDeleteTarget({ type, item });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'class') {
        const response = await classAPI.delete(classId);
        toast.success(response.data?.message || 'Class deleted successfully');
        navigate('/admin/classes');
        return;
      }

      if (deleteTarget.type === 'section') {
        await classAPI.deleteSection(classId, deleteTarget.item.id);
        toast.success('Section deleted successfully');
        fetchClassDetails();
      }

      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  const totalStudents = classDetails?.sections?.reduce((sum, section) => sum + (section.student_count || 0), 0) || 0;
  const unassignedSections = classDetails?.sections?.filter((section) => (section.teacher_count || 0) === 0).length || 0;

  return (
    <Layout>
      <div className="app-page">
        <div className="page-header flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Link to="/admin/classes" className="btn btn-secondary">
                <FiArrowLeft className="h-4 w-4" />
                Back to Classes
              </Link>
              <h1>{classInfo?.name || 'Class Management'}</h1>
            </div>
            <p>Manage sections and teacher assignments for this class.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="!h-9 !w-9 !p-0" onClick={openEditClass}>
              <FiEdit2 className="h-[15px] w-[15px]" />
            </Button>
            <Button
              variant="secondary"
              className="!h-9 !w-9 !p-0 !border-red-200 !text-red-600 hover:!bg-red-50"
              onClick={() => openDeleteModal('class', classInfo)}
            >
              <FiTrash2 className="h-[15px] w-[15px]" />
            </Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <Card.Body className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-4 text-sm text-slate-500">Loading class...</p>
            </Card.Body>
          </Card>
        ) : !classDetails ? (
          <Card>
            <Card.Body className="py-12 text-center">
              <FiBook className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-500">Class details not available.</p>
            </Card.Body>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="border-slate-200">
              <Card.Body className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('sections')}
                    className={`btn btn-secondary !h-9 !px-3 ${activeTab === 'sections' ? '!bg-slate-900 !text-white' : ''}`}
                  >
                    <FiBook className="h-4 w-4" />
                    Sections
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('teachers')}
                    className={`btn btn-secondary !h-9 !px-3 ${activeTab === 'teachers' ? '!bg-slate-900 !text-white' : ''}`}
                  >
                    <FiUsers className="h-4 w-4" />
                    Teachers
                  </button>
                  <div className="ml-auto flex flex-wrap gap-2">
                    {activeTab === 'sections' ? (
                      <Button variant="secondary" className="!h-9 !px-3" onClick={openAddSection}>
                        <FiPlus className="h-4 w-4" />
                        Add Section
                      </Button>
                    ) : (
                      <>
                        {/* <Button variant="secondary" className="!h-9 !px-3" onClick={openBulkAssignTeacher}>
                          <FiUpload className="h-4 w-4" />
                          Bulk CSV
                        </Button> */}
                        <Button variant="secondary" className="!h-9 !px-3" onClick={openAssignTeacher}>
                          <FiUserPlus className="h-4 w-4" />
                          Assign
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {activeTab === 'sections' ? (
                  <div className="space-y-2">
                    {classDetails.sections.length === 0 ? (
                      <p className="text-sm text-slate-400">No sections yet.</p>
                    ) : (
                      classDetails.sections.map((section) => (
                        <div
                          key={section.id}
                          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-700">{normalizeSectionName(section.name)}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="status-badge info">{section.student_count || 0} students</span>
                              <span className="status-badge success">{section.teacher_count || 0} teachers</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/classes/${classId}/sections/${section.id}/students`}
                              className="btn btn-secondary !h-8 !px-3 inline-flex items-center gap-2"
                            >
                              View Students
                            </Link>
                            <Button
                              variant="secondary"
                              className="!h-8 !w-8 !p-0"
                              onClick={() => openEditSection(section)}
                            >
                              <FiEdit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="secondary"
                              className="!h-8 !w-8 !p-0 !border-red-200 !text-red-600 hover:!bg-red-50"
                              onClick={() => openDeleteModal('section', section)}
                            >
                              <FiTrash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {classDetails.teacher_assignments.length === 0 ? (
                      <p className="text-sm text-slate-400">No teachers assigned yet.</p>
                    ) : (
                      classDetails.teacher_assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                              {assignment.teacher?.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">{assignment.teacher?.full_name}</p>
                              <p className="text-xs text-slate-500">{assignment.teacher?.email}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                {assignment.section && (
                                  <span className="status-badge info">Section: {normalizeSectionName(assignment.section.name)}</span>
                                )}
                                {assignment.zone && (
                                  <span className={`${zoneBadgeClass(assignment.zone)} capitalize`}>
                                    {assignment.zone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              className="!h-8 !w-8 !p-0"
                              onClick={() => openEditAssignment(assignment)}
                            >
                              <FiEdit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="secondary"
                              className="!h-8 !w-8 !p-0 !border-red-200 !text-red-600 hover:!bg-red-50"
                              onClick={() => handleRemoveAssignment(assignment.id)}
                            >
                              <FiTrash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        )}
      </div>

      <Modal
        open={showClassModal}
        onClose={() => {
          setShowClassModal(false);
          resetClassForm();
        }}
        title="Edit Class"
        subtitle="Update class name, year, and description."
        maxWidth="max-w-lg"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="w-full sm:w-32"
              onClick={() => {
                setShowClassModal(false);
                resetClassForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="class-form" disabled={formLoading} className="w-full sm:w-36">
              {formLoading ? 'Saving...' : 'Update'}
            </Button>
          </div>
        }
      >
        <form id="class-form" onSubmit={handleUpdateClass} className="space-y-4">
          <InputField
            label="Class Name *"
            required
            value={classForm.name}
            onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
            placeholder="e.g., CSE-2024"
          />

          <div>
            <label className="form-label">Description</label>
            <textarea
              value={classForm.description}
              onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
              className="form-input min-h-[100px] resize-y"
              placeholder="Class description"
            />
          </div>

          <InputField
            label="Academic Year"
            value={classForm.academic_year}
            onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })}
            placeholder="e.g., 2024-2025"
          />
        </form>
      </Modal>

      <Modal
        open={showSectionModal}
        onClose={() => {
          setShowSectionModal(false);
          resetSectionForm();
        }}
        title={editingSection ? 'Edit Section' : 'Add Section'}
        subtitle="Use short section names (automatically saved in UPPERCASE)."
        maxWidth="max-w-lg"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="w-full sm:w-32"
              onClick={() => {
                setShowSectionModal(false);
                resetSectionForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="section-form" disabled={formLoading} className="w-full sm:w-36">
              {formLoading ? 'Saving...' : editingSection ? 'Update' : 'Add Section'}
            </Button>
          </div>
        }
      >
        <form id="section-form" onSubmit={handleCreateSection} className="space-y-4">
          <InputField
            label="Section Name *"
            required
            value={sectionForm.name}
            onChange={(e) => setSectionForm({ ...sectionForm, name: normalizeSectionName(e.target.value) })}
            placeholder="e.g., A, B, C"
          />
        </form>
      </Modal>

      <Modal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={editingAssignmentId ? 'Edit Assignment' : 'Assign Teacher'}
        subtitle="Assign a teacher to this class and section."
        maxWidth="max-w-lg"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="w-full sm:w-32" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="assign-form" disabled={formLoading} className="w-full sm:w-36" variant="success">
              {formLoading ? 'Saving...' : editingAssignmentId ? 'Update' : 'Assign'}
            </Button>
          </div>
        }
      >
        <form id="assign-form" onSubmit={handleAssignTeacher} className="space-y-4">
          {classDetails?.sections?.length > 0 && (
            <div className="surface-card-muted p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Available Sections</p>
              <div className="flex flex-wrap gap-2">
                {classDetails.sections.map((section) => (
                  <span key={section.id} className="status-badge info">
                    {normalizeSectionName(section.name)} • {section.student_count || 0} students
                  </span>
                ))}
              </div>
            </div>
          )}

          <SelectField
            label="Teacher *"
            required
            value={assignForm.teacher_id}
            onChange={(e) => setAssignForm({ ...assignForm, teacher_id: e.target.value })}
          >
            <option value="">Select Teacher</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.full_name} ({teacher.email})
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Section"
            value={assignForm.section_id}
            onChange={(e) => setAssignForm({ ...assignForm, section_id: e.target.value })}
          >
            <option value="">All Sections</option>
            {classDetails?.sections?.map((section) => (
              <option key={section.id} value={section.id}>
                {normalizeSectionName(section.name)} ({section.student_count || 0} students)
              </option>
            ))}
          </SelectField>

        </form>
      </Modal>

      <Modal
        open={showDeleteModal && !!deleteTarget}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        title="Confirm Delete"
        subtitle="This action cannot be undone."
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" className="w-full" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      >
        {deleteTarget && (
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this {deleteTarget.type}: <span className="font-medium text-slate-800">{deleteTarget.item?.name}</span>?
          </p>
        )}
      </Modal>

      <Modal
        open={showBulkAssignModal}
        onClose={() => {
          setShowBulkAssignModal(false);
          setBulkAssignFile(null);
        }}
        title="Bulk Assign Teachers"
        subtitle="Upload a CSV to assign multiple teachers to this class and section in one step."
        maxWidth="max-w-xl"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="w-full sm:w-32"
              onClick={() => {
                setShowBulkAssignModal(false);
                setBulkAssignFile(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="bulk-assign-form" disabled={formLoading} className="w-full sm:w-40" variant="success">
              {formLoading ? 'Uploading...' : 'Upload CSV'}
            </Button>
          </div>
        }
      >
        <form id="bulk-assign-form" onSubmit={handleBulkAssignTeachers} className="space-y-4">
          <div className="surface-card-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CSV Columns</p>
            <p className="mt-1 text-sm text-slate-600">
              Required: <span className="font-medium">teacher_email</span> (or <span className="font-medium">teacher_id</span>)
            </p>
            <p className="text-sm text-slate-600">
              Optional: <span className="font-medium">section_name</span> / <span className="font-medium">section_id</span>
            </p>
            <a
              href="/teacher-assignments-template.csv"
              download
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <FiDownload className="h-4 w-4" />
              Download CSV Template
            </a>
          </div>

          <div>
            <label className="form-label">Select CSV File *</label>
            <input
              type="file"
              accept=".csv,text/csv"
              className="form-input"
              onChange={(e) => setBulkAssignFile(e.target.files?.[0] || null)}
            />
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default ClassManage;
