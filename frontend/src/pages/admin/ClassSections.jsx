import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiUsers, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import Modal from '../../components/ui/Modal';
import { classAPI } from '../../services/api';

const ClassSections = () => {
  const { classId } = useParams();
  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState(null);
  const [sections, setSections] = useState([]);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [sectionForm, setSectionForm] = useState({ name: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchClassInfo = async () => {
    try {
      const response = await classAPI.getById(classId);
      setClassInfo(response.data);
    } catch (error) {
      toast.error('Failed to fetch class information');
    }
  };

  const fetchSections = async () => {
    try {
      setLoading(true);
      const response = await classAPI.getSections(classId);
      setSections(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassInfo();
    fetchSections();
  }, [classId]);

  const openAddSectionModal = () => {
    setEditingSection(null);
    setSectionForm({ name: '' });
    setShowSectionModal(true);
  };

  const openEditSectionModal = (section) => {
    setEditingSection(section);
    setSectionForm({ name: section.name });
    setShowSectionModal(true);
  };

  const closeSectionModal = () => {
    setShowSectionModal(false);
    setEditingSection(null);
    setSectionForm({ name: '' });
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (editingSection) {
        await classAPI.updateSection(classId, editingSection.id, { name: sectionForm.name });
        toast.success('Section updated successfully');
      } else {
        await classAPI.createSection(classId, { name: sectionForm.name });
        toast.success('Section created successfully');
      }
      closeSectionModal();
      fetchSections();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteModal = (section) => {
    setDeleteTarget(section);
    setShowDeleteModal(true);
  };

  const handleDeleteSection = async () => {
    if (!deleteTarget) return;

    try {
      await classAPI.deleteSection(classId, deleteTarget.id);
      toast.success('Section deleted successfully');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchSections();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  const getTotalStudents = () => {
    return sections.reduce((total, section) => total + (section.student_count || 0), 0);
  };

  return (
    <Layout>
      <div className="app-page">
        <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                to="/admin/classes"
                className="btn btn-secondary"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back to Classes</span>
              </Link>
              <h1>{classInfo?.name || 'Class'} Sections</h1>
            </div>
            <p className="text-sm text-gray-600">
              Manage sections and view students with zone management
            </p>
          </div>
          <Button onClick={openAddSectionModal}>
            <FiPlus className="h-4 w-4" />
            Add Section
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <Card.Body className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{sections.length}</div>
              <div className="text-sm text-gray-600">Total Sections</div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{getTotalStudents()}</div>
              <div className="text-sm text-gray-600">Total Students</div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body className="text-center">
              <div className="text-3xl font-bold text-amber-600 mb-2">
                {sections.length > 0 ? Math.round(getTotalStudents() / sections.length) : 0}
              </div>
              <div className="text-sm text-gray-600">Avg Students/Section</div>
            </Card.Body>
          </Card>
        </div>

        {/* Sections List */}
        {loading ? (
          <Card>
            <Card.Body className="py-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Loading sections...</p>
            </Card.Body>
          </Card>
        ) : sections.length === 0 ? (
          <Card>
            <Card.Body className="py-12 text-center">
              <FiUsers className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-4">No sections found in this class.</p>
              <Button onClick={openAddSectionModal}>
                <FiPlus className="h-4 w-4" />
                Create First Section
              </Button>
            </Card.Body>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map(section => (
              <Card key={section.id} className="hover:shadow-lg transition-shadow">
                <Card.Body className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">{section.name}</h3>
                      <p className="text-sm text-gray-600">Section ID: {section.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="!h-8 !w-8 !p-0"
                        onClick={() => openEditSectionModal(section)}
                      >
                        <FiEdit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="!h-8 !w-8 !p-0 !border-red-200 !text-red-600 hover:!bg-red-50"
                        onClick={() => openDeleteModal(section)}
                      >
                        <FiTrash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Students</span>
                      <span className="text-lg font-bold text-blue-600">{section.student_count || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((section.student_count || 0) * 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <Link
                    to={`/admin/classes/${classId}/sections/${section.id}/students`}
                    className="w-full btn btn-primary flex items-center justify-center gap-2"
                  >
                    <FiUsers className="h-4 w-4" />
                    View Students
                  </Link>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Section Modal */}
        <Modal
          open={showSectionModal}
          onClose={closeSectionModal}
          title={editingSection ? 'Edit Section' : 'Add Section'}
          subtitle={editingSection ? 'Update section name' : 'Create a new section for this class'}
          maxWidth="max-w-md"
          footer={
            <div className="flex gap-3">
              <Button variant="secondary" className="w-full" onClick={closeSectionModal}>
                Cancel
              </Button>
              <Button type="submit" form="section-form" disabled={formLoading} className="w-full">
                {formLoading ? 'Saving...' : editingSection ? 'Update' : 'Create'}
              </Button>
            </div>
          }
        >
          <form id="section-form" onSubmit={handleCreateSection} className="space-y-4">
            <InputField
              label="Section Name *"
              required
              value={sectionForm.name}
              onChange={(e) => setSectionForm({ name: e.target.value })}
              placeholder="e.g., A, B, C"
            />
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
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
              <Button variant="danger" className="w-full" onClick={handleDeleteSection}>
                Delete
              </Button>
            </div>
          }
        >
          {deleteTarget && (
            <p className="text-sm text-gray-600">
              Are you sure you want to delete section <span className="font-medium text-gray-800">{deleteTarget.name}</span>?
            </p>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default ClassSections;
