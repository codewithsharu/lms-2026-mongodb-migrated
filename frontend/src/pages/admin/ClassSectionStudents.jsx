import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiEdit2, FiTrash2, FiSearch, FiUsers } from 'react-icons/fi';
import {
  Box,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { classAPI } from '../../services/api';

const getZoneTextColor = (zone) => {
  if (zone === 'blue') return '#1D4ED8';
  if (zone === 'red') return '#B91C1C';
  if (zone === 'green') return '#15803D';
  return '#374151';
};

const ClassSectionStudents = () => {
  const { classId, sectionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('');
  const [students, setStudents] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [sectionInfo, setSectionInfo] = useState(null);

  const fetchClassAndSectionInfo = async () => {
    try {
      const [classResponse, sectionResponse] = await Promise.all([
        classAPI.getById(classId),
        classAPI.getSections(classId)
      ]);
      
      setClassInfo(classResponse.data);
      const section = sectionResponse.data.find(s => s.id === sectionId);
      setSectionInfo(section);
    } catch (error) {
      console.error('Failed to fetch class/section info:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = { section_id: sectionId };
      if (selectedZoneFilter) {
        params.zone = selectedZoneFilter;
      }
      
      const response = await classAPI.getStudents(classId, params);
      const studentsData = response.data || [];
      console.log('Fetched students:', studentsData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Fetch students error:', error);
      setError(error.response?.data?.error || 'Failed to fetch students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassAndSectionInfo();
  }, [classId, sectionId]);

  useEffect(() => {
    fetchStudents();
  }, [classId, sectionId, selectedZoneFilter]);

  const filteredStudents = useMemo(() => {
    try {
      if (!searchQuery || !students) return students || [];
      
      const query = String(searchQuery).toLowerCase().trim();
      if (!query) return students;
      
      return students.filter(student => {
        if (!student) return false;
        
        const user = student.user || {};
        const fullName = String(user.full_name || '').toLowerCase();
        const email = String(user.email || '').toLowerCase();
        const rollNumber = String(student.roll_number || '').toLowerCase();
        
        return fullName.includes(query) || email.includes(query) || rollNumber.includes(query);
      });
    } catch (error) {
      console.error('Search filtering error:', error);
      return students || [];
    }
  }, [students, searchQuery]);

  const handleZoneChange = async (studentId, newZone) => {
    try {
      await classAPI.updateStudentZone(studentId, { zone: newZone });
      
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.user_id === studentId 
            ? { ...student, zone: newZone }
            : student
        )
      );
      
      toast.success('Zone updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update zone');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure you want to remove this student from the class?')) {
      return;
    }

    try {
      await classAPI.deleteStudent(classId, studentId);
      setStudents(prevStudents => prevStudents.filter(student => student.user_id !== studentId));
      toast.success('Student removed successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove student');
    }
  };

  const zoneStats = useMemo(() => {
    const stats = { blue: 0, red: 0, green: 0, unassigned: 0 };
    students.forEach(student => {
      if (student.zone) {
        stats[student.zone]++;
      } else {
        stats.unassigned++;
      }
    });
    return stats;
  }, [students]);

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
              <h1>{classInfo?.name || 'Class'} - {sectionInfo?.name || 'Section'}</h1>
            </div>
            <p className="text-sm text-gray-600">
              Manage students and zone assignments for this section.
            </p>
          </div>
        </div>

        {error && (
          <Card className="mb-6">
            <Card.Body className="p-4">
              <div className="text-red-600 text-sm">{error}</div>
            </Card.Body>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Zone Statistics */}
          <Card>
            <Card.Header>
              <h3 className="text-sm font-medium text-gray-700">Zone Distribution</h3>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Blue</span>
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">{zoneStats.blue}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Red</span>
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">{zoneStats.red}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Green</span>
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">{zoneStats.green}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Unassigned</span>
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">{zoneStats.unassigned}</div>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Search and Filters */}
          <Card>
            <Card.Header>
              <h3 className="text-sm font-medium text-gray-700">Search & Filters</h3>
            </Card.Header>
            <Card.Body>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
                <TextField
                  label="Search"
                  size="small"
                  placeholder="Search by name, email, or roll number"
                  value={searchQuery || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (typeof value === 'string') {
                      setSearchQuery(value);
                    }
                  }}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FiSearch className="h-4 w-4" />
                      </InputAdornment>
                    )
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <TextField
                    select
                    label="Zone"
                    size="small"
                    value={selectedZoneFilter}
                    onChange={(e) => setSelectedZoneFilter(e.target.value)}
                  >
                    <MenuItem value="">All Zones</MenuItem>
                    <MenuItem value="blue">Blue</MenuItem>
                    <MenuItem value="red">Red</MenuItem>
                    <MenuItem value="green">Green</MenuItem>
                  </TextField>
                </FormControl>
              </Stack>
            </Card.Body>
          </Card>
        </div>

        {/* Students List */}
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                Students ({filteredStudents.length})
              </h3>
              <div className="text-xs text-gray-500">
                {selectedZoneFilter && `Zone: ${selectedZoneFilter}`}
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                <p className="ml-3 text-sm text-gray-500">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <FiUsers className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  {searchQuery || selectedZoneFilter ? 'No students match your filters.' : 'No students found in this section.'}
                </p>
              </div>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small" aria-label="students table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Roll</TableCell>
                      <TableCell>Zone</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStudents.map((student, index) => {
                      try {
                        const user = student.user || {};
                        const studentId = student.user_id || index;
                        const zoneLabel = student.zone || '';

                        return (
                          <TableRow key={studentId} hover>
                            <TableCell>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box
                                  sx={{
                                    height: 32,
                                    width: 32,
                                    borderRadius: '999px',
                                    backgroundColor: '#F1F5F9',
                                    color: '#334155',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 600,
                                    fontSize: 12
                                  }}
                                >
                                  {String(user.full_name || 'U').charAt(0).toUpperCase()}
                                </Box>
                                <Box>
                                  <Typography variant="body2" fontWeight={600} color="text.primary">
                                    {user.full_name || 'Unknown Name'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {student.roll_number || 'No roll number'}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>{user.email || 'No email'}</TableCell>
                            <TableCell>{student.roll_number || 'No roll number'}</TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={student.zone || ''}
                                  onChange={(e) => handleZoneChange(student.user_id, e.target.value)}
                                  aria-label="Update zone"
                                  sx={{
                                    height: 32,
                                    backgroundColor: '#FFFFFF',
                                    color: getZoneTextColor(student.zone)
                                  }}
                                  renderValue={(value) => {
                                    if (!value) return 'Unassigned';
                                    return value.charAt(0).toUpperCase() + value.slice(1);
                                  }}
                                >
                                  <MenuItem value="">Unassigned</MenuItem>
                                  <MenuItem value="blue">Blue</MenuItem>
                                  <MenuItem value="red">Red</MenuItem>
                                  <MenuItem value="green">Green</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="!h-8 !w-8 !p-0"
                                onClick={() => handleDeleteStudent(student.user_id)}
                              >
                                <FiTrash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      } catch (error) {
                        console.error('Error rendering student:', error, student);
                        return (
                          <TableRow key={index}>
                            <TableCell colSpan={5}>
                              <Box className="text-sm text-red-600">Error loading student data</Box>
                            </TableCell>
                          </TableRow>
                        );
                      }
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card.Body>
        </Card>
      </div>
    </Layout>
  );
};

export default ClassSectionStudents;
