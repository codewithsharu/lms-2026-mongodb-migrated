import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiBook,
  FiChevronRight,
  FiCalendar
} from 'react-icons/fi';
import { classAPI } from '../../services/api';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import Modal from '../../components/ui/Modal';

const ClassManagement = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClassModal, setShowClassModal] = useState(false);
  const [classForm, setClassForm] = useState({ name: '', description: '', academic_year: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await classAPI.getAll();
      setClasses(response.data);
    } catch {
      toast.error('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await classAPI.create(classForm);
      toast.success('Class created successfully');
      setShowClassModal(false);
      resetClassForm();
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const resetClassForm = () => {
    setClassForm({ name: '', description: '', academic_year: '' });
  };

  const totals = classes.reduce(
    (acc, cls) => {
      acc.sections += Number(cls.section_count || 0);
      acc.students += Number(cls.student_count || 0);
      acc.teachers += Number(cls.teacher_count || 0);
      return acc;
    },
    { sections: 0, students: 0, teachers: 0 }
  );

  return (
    <Layout>
      <div className="app-page">
        <div className="page-header flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1>Class Management</h1>
            <p>Manage classes, sections, and teacher assignments in a structured view.</p>
          </div>
          <Button
            onClick={() => {
              resetClassForm();
              setShowClassModal(true);
            }}
          >
            <FiPlus className="h-4 w-4" />
            Add Class
          </Button>
        </div>

        {loading ? (
          <Card>
            <Card.Body className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-4 text-sm text-slate-500">Loading classes...</p>
            </Card.Body>
          </Card>
        ) : classes.length === 0 ? (
          <Card>
            <Card.Body className="py-12 text-center">
              <FiBook className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-500">No classes found. Create your first class.</p>
            </Card.Body>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-slate-200">
                <Card.Body className="p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Classes</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-800">{classes.length}</p>
                </Card.Body>
              </Card>
              <Card className="border-slate-200">
                <Card.Body className="p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Sections</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-800">{totals.sections}</p>
                </Card.Body>
              </Card>
              <Card className="border-slate-200">
                <Card.Body className="p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Students</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-800">{totals.students}</p>
                </Card.Body>
              </Card>
              <Card className="border-slate-200">
                <Card.Body className="p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Teachers</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-800">{totals.teachers}</p>
                </Card.Body>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {classes.map((cls) => (
                <Card key={cls.id} className="border-slate-200">
                  <Card.Body className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-slate-800">{cls.name}</h3>
                        {cls.academic_year && (
                          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                            <FiCalendar className="h-3.5 w-3.5" />
                            {cls.academic_year}
                          </p>
                        )}
                      </div>
                      <span className={cls.is_active ? 'status-badge success' : 'status-badge warning'}>
                        {cls.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1 text-sm text-slate-600">
                      <p>{cls.section_count} sections</p>
                      <p>{cls.student_count} students</p>
                      <p>{cls.teacher_count} teachers</p>
                    </div>

                    <div className="mt-4">
                      <Link
                        to={`/admin/classes/${cls.id}/manage`}
                        className="btn btn-secondary !h-9 !px-3 inline-flex items-center gap-2"
                      >
                        Manage
                        <FiChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={showClassModal}
        onClose={() => {
          setShowClassModal(false);
          resetClassForm();
        }}
        title="Create Class"
        subtitle="Set class name, year, and optional description."
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
              {formLoading ? 'Saving...' : 'Create'}
            </Button>
          </div>
        }
      >
        <form id="class-form" onSubmit={handleCreateClass} className="space-y-4">
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
    </Layout>
  );
};

export default ClassManagement;
