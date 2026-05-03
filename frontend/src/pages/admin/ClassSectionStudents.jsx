import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiEdit2, FiTrash2, FiSearch, FiUsers } from 'react-icons/fi';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { classAPI } from '../../services/api';

const getZoneBadgeClass = (zone) => {
  if (zone === 'blue') return 'status-badge info';
  if (zone === 'red') return 'status-badge error';
  if (zone === 'green') return 'status-badge success';
  return 'status-badge warning';
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
              Manage students in this section with zone filtering and search capabilities
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
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-2"></div>
                  <div className="text-2xl font-bold text-blue-600">{zoneStats.blue}</div>
                  <div className="text-xs text-gray-600">Blue Zone</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-2"></div>
                  <div className="text-2xl font-bold text-red-600">{zoneStats.red}</div>
                  <div className="text-xs text-gray-600">Red Zone</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                  <div className="text-2xl font-bold text-green-600">{zoneStats.green}</div>
                  <div className="text-xs text-gray-600">Green Zone</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mx-auto mb-2"></div>
                  <div className="text-2xl font-bold text-gray-600">{zoneStats.unassigned}</div>
                  <div className="text-xs text-gray-600">Unassigned</div>
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
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (typeof value === 'string') {
                        setSearchQuery(value);
                      }
                    }}
                    placeholder="Search by name, email, or roll number..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">Zone Filter:</span>
                  <button
                    onClick={() => setSelectedZoneFilter('')}
                    className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                      selectedZoneFilter === '' 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    All Zones
                  </button>
                  {['blue', 'red', 'green'].map(zone => (
                    <button
                      key={zone}
                      onClick={() => setSelectedZoneFilter(zone)}
                      className={`px-3 py-1 text-sm rounded-lg border transition-colors flex items-center gap-1 ${
                        selectedZoneFilter === zone 
                          ? 'bg-blue-500 text-white border-blue-500' 
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        zone === 'blue' ? 'bg-blue-500' : 
                        zone === 'red' ? 'bg-red-500' : 
                        'bg-green-500'
                      }`} />
                      {zone.charAt(0).toUpperCase() + zone.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
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
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredStudents.map((student, index) => {
                  try {
                    const user = student.user || {};
                    const studentId = student.user_id || index;
                    
                    return (
                      <div key={studentId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                            {String(user.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{user.full_name || 'Unknown Name'}</p>
                            <p className="text-xs text-gray-500">{user.email || 'No email'}</p>
                            <p className="text-xs text-gray-500">Roll: {student.roll_number || 'No roll number'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`${getZoneBadgeClass(student.zone)} capitalize text-xs`}>
                            {student.zone || 'unassigned'}
                          </span>
                          
                          <select
                            value={student.zone || ''}
                            onChange={(e) => handleZoneChange(student.user_id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Unassigned</option>
                            <option value="blue">Blue</option>
                            <option value="red">Red</option>
                            <option value="green">Green</option>
                          </select>
                          
                          <Button
                            variant="secondary"
                            size="sm"
                            className="!h-8 !w-8 !p-0"
                            onClick={() => handleDeleteStudent(student.user_id)}
                          >
                            <FiTrash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  } catch (error) {
                    console.error('Error rendering student:', error, student);
                    return (
                      <div key={index} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                        <div className="text-sm text-red-600">Error loading student data</div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </Layout>
  );
};

export default ClassSectionStudents;
