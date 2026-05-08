import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  FiPlus,
  FiUpload,
  FiDownload,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiKey,
  FiUser,
  FiMail,
  FiPhone,
  FiUsers,
  FiBriefcase,
  FiLayers
} from 'react-icons/fi';
import {
  Box,
  Checkbox,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { userAPI, classAPI, departmentAPI } from '../../services/api';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import Modal from '../../components/ui/Modal';

const zones = [
  { value: 'blue', label: 'Blue' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' }
];

const UserManagement = ({ fixedRole = '' }) => {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(fixedRole);
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const isStudentManagement = fixedRole === 'student';
  const isTeacherManagement = fixedRole === 'teacher';
  const [studentTab, setStudentTab] = useState('assigned');
    const [deleteLoading, setDeleteLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'create');
  const [showUploadModal, setShowUploadModal] = useState(searchParams.get('action') === 'upload');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkTeacherStatusModal, setShowBulkTeacherStatusModal] = useState(false);
  const [showBulkTeacherDepartmentModal, setShowBulkTeacherDepartmentModal] = useState(false);
  const [showBulkTeacherDeleteModal, setShowBulkTeacherDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [createErrors, setCreateErrors] = useState({});
  const [resetPasswordValue, setResetPasswordValue] = useState('123456789');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState('active');
  const [bulkAssignForm, setBulkAssignForm] = useState({ class_id: '', section_id: '', zone: '' });
  const [bulkTeacherDepartment, setBulkTeacherDepartment] = useState('');

  const getEmptyEditFormData = () => ({
    role: '',
    full_name: '',
    email: '',
    phone: '',
    is_active: true,
    roll_number: '',
    class_id: '',
    section_id: '',
    zone: '',
    employee_id: '',
    department: '',
    new_password: ''
  });

  const [formData, setFormData] = useState({
    role: 'student',
    full_name: '',
    email: '',
    phone: '',
    roll_number: '',
    class_id: '',
    section_id: '',
    zone: '',
    employee_id: '',
    department: ''
  });

  const [editFormData, setEditFormData] = useState(getEmptyEditFormData());
  const [formLoading, setFormLoading] = useState(false);

  const fileInputRef = useRef(null);
  const [uploadResults, setUploadResults] = useState(null);

  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [editSections, setEditSections] = useState([]);
  const [bulkSections, setBulkSections] = useState([]);
  const [filterSections, setFilterSections] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  const hasAvailableClasses = classes.length > 0;
  const studentCreationBlocked = formData.role === 'student' && !classesLoading && !hasAvailableClasses;
  const activeRoleFilter = fixedRole || roleFilter;
  const activeStudentTab = isStudentManagement ? studentTab : '';
  const isUnassignedStudentsTab = isStudentManagement && studentTab === 'unassigned';
  const tableColumnCount = (isStudentManagement || isTeacherManagement) ? 6 : 5;

  const entityLabel = fixedRole === 'student' ? 'Student' : fixedRole === 'teacher' ? 'Teacher' : 'User';
  const entityPluralLabel = fixedRole === 'student' ? 'Students' : fixedRole === 'teacher' ? 'Teachers' : 'Users';
  const currentListLabel = isStudentManagement
    ? (isUnassignedStudentsTab ? 'unassigned students' : 'assigned students')
    : entityPluralLabel.toLowerCase();

  const pageTitle = `${entityLabel} Management`;
  const pageSubtitle =
    fixedRole === 'student'
      ? 'Manage student profiles, enrollment details, and account status.'
      : fixedRole === 'teacher'
        ? 'Manage teacher profiles, employee details, and account status.'
        : 'Manage all teacher and student user accounts.';

  useEffect(() => {
    fetchUsers();
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.page,
    searchQuery,
    activeRoleFilter,
    activeStudentTab,
    statusFilter,
    classFilter,
    sectionFilter,
    zoneFilter
  ]);

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showCreateModal || classesLoading || hasAvailableClasses || formData.role !== 'student') {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      role: 'teacher',
      class_id: '',
      section_id: '',
      department: ''
    }));
  }, [showCreateModal, classesLoading, hasAvailableClasses, formData.role]);

  useEffect(() => {
    if (formData.class_id) {
      fetchSections(formData.class_id);
    } else {
      setSections([]);
    }
  }, [formData.class_id]);

  useEffect(() => {
    if (!showEditModal || editFormData.role !== 'student') {
      setEditSections([]);
      return;
    }

    if (editFormData.class_id) {
      fetchEditSections(editFormData.class_id);
    } else {
      setEditSections([]);
    }
  }, [showEditModal, editFormData.class_id, editFormData.role]);

  useEffect(() => {
    if (!isStudentManagement) return;

    if (!classFilter) {
      setFilterSections([]);
      setSectionFilter('');
      setZoneFilter('');
      return;
    }

    const loadFilterSections = async () => {
      try {
        const response = await classAPI.getSections(classFilter);
        setFilterSections(response.data);
      } catch {
        setFilterSections([]);
      }
    };

    loadFilterSections();
  }, [isStudentManagement, classFilter]);

  useEffect(() => {
    if (!showBulkAssignModal || !bulkAssignForm.class_id) {
      setBulkSections([]);
      return;
    }

    const loadBulkSections = async () => {
      try {
        const response = await classAPI.getSections(bulkAssignForm.class_id);
        setBulkSections(response.data);
      } catch {
        setBulkSections([]);
      }
    };

    loadBulkSections();
  }, [showBulkAssignModal, bulkAssignForm.class_id]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 10,
        search: searchQuery,
        role: activeRoleFilter
      };

      if (isStudentManagement) {
        params.assignment_status = studentTab;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (classFilter) params.class_id = classFilter;
        if (classFilter && sectionFilter) params.section_id = sectionFilter;
        if (zoneFilter) params.zone = zoneFilter;
      }

      const response = await userAPI.getAll(params);
      const fetchedUsers = response.data?.users || [];

      setUsers(fetchedUsers);
      setPagination(response.data?.pagination || { page: 1, total: 0, totalPages: 0 });
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      setClassesLoading(true);
      const response = await classAPI.getAll({ is_active: true });
      setClasses(response.data);
    } catch {
      setClasses([]);
      console.error('Failed to fetch classes');
    } finally {
      setClassesLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      const response = await departmentAPI.getAll({ page: 1, limit: 200 });
      setDepartments(response.data?.departments || []);
    } catch {
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const fetchSections = async (classId) => {
    try {
      const response = await classAPI.getSections(classId);
      setSections(response.data);
    } catch {
      setSections([]);
    }
  };

  const fetchEditSections = async (classId) => {
    try {
      const response = await classAPI.getSections(classId);
      setEditSections(response.data);
    } catch {
      setEditSections([]);
    }
  };

  const handleStudentTabChange = (tab) => {
    if (!isStudentManagement || tab === studentTab) return;

    setStudentTab(tab);
    setSelectedUserIds([]);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };


  

  const validateCreateForm = () => {
    const errors = {};

    const requireField = (field, label) => {
      if (!String(formData[field] || '').trim()) {
        errors[field] = `${label} is required`;
      }
    };

    requireField('full_name', 'Full name');
    requireField('email', 'Email');
    requireField('phone', 'Phone');

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (formData.role === 'student') {
      requireField('roll_number', 'Roll number');
      requireField('class_id', 'Class');
      requireField('section_id', 'Section');
      requireField('zone', 'Zone');
    }

    if (formData.role === 'teacher') {
      requireField('employee_id', 'Employee ID');
    }

    return errors;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (formData.role === 'student' && classesLoading) {
      setCreateErrors({ class_id: 'Classes are still loading' });
      return;
    }

    if (formData.role === 'student' && !hasAvailableClasses) {
      setCreateErrors({ class_id: 'Create a class before adding students' });
      return;
    }

    const errors = validateCreateForm();
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setFormLoading(true);

    try {
      const response = await userAPI.create(formData);
      toast.success(`${entityLabel} created successfully!`);

      if (response.data.generatedPassword) {
        toast.success(`Password: ${response.data.generatedPassword}`, { duration: 10000 });
      }

      setShowCreateModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setDeleteLoading(true);
      const response = await userAPI.delete(selectedUser.id);
      toast.success(response.data?.message || `${entityLabel} deleted successfully`);
      setShowDeleteModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditModal = (user) => {
    const isStudent = user.role === 'student';
    const isTeacher = user.role === 'teacher';

    setSelectedUser(user);
    setEditFormData({
      role: user.role || '',
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      is_active: user.is_active ?? true,
      roll_number: isStudent ? user.details?.roll_number || '' : '',
      class_id: isStudent ? user.details?.classes?.id || '' : '',
      section_id: isStudent ? user.details?.sections?.id || '' : '',
      zone: isStudent ? user.details?.zone || '' : '',
      employee_id: isTeacher ? user.details?.employee_id || '' : '',
      department: isTeacher ? user.details?.department || '' : '',
      new_password: ''
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    setEditFormData(getEmptyEditFormData());
    setEditSections([]);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    if (!selectedUser) return;

    if (editFormData.new_password && editFormData.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setFormLoading(true);

    try {
      const payload = {
        full_name: editFormData.full_name,
        email: editFormData.email,
        phone: editFormData.phone || null,
        ...(editFormData.role !== 'student' ? { is_active: editFormData.is_active } : {})
      };

      if (editFormData.new_password) {
        payload.new_password = editFormData.new_password;
      }

      if (editFormData.role === 'student') {
        payload.roll_number = editFormData.roll_number;

        if (editFormData.class_id) {
          payload.class_id = editFormData.class_id;
          payload.section_id = editFormData.section_id || null;
        }

        payload.zone = editFormData.zone || null;
      }

      if (editFormData.role === 'teacher') {
        payload.employee_id = editFormData.employee_id;
        payload.department = editFormData.department || null;
      }

      await userAPI.update(selectedUser.id, payload);
      toast.success(`${entityLabel} updated successfully`);
      closeEditModal();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update user');
    } finally {
      setFormLoading(false);
    }
  };

  const openResetPasswordModal = (user) => {
    setSelectedUser(user);
    setResetPasswordValue('123456789');
    setShowResetPasswordModal(true);
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setResetPasswordValue('123456789');
    setSelectedUser(null);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (!resetPasswordValue || resetPasswordValue.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setResetPasswordLoading(true);
      await userAPI.resetPassword(selectedUser.id, resetPasswordValue);
      toast.success('Password updated successfully');
      closeResetPasswordModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update password');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFormLoading(true);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (!data.length) {
        toast.error('Excel file is empty');
        return;
      }

      const batchSize = 20;
      const batches = [];
      for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
      }

      let totalSuccessful = 0;
      let totalFailed = 0;
      const allResults = { success: [], failed: [] };

      setUploadProgress({ total: batches.length, current: 0 });

      for (let i = 0; i < batches.length; i++) {
        const batchData = batches[i];
        const newSheet = XLSX.utils.json_to_sheet(batchData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newSheet, sheetName);

        const excelBuffer = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const batchFile = new File([blob], `batch_${i}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const response = await userAPI.bulkUpload(batchFile);

        totalSuccessful += response.data.summary.successful || 0;
        totalFailed += response.data.summary.failed || 0;
        allResults.success.push(...(response.data.results?.success || []));
        allResults.failed.push(...(response.data.results?.failed || []));

        setUploadProgress({ total: batches.length, current: i + 1 });
      }

      setUploadResults({
        summary: { total: data.length, successful: totalSuccessful, failed: totalFailed },
        results: allResults
      });

      toast.success(`Uploaded ${totalSuccessful} users in ${batches.length} batches`);
      fetchUsers();
    } catch (error) {
      console.error('Bulk upload failed', error);
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setFormLoading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = async (type) => {
    try {
      const response = await userAPI.downloadTemplate(type);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        type === 'teacher' ? 'teacher_upload_template.xlsx' : 'student_upload_template.xlsx'
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${type === 'teacher' ? 'Teacher' : 'Student'} template downloaded`);
    } catch {
      toast.error(`Failed to download ${type} template`);
    }
  };

  const resetForm = () => {
    setFormData({
      role: fixedRole || (!classesLoading && !hasAvailableClasses ? 'teacher' : 'student'),
      full_name: '',
      email: '',
      phone: '',
      roll_number: '',
      class_id: '',
      section_id: '',
      zone: '',
      employee_id: '',
      department: ''
    });
    setSections([]);
    setCreateErrors({});
  };

  const getZoneClasses = (zone) => {
    if (zone === 'blue') return 'status-badge info';
    if (zone === 'red') return 'status-badge error';
    if (zone === 'green') return 'status-badge success';
    return 'status-badge warning';
  };

  const selectableUserIds = (isStudentManagement || isTeacherManagement) ? users.map((user) => user.id) : [];
  const isAllSelected = selectableUserIds.length > 0 && selectableUserIds.every((id) => selectedUserIds.includes(id));
  const isSomeSelected = selectableUserIds.some((id) => selectedUserIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !selectableUserIds.includes(id)));
      return;
    }
    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...selectableUserIds])));
  };

  const toggleSelectUser = (id) => {
    setSelectedUserIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const handleBulkStatusUpdate = async () => {
    if (!selectedUserIds.length) return;

    try {
      setBulkActionLoading(true);
      const isActive = bulkStatusValue === 'active';
      const response = await userAPI.bulkUpdateStatus(selectedUserIds, isActive);
      toast.success(response.data?.message || 'Student status updated');
      setShowBulkStatusModal(false);
      setSelectedUserIds([]);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedUserIds.length) return;

    if (!bulkAssignForm.class_id) {
      toast.error('Class is required');
      return;
    }

    if (!bulkAssignForm.section_id) {
      toast.error('Section is required');
      return;
    }

    try {
      setBulkActionLoading(true);
      const response = await userAPI.bulkAssignStudents(selectedUserIds, {
        class_id: bulkAssignForm.class_id,
        section_id: bulkAssignForm.section_id || null,
        zone: bulkAssignForm.zone || null
      });
      toast.success(response.data?.message || 'Students assigned');
      setShowBulkAssignModal(false);
      setBulkAssignForm({ class_id: '', section_id: '', zone: '' });
      setSelectedUserIds([]);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign students');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedUserIds.length) return;

    try {
      setBulkActionLoading(true);
      const response = await userAPI.bulkDelete(selectedUserIds);
      const data = response.data || {};
      const message = data.message || 'Bulk delete processed';
      const summary = data.deactivated || data.deleted
        ? ` Deactivated: ${data.deactivated || 0}, Deleted: ${data.deleted || 0}.`
        : '';
      toast.success(`${message}${summary}`.trim());
      setShowBulkDeleteModal(false);
      setSelectedUserIds([]);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete students');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkTeacherStatusUpdate = async () => {
    if (!selectedUserIds.length) return;

    try {
      setBulkActionLoading(true);
      const isActive = bulkStatusValue === 'active';
      const response = await userAPI.bulkUpdateTeachers({ ids: selectedUserIds, is_active: isActive });
      toast.success(response.data?.message || 'Teachers updated successfully');
      setShowBulkTeacherStatusModal(false);
      setSelectedUserIds([]);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update teachers');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkTeacherDepartmentUpdate = async () => {
    if (!selectedUserIds.length) return;

    try {
      setBulkActionLoading(true);
      const response = await userAPI.bulkUpdateTeachers({
        ids: selectedUserIds,
        department: bulkTeacherDepartment
      });
      toast.success(response.data?.message || 'Teachers updated successfully');
      setShowBulkTeacherDepartmentModal(false);
      setBulkTeacherDepartment('');
      setSelectedUserIds([]);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update department');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkTeacherDelete = async () => {
    if (!selectedUserIds.length) return;

    try {
      setBulkActionLoading(true);
      const response = await userAPI.bulkDeleteTeachers(selectedUserIds);
      toast.success(response.data?.message || 'Teachers deleted successfully');
      setShowBulkTeacherDeleteModal(false);
      setSelectedUserIds([]);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete teachers');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const renderRoleDetails = (user) => {
    if (user.role === 'student') {
      const className = user.details?.classes?.name;

      return (
        <div className="space-y-1.5">
          {user.details?.roll_number && <p className="text-sm text-slate-600">Roll: {user.details.roll_number}</p>}
          {className ? <p className="text-sm text-slate-600">Class: {className}</p> : <p className="text-sm text-amber-600">Unassigned</p>}
          {user.details?.sections?.name && (
            <p className="text-sm text-slate-600">Section: {user.details.sections.name}</p>
          )}
          {user.details?.zone && (
            <span className={`${getZoneClasses(user.details.zone)} capitalize`}>{user.details.zone}</span>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {user.details?.employee_id && <p className="text-sm text-slate-600">ID: {user.details.employee_id}</p>}
        {user.details?.department && <p className="text-sm text-slate-600">Dept: {user.details.department}</p>}
      </div>
    );
  };

  return (
    <Layout>
      <div className="app-page">
        <div className="page-header flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1>{pageTitle}</h1>
            <p>{pageSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setShowUploadModal(true)}>
              <FiUpload className="h-4 w-4" />
              Bulk Upload
            </Button>
            <Button
              onClick={() => {
                if (fixedRole) {
                  setFormData((prev) => ({ ...prev, role: fixedRole }));
                }
                setShowCreateModal(true);
              }}
            >
              <FiPlus className="h-4 w-4" />
              Add {entityLabel}
            </Button>
          </div>
        </div>

        <Card>
          <Card.Body>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: fixedRole ? '1fr' : '1fr 240px' }} gap={2}>
              <TextField
                label="Search"
                size="small"
                placeholder={`Search ${entityPluralLabel.toLowerCase()} by name or email`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedUserIds([]);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FiSearch className="h-4 w-4" />
                    </InputAdornment>
                  )
                }}
              />
              {!fixedRole && (
                <FormControl size="small">
                  <Select
                    displayEmpty
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setSelectedUserIds([]);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  >
                    <MenuItem value="">All Roles</MenuItem>
                    <MenuItem value="student">Students</MenuItem>
                    <MenuItem value="teacher">Teachers</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
            {isStudentManagement && (
              <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <span className="inline-flex h-8 items-center rounded-full bg-slate-100 px-3">Filters</span>
                      <span className="text-xs text-slate-500">Students</span>
                    </div>
                    <Button
                      variant="secondary"
                      className="!h-8 !px-3"
                      onClick={() => {
                        setStatusFilter('all');
                        setClassFilter('');
                        setSectionFilter('');
                        setZoneFilter('');
                        setSelectedUserIds([]);
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="min-w-[160px] flex-1">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                      <FormControl size="small" fullWidth>
                        <Select
                          displayEmpty
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setSelectedUserIds([]);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                          }}
                        >
                          <MenuItem value="all">All Status</MenuItem>
                          <MenuItem value="active">Active</MenuItem>
                          <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Class</p>
                      <FormControl size="small" fullWidth>
                        <Select
                          displayEmpty
                          value={classFilter}
                          onChange={(e) => {
                            setClassFilter(e.target.value);
                            setSectionFilter('');
                            setZoneFilter('');
                            setSelectedUserIds([]);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                          }}
                          disabled={classesLoading || !hasAvailableClasses}
                        >
                          <MenuItem value="">All Classes</MenuItem>
                          {classes.map((cls) => (
                            <MenuItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Section</p>
                      <FormControl size="small" fullWidth>
                        <Select
                          displayEmpty
                          value={sectionFilter}
                          onChange={(e) => {
                            setSectionFilter(e.target.value);
                            setZoneFilter('');
                            setSelectedUserIds([]);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                          }}
                          disabled={!classFilter}
                        >
                          <MenuItem value="">All Sections</MenuItem>
                          {filterSections.map((section) => (
                            <MenuItem key={section.id} value={section.id}>
                              {section.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    <div className="min-w-[140px] flex-1">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Zone</p>
                      <FormControl size="small" fullWidth>
                        <Select
                          displayEmpty
                          value={zoneFilter}
                          onChange={(e) => {
                            setZoneFilter(e.target.value);
                            setSelectedUserIds([]);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                          }}
                          disabled={!sectionFilter}
                        >
                          <MenuItem value="">All Zones</MenuItem>
                          {zones.map((zone) => (
                            <MenuItem key={zone.value} value={zone.value}>
                              {zone.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                  </div>
                </div>
              </Paper>
            )}
          </Card.Body>
        </Card>

        <Card>
          <Card.Body className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">{entityPluralLabel} Directory</h2>
              <p className="body-sm">{pagination.total} total records</p>
            </div>

            {isStudentManagement && (
              <Paper variant="outlined" sx={{ px: 2, py: 1.5 }}>
                <Tabs
                  value={studentTab}
                  onChange={(_, value) => handleStudentTabChange(value)}
                  textColor="primary"
                  indicatorColor="primary"
                >
                  <Tab value="assigned" label="Assigned Students" />
                  <Tab value="unassigned" label="Unassigned Students" />
                </Tabs>
              </Paper>
            )}

            {isStudentManagement && selectedUserIds.length > 0 && (
              <Paper variant="outlined" sx={{ px: 2, py: 1.5 }}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-slate-600">{selectedUserIds.length} selected</span>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setBulkStatusValue('active');
                      setShowBulkStatusModal(true);
                    }}
                  >
                    Update Status
                  </Button>
                  {isUnassignedStudentsTab && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setBulkAssignForm({ class_id: '', section_id: '', zone: '' });
                        setShowBulkAssignModal(true);
                      }}
                    >
                      Assign Class/Section/Zone
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    className="!border-red-200 !text-red-600 hover:!bg-red-50"
                    onClick={() => setShowBulkDeleteModal(true)}
                  >
                    Delete Selected
                  </Button>
                </div>
              </Paper>
            )}

            {isTeacherManagement && selectedUserIds.length > 0 && (
              <Paper variant="outlined" sx={{ px: 2, py: 1.5 }}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-slate-600">{selectedUserIds.length} selected</span>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setBulkStatusValue('active');
                      setShowBulkTeacherStatusModal(true);
                    }}
                  >
                    Update Status
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setBulkTeacherDepartment('');
                      setShowBulkTeacherDepartmentModal(true);
                    }}
                  >
                    Update Department
                  </Button>
                  <Button
                    variant="secondary"
                    className="!border-red-200 !text-red-600 hover:!bg-red-50"
                    onClick={() => setShowBulkTeacherDeleteModal(true)}
                  >
                    Delete Selected
                  </Button>
                </div>
              </Paper>
            )}

            <TableContainer component={Paper} variant="outlined">
              <Table size="small" aria-label="users table">
                <TableHead>
                  <TableRow>
                    {(isStudentManagement || isTeacherManagement) && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isAllSelected}
                          indeterminate={!isAllSelected && isSomeSelected}
                          onChange={toggleSelectAll}
                        />
                      </TableCell>
                    )}
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Details</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {(isStudentManagement || isTeacherManagement) && (
                          <TableCell padding="checkbox">
                            <div className="h-5 w-5 animate-pulse rounded bg-slate-100" />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
                        </TableCell>
                        <TableCell>
                          <div className="h-5 w-20 animate-pulse rounded bg-slate-100" />
                        </TableCell>
                        <TableCell>
                          <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
                        </TableCell>
                        <TableCell>
                          <div className="h-5 w-20 animate-pulse rounded bg-slate-100" />
                        </TableCell>
                        <TableCell align="right">
                          <div className="ml-auto h-5 w-24 animate-pulse rounded bg-slate-100" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id} hover>
                        {(isStudentManagement || isTeacherManagement) && (
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedUserIds.includes(user.id)}
                              onChange={() => toggleSelectUser(user.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Box
                              sx={{
                                height: 40,
                                width: 40,
                                borderRadius: '999px',
                                backgroundColor: '#DBEAFE',
                                color: '#1D4ED8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600,
                                fontSize: 14
                              }}
                            >
                              {user.full_name?.charAt(0)?.toUpperCase()}
                            </Box>
                            <Box>
                              <Typography variant="body2" fontWeight={600} color="text.primary">
                                {user.full_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {user.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <span className={`${user.role === 'student' ? 'status-badge info' : 'status-badge success'} capitalize`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>{renderRoleDetails(user)}</TableCell>
                        <TableCell>
                          <span className={user.is_active ? 'status-badge success' : 'status-badge error'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" justifyContent="flex-end" gap={4}>
                            <Button variant="secondary" className="!h-9 !w-9 !p-0" onClick={() => openEditModal(user)}>
                              <FiEdit2 className="h-[15px] w-[15px]" />
                            </Button>
                            <Button variant="secondary" className="!h-9 !w-9 !p-0" onClick={() => openResetPasswordModal(user)}>
                              <FiKey className="h-[15px] w-[15px]" />
                            </Button>
                            <Button
                              variant="secondary"
                              className="!h-9 !w-9 !p-0 !border-red-200 !text-red-600 hover:!bg-red-50"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteModal(true);
                              }}
                            >
                              <FiTrash2 className="h-[15px] w-[15px]" />
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={tableColumnCount} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        {isStudentManagement
                          ? (isUnassignedStudentsTab ? 'No unassigned students found.' : 'No assigned students found.')
                          : `No ${entityPluralLabel.toLowerCase()} found.`}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {pagination.totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="body-sm">
                  Showing {users.length} of {pagination.total} {currentListLabel}
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
          resetForm();
        }}
        title={`Create ${entityLabel}`}
        subtitle="Add account details and role-specific information."
        maxWidth="max-w-2xl"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="create-user-form" disabled={formLoading || studentCreationBlocked} className="w-full">
              {formLoading ? 'Creating...' : `Create ${entityLabel}`}
            </Button>
          </div>
        }
      >
        <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-4">
          {fixedRole ? (
            <div className="surface-card-muted p-4">
              <p className="text-sm text-slate-700">
                User Type: <span className="font-medium capitalize">{fixedRole}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="form-label !mb-0">User Type</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'student' })}
                  disabled={!classesLoading && !hasAvailableClasses}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    formData.role === 'student' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
                  } ${!classesLoading && !hasAvailableClasses ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <div className="mb-2 inline-flex rounded-lg bg-blue-100 p-2 text-blue-700">
                    <FiUsers className="h-4 w-4" />
                  </div>
                  <p className="font-medium">Student</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'teacher' })}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    formData.role === 'teacher' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="mb-2 inline-flex rounded-lg bg-blue-100 p-2 text-blue-700">
                    <FiBriefcase className="h-4 w-4" />
                  </div>
                  <p className="font-medium">Teacher</p>
                </button>
              </div>
              {!classesLoading && !hasAvailableClasses && (
                <p className="text-sm text-amber-600">Create at least one class before adding students.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              className="md:col-span-2"
              label="Full Name *"
              leftIcon={FiUser}
              required
              value={formData.full_name}
              onChange={(e) => {
                setFormData({ ...formData, full_name: e.target.value });
                if (createErrors.full_name) {
                  setCreateErrors((prev) => ({ ...prev, full_name: '' }));
                }
              }}
              placeholder="John Doe"
            />
            {createErrors.full_name && <p className="mt-1 text-xs text-red-600">{createErrors.full_name}</p>}
            <InputField
              label="Email *"
              type="email"
              leftIcon={FiMail}
              required
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (createErrors.email) {
                  setCreateErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
              placeholder="john@example.com"
            />
            {createErrors.email && <p className="mt-1 text-xs text-red-600">{createErrors.email}</p>}
            <InputField
              label="Phone"
              leftIcon={FiPhone}
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (createErrors.phone) {
                  setCreateErrors((prev) => ({ ...prev, phone: '' }));
                }
              }}
              placeholder="1234567890"
            />
            {createErrors.phone && <p className="mt-1 text-xs text-red-600">{createErrors.phone}</p>}
          </div>

          {formData.role === 'student' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputField
                label="Roll Number *"
                required
                value={formData.roll_number}
                onChange={(e) => {
                  setFormData({ ...formData, roll_number: e.target.value });
                  if (createErrors.roll_number) {
                    setCreateErrors((prev) => ({ ...prev, roll_number: '' }));
                  }
                }}
                placeholder="STU001"
              />
              {createErrors.roll_number && <p className="mt-1 text-xs text-red-600">{createErrors.roll_number}</p>}
              <SelectField
                label="Class *"
                required
                value={formData.class_id}
                onChange={(e) => {
                  setFormData({ ...formData, class_id: e.target.value, section_id: '' });
                  if (createErrors.class_id) {
                    setCreateErrors((prev) => ({ ...prev, class_id: '' }));
                  }
                }}
                disabled={classesLoading || !hasAvailableClasses}
              >
                <option value="">{classesLoading ? 'Loading classes...' : 'Select Class'}</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </SelectField>
              {createErrors.class_id && <p className="mt-1 text-xs text-red-600">{createErrors.class_id}</p>}
              <SelectField
                label="Section"
                value={formData.section_id}
                onChange={(e) => {
                  setFormData({ ...formData, section_id: e.target.value });
                  if (createErrors.section_id) {
                    setCreateErrors((prev) => ({ ...prev, section_id: '' }));
                  }
                }}
                disabled={!formData.class_id}
              >
                <option value="">Select Section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </SelectField>
              {createErrors.section_id && <p className="mt-1 text-xs text-red-600">{createErrors.section_id}</p>}
              <SelectField
                label="Zone"
                value={formData.zone}
                onChange={(e) => {
                  setFormData({ ...formData, zone: e.target.value });
                  if (createErrors.zone) {
                    setCreateErrors((prev) => ({ ...prev, zone: '' }));
                  }
                }}
              >
                <option value="">Select Zone</option>
                {zones.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </SelectField>
              {createErrors.zone && <p className="mt-1 text-xs text-red-600">{createErrors.zone}</p>}
            </div>
          )}

          {formData.role === 'teacher' && (
            <>
              <InputField
                label="Employee ID *"
                required
                value={formData.employee_id}
                onChange={(e) => {
                  setFormData({ ...formData, employee_id: e.target.value });
                  if (createErrors.employee_id) {
                    setCreateErrors((prev) => ({ ...prev, employee_id: '' }));
                  }
                }}
                placeholder="EMP001"
              />
              {createErrors.employee_id && <p className="mt-1 text-xs text-red-600">{createErrors.employee_id}</p>}
              <SelectField
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                disabled={departmentsLoading}
              >
                <option value="">Select Department (optional)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </SelectField>
            </>
          )}
        </form>
      </Modal>

      <Modal
        open={showEditModal && !!selectedUser}
        onClose={closeEditModal}
        title={`Edit ${entityLabel} Profile`}
        subtitle="Update account details and role information."
        maxWidth="max-w-2xl"
        footer={
          <div className="flex flex-col justify-end gap-3 sm:flex-row">
            <Button variant="secondary" className="w-full sm:w-40" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button type="submit" form="edit-user-form" disabled={formLoading} className="w-full sm:w-44">
              {formLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <form id="edit-user-form" onSubmit={handleUpdateUser} className="space-y-5">
            <div className="surface-card-muted p-4">
              <p className="text-sm text-slate-700">
                User Type: <span className="font-medium capitalize">{editFormData.role}</span>
              </p>
            </div>

            <div className="surface-card-muted p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Basic Details</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputField
                  className="md:col-span-2"
                  label="Full Name *"
                  leftIcon={FiUser}
                  required
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  placeholder="John Doe"
                />
                <InputField
                  label="Email *"
                  type="email"
                  leftIcon={FiMail}
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="john@example.com"
                />
                <InputField
                  label="Phone"
                  leftIcon={FiPhone}
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="1234567890"
                />
                {editFormData.role !== 'student' ? (
                  <SelectField
                    label="Status"
                    value={editFormData.is_active ? 'true' : 'false'}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.value === 'true' })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </SelectField>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Student status can only be updated via bulk selection.
                  </div>
                )}
                <div>
                  <InputField
                    label="New Password"
                    value={editFormData.new_password}
                    onChange={(e) => setEditFormData({ ...editFormData, new_password: e.target.value })}
                    placeholder="Leave empty to keep current"
                  />
                  <p className="mt-1 text-xs text-slate-500">Minimum 6 characters if changing password.</p>
                </div>
              </div>
            </div>

            {editFormData.role === 'student' && (
              <div className="surface-card-muted p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Academic Details</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InputField
                    label="Roll Number *"
                    required
                    value={editFormData.roll_number}
                    onChange={(e) => setEditFormData({ ...editFormData, roll_number: e.target.value })}
                    placeholder="STU001"
                  />
                  <SelectField
                    label="Class"
                    value={editFormData.class_id}
                    onChange={(e) => setEditFormData({ ...editFormData, class_id: e.target.value, section_id: '' })}
                    disabled={classesLoading || !hasAvailableClasses}
                  >
                    <option value="">{classesLoading ? 'Loading classes...' : 'Select Class'}</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Section"
                    value={editFormData.section_id}
                    onChange={(e) => setEditFormData({ ...editFormData, section_id: e.target.value })}
                    disabled={!editFormData.class_id}
                  >
                    <option value="">Select Section</option>
                    {editSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Zone"
                    value={editFormData.zone}
                    onChange={(e) => setEditFormData({ ...editFormData, zone: e.target.value })}
                  >
                    <option value="">Select Zone</option>
                    {zones.map((zone) => (
                      <option key={zone.value} value={zone.value}>
                        {zone.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
            )}

            {editFormData.role === 'teacher' && (
              <div className="surface-card-muted p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Employment Details</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InputField
                    label="Employee ID *"
                    required
                    value={editFormData.employee_id}
                    onChange={(e) => setEditFormData({ ...editFormData, employee_id: e.target.value })}
                    placeholder="EMP001"
                  />
                  <SelectField
                    label="Department"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    disabled={departmentsLoading}
                  >
                    <option value="">Select Department (optional)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
            )}
          </form>
        )}
      </Modal>

      <Modal
        open={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadResults(null);
        }}
        title={`Bulk Upload ${entityPluralLabel}`}
        subtitle="Import records in one go using your Excel file."
        maxWidth="max-w-2xl"
        footer={
          uploadResults ? (
            <Button
              className="w-full"
              onClick={() => {
                setShowUploadModal(false);
                setUploadResults(null);
              }}
            >
              Done
            </Button>
          ) : null
        }
      >
        {!uploadResults ? (
          <div className="space-y-4">
            {!classesLoading && !hasAvailableClasses && (
              <div className="alert" style={{ background: '#FFFBEB', borderColor: '#FCD34D', color: '#92400E' }}>
                Student uploads need an existing class. Create a class first, or upload teacher records only.
              </div>
            )}

            <div className="surface-card-muted flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full bg-blue-100 p-3 text-blue-700">
                <FiLayers className="h-6 w-6" />
              </div>
              <p className="text-sm text-slate-700">Upload an Excel file (.xlsx or .xls)</p>
              <p className="text-sm text-slate-500">Password will be the email prefix before @ for each user.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleBulkUpload}
                className="hidden"
              />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={formLoading}>
                <FiUpload className="h-4 w-4" />
                {formLoading ? 'Uploading...' : 'Upload File'}
              </Button>
            </div>

            {uploadProgress && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Uploading batch {uploadProgress.current} of {uploadProgress.total}</span>
                  <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-4">
              <Button variant="secondary" onClick={() => handleDownloadTemplate('student')}>
                <FiDownload className="h-4 w-4" />
                Student Template
              </Button>
              <Button variant="secondary" onClick={() => handleDownloadTemplate('teacher')}>
                <FiDownload className="h-4 w-4" />
                Teacher Template
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="surface-card-muted p-4 text-center">
                <p className="text-2xl font-semibold text-green-600">{uploadResults.summary.successful}</p>
                <p className="text-sm text-slate-500">Successful</p>
              </div>
              <div className="surface-card-muted p-4 text-center">
                <p className="text-2xl font-semibold text-red-600">{uploadResults.summary.failed}</p>
                <p className="text-sm text-slate-500">Failed</p>
              </div>
            </div>

            {uploadResults.results.failed.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Row Errors</p>
                <div className="hide-scrollbar max-h-52 space-y-2 overflow-y-auto">
                  {uploadResults.results.failed.map((item, i) => (
                    <div key={i} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {item.row?.email || 'Unknown'}: {item.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={showBulkStatusModal}
        onClose={() => setShowBulkStatusModal(false)}
        title="Update Student Status"
        subtitle="Apply active or inactive status to selected students."
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="w-full" onClick={() => setShowBulkStatusModal(false)}>
              Cancel
            </Button>
            <Button className="w-full" onClick={handleBulkStatusUpdate} disabled={bulkActionLoading}>
              {bulkActionLoading ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <SelectField
            label="Status"
            value={bulkStatusValue}
            onChange={(e) => setBulkStatusValue(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
          <p className="text-xs text-slate-500">Only selected students will be updated.</p>
        </div>
      </Modal>

      <Modal
        open={showBulkAssignModal}
        onClose={() => setShowBulkAssignModal(false)}
        title="Assign Students"
        subtitle="Assign class, section, and zone for selected unassigned students."
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="w-full" onClick={() => setShowBulkAssignModal(false)}>
              Cancel
            </Button>
            <Button className="w-full" onClick={handleBulkAssign} disabled={bulkActionLoading}>
              {bulkActionLoading ? 'Assigning...' : 'Assign Students'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <SelectField
            label="Class *"
            required
            value={bulkAssignForm.class_id}
            onChange={(e) => setBulkAssignForm((prev) => ({ ...prev, class_id: e.target.value, section_id: '' }))}
            disabled={classesLoading || !hasAvailableClasses}
          >
            <option value="">{classesLoading ? 'Loading classes...' : 'Select Class'}</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Section"
            value={bulkAssignForm.section_id}
            onChange={(e) => setBulkAssignForm((prev) => ({ ...prev, section_id: e.target.value }))}
            disabled={!bulkAssignForm.class_id}
          >
            <option value="">Select Section</option>
            {bulkSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Zone"
            value={bulkAssignForm.zone}
            onChange={(e) => setBulkAssignForm((prev) => ({ ...prev, zone: e.target.value }))}
          >
            <option value="">Select Zone</option>
            {zones.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </SelectField>
          <p className="text-xs text-slate-500">Only unassigned students can be assigned in bulk.</p>
        </div>
      </Modal>

      <Modal
        open={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Delete Selected Students"
        subtitle="Active students will be deactivated first. Delete again to remove them."
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="w-full" onClick={() => setShowBulkDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="w-full" onClick={handleBulkDelete} disabled={bulkActionLoading}>
              {bulkActionLoading ? 'Processing...' : 'Delete Selected'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          This action applies to {selectedUserIds.length} selected students.
        </p>
      </Modal>

      <Modal
        open={showBulkTeacherStatusModal}
        onClose={() => setShowBulkTeacherStatusModal(false)}
        title="Update Teacher Status"
        subtitle="Apply active or inactive status to selected teachers."
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="w-full" onClick={() => setShowBulkTeacherStatusModal(false)}>
              Cancel
            </Button>
            <Button className="w-full" onClick={handleBulkTeacherStatusUpdate} disabled={bulkActionLoading}>
              {bulkActionLoading ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <SelectField
            label="Status"
            value={bulkStatusValue}
            onChange={(e) => setBulkStatusValue(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
          <p className="text-xs text-slate-500">Only selected teachers will be updated.</p>
        </div>
      </Modal>

      <Modal
        open={showBulkTeacherDepartmentModal}
        onClose={() => setShowBulkTeacherDepartmentModal(false)}
        title="Update Teacher Department"
        subtitle="Assign or clear department for selected teachers."
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="w-full" onClick={() => setShowBulkTeacherDepartmentModal(false)}>
              Cancel
            </Button>
            <Button className="w-full" onClick={handleBulkTeacherDepartmentUpdate} disabled={bulkActionLoading}>
              {bulkActionLoading ? 'Updating...' : 'Update Department'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <SelectField
            label="Department"
            value={bulkTeacherDepartment}
            onChange={(e) => setBulkTeacherDepartment(e.target.value)}
            disabled={departmentsLoading}
          >
            <option value="">Clear Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </SelectField>
          <p className="text-xs text-slate-500">Choose a department or clear it.</p>
        </div>
      </Modal>

      <Modal
        open={showBulkTeacherDeleteModal}
        onClose={() => setShowBulkTeacherDeleteModal(false)}
        title="Delete Selected Teachers"
        subtitle="This action is permanent and cannot be undone."
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="w-full" onClick={() => setShowBulkTeacherDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="w-full" onClick={handleBulkTeacherDelete} disabled={bulkActionLoading}>
              {bulkActionLoading ? 'Deleting...' : 'Delete Selected'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          This action applies to {selectedUserIds.length} selected teachers.
        </p>
      </Modal>

      
      <Modal
        open={showResetPasswordModal && !!selectedUser}
        onClose={closeResetPasswordModal}
        title={`Reset Password - ${entityLabel}`}
        subtitle="Set a new password before confirming the reset."
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="w-full" onClick={closeResetPasswordModal}>
              Cancel
            </Button>
            <Button className="w-full" onClick={handleResetPassword} disabled={resetPasswordLoading}>
              {resetPasswordLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              You are changing password for <span className="font-semibold text-slate-800">{selectedUser.full_name}</span>.
            </p>
            <InputField
              label="New Password"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              placeholder="Enter new password"
            />
            <p className="text-xs text-slate-500">Default value is <span className="font-medium">123456789</span>. You can edit it before saving.</p>
          </div>
        )}
      </Modal>

      <Modal
        open={showDeleteModal && !!selectedUser}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title={`Delete ${entityLabel}`}
        subtitle="This action is permanent and cannot be undone."
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="w-full"
              disabled={deleteLoading}
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" className="w-full" onClick={handleDeleteUser} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <span className="font-semibold text-slate-800">{selectedUser.full_name}</span>?
          </p>
        )}
      </Modal>
    </Layout>
  );
};

export default UserManagement;
