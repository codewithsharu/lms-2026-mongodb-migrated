import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSearch, FiUsers, FiAlertCircle } from 'react-icons/fi';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  TextField,
  Box,
  Typography
} from '@mui/material';
import Layout from '../../components/Layout';
import { classAPI } from '../../services/api';

/* ─── helpers ───────────────────────────────────────────────────────────────── */

const ZONE_CONFIG = {
  blue:  { dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'Blue'  },
  red:   { dot: '#EF4444', bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', label: 'Red'   },
  green: { dot: '#22C55E', bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Green' },
};

const ZoneBadge = ({ zone }) => {
  const cfg = ZONE_CONFIG[String(zone || '').toLowerCase()];
  if (!cfg) return (
    <span style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
      {zone || 'N/A'}
    </span>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

const Avatar = ({ name }) => {
  const COLORS = [
    ['#EFF6FF', '#2563EB'], ['#FFF7ED', '#EA580C'], ['#F0FDF4', '#16A34A'],
    ['#FDF4FF', '#9333EA'], ['#FFFBEB', '#D97706'], ['#F0F9FF', '#0284C7'],
  ];
  if (!name) return null;
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const idx = name.charCodeAt(0) % COLORS.length;
  const [bg, fg] = COLORS[idx];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 34, height: 34, borderRadius: 10, background: bg, color: fg,
      fontWeight: 700, fontSize: 13, flexShrink: 0, border: `1px solid ${fg}33`,
    }}>
      {initials}
    </span>
  );
};

/* ─── component ─────────────────────────────────────────────────────────────── */

const TeacherClassStudents = () => {
  const { classId, sectionId } = useParams();
  const location = useLocation();

  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState('');
  const [searchQuery,        setSearchQuery]        = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('all');
  const [students,           setStudents]           = useState([]);

  const className   = location.state?.className   || 'Class Students';
  const sectionName = location.state?.sectionName || (sectionId === 'all' ? 'All Sections' : 'Section');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await classAPI.getStudents(classId);
      let data = res.data || [];
      // filter by section if not "all"
      if (sectionId && sectionId !== 'all') {
        data = data.filter(s => s.section?.id === sectionId || String(s.section_id) === sectionId);
      }
      setStudents(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, [classId, sectionId]);

  const filtered = useMemo(() => {
    let list = students;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(s => {
        const name = s.user?.full_name || s.full_name || '';
        const email = s.user?.email || s.email || '';
        return name.toLowerCase().includes(q) ||
               email.toLowerCase().includes(q) ||
               String(s.roll_number || '').toLowerCase().includes(q);
      });
    }
    if (selectedZoneFilter && selectedZoneFilter !== 'all') {
      list = list.filter(s => String(s.zone || '').toLowerCase() === selectedZoneFilter);
    }
    return list;
  }, [students, searchQuery, selectedZoneFilter]);

  const zones = useMemo(() => {
    const s = new Set(students.map(s => String(s.zone || '').toLowerCase()).filter(Boolean));
    return Array.from(s);
  }, [students]);

  /* ── skeleton ── */
  if (loading) return (
    <Layout>
      <div className="app-page">
        <div className="page-header">
          <h1>{className}</h1>
          <p>Loading students…</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 44, background: '#F8FAFC', borderRadius: 8, marginBottom: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="app-page">

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-header" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600, color: '#111827' }}>
              {className}
            </h1>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Section:</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 99, padding: '1px 10px' }}>
                {sectionName}
              </span>
            </div>
          </div>
          <Link
            to="/teacher/classes"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#374151', textDecoration: 'none', transition: 'background 0.15s' }}
          >
            <FiArrowLeft style={{ width: 14, height: 14 }} />
            Back to My Classes
          </Link>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '14px 16px', color: '#B91C1C', marginBottom: 16 }}>
            <FiAlertCircle style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14 }}>{error}</span>
          </div>
        )}

        {/* ── Main Panel ── */}
        {!error && (
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '16px', overflow: 'hidden' }}>

            {/* Panel toolbar */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>

              {/* Stats */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  <FiUsers style={{ color: '#2563EB', width: 16, height: 16 }} />
                  {filtered.length} of {students.length} students
                </span>
              </div>

              {/* Search + Zone Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  placeholder="Search name, email, roll…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FiSearch style={{ color: '#9CA3AF' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 260, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="zone-filter-label" sx={{ fontSize: '14px' }}>Zone Filter</InputLabel>
                  <Select
                    labelId="zone-filter-label"
                    value={selectedZoneFilter}
                    label="Zone Filter"
                    onChange={(e) => setSelectedZoneFilter(e.target.value)}
                    sx={{ borderRadius: '10px', fontSize: '14px' }}
                  >
                    <MenuItem value="all">All Zones</MenuItem>
                    {zones.map(z => (
                      <MenuItem key={z} value={z}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ZONE_CONFIG[z]?.dot || '#CCC' }} />
                          {z.charAt(0).toUpperCase() + z.slice(1)}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div style={{ padding: '64px 24px', textAlign: 'center', color: '#9CA3AF', fontSize: 15 }}>
                {students.length === 0 ? 'No students found in this section.' : 'No students match your search.'}
              </div>
            )}

            {/* Table */}
            {filtered.length > 0 && (
              <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead sx={{ backgroundColor: '#F9FAFB' }}>
                    <TableRow>
                      {['Student', 'Email', 'Roll No.', 'Section', 'Zone'].map((h, i) => (
                        <TableCell key={h} sx={{ 
                          fontSize: 11, 
                          fontWeight: 600, 
                          color: '#6B7280', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.06em', 
                          py: 2,
                          px: i === 0 ? 3 : 2
                        }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((student, i) => {
                      const fullName = student.user?.full_name || student.full_name || 'Unknown';
                      const email = student.user?.email || student.email || '—';
                      const phone = student.user?.phone || student.phone || '';

                      return (
                        <TableRow
                          key={student.id || i}
                          hover
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell sx={{ pl: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <Avatar name={fullName} />
                              <div>
                                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                                  {fullName}
                                </Typography>
                                {phone && (
                                  <Typography sx={{ fontSize: 12, color: '#6B7280' }}>
                                    {phone}
                                  </Typography>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, color: '#374151' }}>{email}</TableCell>
                          <TableCell sx={{ fontSize: 13, color: '#374151', fontFamily: 'monospace' }}>
                            {student.roll_number || '—'}
                          </TableCell>
                          <TableCell>
                            {student.section?.name ? (
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 99, padding: '3px 10px' }}>
                                {student.section.name}
                              </span>
                            ) : (
                              <span style={{ color: '#9CA3AF', fontSize: 13 }}>—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.zone ? (
                              <ZoneBadge zone={student.zone} />
                            ) : (
                              <span style={{ color: '#9CA3AF', fontSize: 13 }}>—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

          </Paper>
        )}

      </div>
    </Layout>
  );
};

export default TeacherClassStudents;
