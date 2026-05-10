import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUsers } from 'react-icons/fi';
import {
  Box,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import Modal from '../../components/ui/Modal';
import { departmentAPI } from '../../services/api';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTeachersModal, setShowTeachersModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);

  const getEmptyForm = () => ({ name: '', description: '', is_active: true });
  const [formData, setFormData] = useState(getEmptyForm());

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, searchQuery, statusFilter]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 10,
        search: searchQuery,
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await departmentAPI.getAll(params);
      setDepartments(response.data?.departments || []);
      setPagination(response.data?.pagination || { page: 1, total: 0, totalPages: 0 });
    } catch {
      toast.error('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!String(formData.name || '').trim()) {
      errors.name = 'Department name is required';
    }
    return errors;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setFormLoading(true);
      await departmentAPI.create({ name: formData.name, description: formData.description });
      toast.success('Department created successfully');
      setShowCreateModal(false);
      setFormData(getEmptyForm());
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedDepartment) return;

    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setFormLoading(true);
      await departmentAPI.update(selectedDepartment.id, {
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active,
      });
      toast.success('Department updated successfully');
      setShowEditModal(false);
      setSelectedDepartment(null);
      setFormData(getEmptyForm());
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return;

    try {
      setDeleteLoading(true);
      await departmentAPI.delete(selectedDepartment.id);
      toast.success('Department deleted successfully');
      setShowDeleteModal(false);
      setSelectedDepartment(null);
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditModal = (dept) => {
    setSelectedDepartment(dept);
    setFormData({
      name: dept.name || '',
      description: dept.description || '',
      is_active: dept.is_active ?? true,
    });
    setShowEditModal(true);
  };

  const openTeachersModal = async (dept) => {
    setSelectedDepartment(dept);
    setShowTeachersModal(true);
    setTeachersLoading(true);
    try {
      const response = await departmentAPI.getTeachers(dept.id);
      setTeachers(response.data?.teachers || []);
    } catch (error) {
      toast.error('Failed to fetch teachers');
      setTeachers([]);
    } finally {
      setTeachersLoading(false);
    }
  };

  return (
    <Layout>
      <div className="app-page">
        <div className="page-header flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1>Departments</h1>
            <p>Manage department catalog for teacher profiles.</p>
          </div>
          <Button
            onClick={() => {
              setFormData(getEmptyForm());
              setFormErrors({});
              setShowCreateModal(true);
            }}
          >
            <FiPlus className="h-4 w-4" />
            Add Department
          </Button>
        </div>

        <Card>
          <Card.Body>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 200px' }} gap={2}>
              <TextField
                label="Search"
                size="small"
                placeholder="Search departments"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FiSearch className="h-4 w-4" />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small">
                <Select
                  displayEmpty
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Departments</h2>
              <p className="body-sm">{pagination.total} total records</p>
            </div>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small" aria-label="departments table">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
                        </TableCell>
                        <TableCell>
                          <div className="h-5 w-60 animate-pulse rounded bg-slate-100" />
                        </TableCell>
                        <TableCell>
                          <div className="h-5 w-20 animate-pulse rounded bg-slate-100" />
                        </TableCell>
                        <TableCell align="right">
                          <div className="ml-auto h-5 w-24 animate-pulse rounded bg-slate-100" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : departments.length > 0 ? (
                    departments.map((dept) => (
                      <TableRow key={dept.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {dept.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {dept.description || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <span className={dept.is_active ? 'status-badge success' : 'status-badge warning'}>
                            {dept.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell align="right">
                          <div className="flex justify-end gap-3">
                            <Button variant="secondary" className="!h-9 !w-9 !p-0" onClick={() => openTeachersModal(dept)}>
                              <FiUsers className="h-[15px] w-[15px]" />
                            </Button>
                            <Button variant="secondary" className="!h-9 !w-9 !p-0" onClick={() => openEditModal(dept)}>
                              <FiEdit2 className="h-[15px] w-[15px]" />
                            </Button>
                            <Button
                              variant="secondary"
                              className="!h-9 !w-9 !p-0 !border-red-200 !text-red-600 hover:!bg-red-50"
                              onClick={() => {
                                setSelectedDepartment(dept);
                                setShowDeleteModal(true);
                              }}
                            >
                              <FiTrash2 className="h-[15px] w-[15px]" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No departments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {pagination.totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="body-sm">
                  Showing {departments.length} of {pagination.total} departments
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData(getEmptyForm());
          setFormErrors({});
        }}
        title="Create Department"
        subtitle="Add department details and status."
        maxWidth="max-w-lg"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="w-full sm:w-32"
              onClick={() => {
                setShowCreateModal(false);
                setFormData(getEmptyForm());
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="department-create-form" disabled={formLoading} className="w-full sm:w-36">
              {formLoading ? 'Saving...' : 'Create'}
            </Button>
          </div>
        }
      >
        <form id="department-create-form" onSubmit={handleCreate} className="space-y-4">
          <InputField
            label="Department Name *"
            required
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (formErrors.name) {
                setFormErrors((prev) => ({ ...prev, name: '' }));
              }
            }}
            placeholder="e.g., Computer Science"
          />
          {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}

          <div>
            <label className="form-label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-input min-h-[100px] resize-y"
              placeholder="Department description"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={showEditModal && !!selectedDepartment}
        onClose={() => {
          setShowEditModal(false);
          setSelectedDepartment(null);
          setFormData(getEmptyForm());
          setFormErrors({});
        }}
        title="Edit Department"
        subtitle="Update department details and status."
        maxWidth="max-w-lg"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="w-full sm:w-32"
              onClick={() => {
                setShowEditModal(false);
                setSelectedDepartment(null);
                setFormData(getEmptyForm());
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="department-edit-form" disabled={formLoading} className="w-full sm:w-36">
              {formLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        {selectedDepartment && (
          <form id="department-edit-form" onSubmit={handleUpdate} className="space-y-4">
            <InputField
              label="Department Name *"
              required
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formErrors.name) {
                  setFormErrors((prev) => ({ ...prev, name: '' }));
                }
              }}
            />
            {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}

            <div>
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-input min-h-[100px] resize-y"
              />
            </div>

            <div>
              <label className="form-label">Status</label>
              <Select
                size="small"
                value={formData.is_active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
              >
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </Select>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={showDeleteModal && !!selectedDepartment}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedDepartment(null);
        }}
        title="Delete Department"
        subtitle="This action will remove the department and unassign it from teachers."
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="w-full"
              disabled={deleteLoading}
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedDepartment(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" className="w-full" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        {selectedDepartment && (
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <span className="font-semibold text-slate-800">{selectedDepartment.name}</span>?
          </p>
        )}
      </Modal>

      <Modal
        open={showTeachersModal && !!selectedDepartment}
        onClose={() => {
          setShowTeachersModal(false);
          setSelectedDepartment(null);
          setTeachers([]);
        }}
        title={`Teachers - ${selectedDepartment?.name || ''}`}
        subtitle={`View teachers assigned to this department`}
        maxWidth="max-w-2xl"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTeachersModal(false);
                setSelectedDepartment(null);
                setTeachers([]);
              }}
            >
              Close
            </Button>
          </div>
        }
      >
        {teachersLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : teachers.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id} hover>
                  <TableCell>
                    <Typography variant="body2">{teacher.employee_id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {teacher.full_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {teacher.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <span className={teacher.is_active ? 'status-badge success' : 'status-badge warning'}>
                      {teacher.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <div className="py-8 text-center text-slate-500">No teachers found in this department.</div>
      )}
      </Modal>
    </Layout>
  );
};

export default Departments;
