import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBook, FiUsers, FiLayers, FiAlertCircle, FiArrowRight, FiSearch, FiInbox } from 'react-icons/fi';
import Layout from '../../components/Layout';
import { teacherAPI } from '../../services/api';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const ZONE_CONFIG = {
  blue:  { dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'Blue' },
  red:   { dot: '#EF4444', bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', label: 'Red'  },
  green: { dot: '#22C55E', bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Green' },
};

const ZoneBadge = ({ zone }) => {
  const cfg = ZONE_CONFIG[String(zone).toLowerCase()];
  if (!cfg) return (
    <span style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
      {zone}
    </span>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

const ClassInitials = ({ name, index }) => {
  const COLORS = [
    ['#EFF6FF', '#2563EB'], ['#FFF7ED', '#EA580C'], ['#F0FDF4', '#16A34A'],
    ['#FDF4FF', '#9333EA'], ['#FFFBEB', '#D97706'], ['#F0F9FF', '#0284C7'],
  ];
  const [bg, fg] = COLORS[index % COLORS.length];
  const initials = name
    ? name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 44, height: 44, borderRadius: 12, background: bg,
      color: fg, fontWeight: 700, fontSize: 15, flexShrink: 0, letterSpacing: '-0.02em',
      border: `1.5px solid ${fg}22`
    }}>
      {initials}
    </span>
  );
};

/* ─── main component ───────────────────────────────────────────────────────── */

const TeacherClasses = () => {
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [assignedData, setAssignedData] = useState({ assignments: [], summary: { total_assignments: 0, total_students: 0 } });

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await teacherAPI.getAssignedStudents();
        const d = res.data || {};
        setAssignedData({
          assignments: d.assignments || [],
          summary: { total_assignments: d.summary?.total_assignments || 0, total_students: d.summary?.total_students || 0 },
        });
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load classes');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  /* Build one card per unique class+section pair */
  const cards = useMemo(() => {
    const map = new Map();
    (assignedData.assignments || []).forEach(a => {
      const classId   = a.class?.id   || 'unknown';
      const sectionId = a.section?.id || '__none__';
      const key = `${classId}::${sectionId}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          classId,
          sectionId: a.section?.id || null,
          className:   a.class?.name   || 'Unknown Class',
          sectionName: a.section?.name || 'All Sections',
          zones: new Set(),
          studentCount: 0,
        });
      }
      const card = map.get(key);
      if (a.zone) card.zones.add(a.zone);
      card.studentCount += a.student_count || 0;
    });
    return Array.from(map.values()).map(c => ({ ...c, zones: Array.from(c.zones) }));
  }, [assignedData.assignments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(c =>
      c.className.toLowerCase().includes(q) ||
      c.sectionName.toLowerCase().includes(q)
    );
  }, [cards, search]);

  const totalClasses  = useMemo(() => new Set(cards.map(c => c.classId)).size, [cards]);
  const totalSections = cards.length;
  const totalStudents = assignedData.summary.total_students;

  const handleManage = (card, idx) => {
    const sectionParam = card.sectionId || 'all';
    navigate(`/teacher/${card.classId}/${sectionParam}/students`, {
      state: { className: card.className, sectionName: card.sectionName },
    });
  };

  /* ── skeleton ── */
  if (loading) return (
    <Layout>
      <div className="app-page">
        <div className="page-header">
          <h1>My Classes</h1>
          <p>Loading your assigned sections…</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24, height: 180, animation: 'pulse 1.5s ease-in-out infinite' }}>
              <div style={{ background: '#F1F5F9', borderRadius: 8, height: 16, width: '60%', marginBottom: 12 }} />
              <div style={{ background: '#F1F5F9', borderRadius: 8, height: 12, width: '40%', marginBottom: 20 }} />
              <div style={{ background: '#F1F5F9', borderRadius: 8, height: 28, width: '35%' }} />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="app-page">

        {/* ── Page Header ── */}
        <div className="page-header">
          <h1>My Classes</h1>
          <p>Your assigned sections and students — read-only view.</p>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Classes',  value: totalClasses,  icon: FiBook,   color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Sections', value: totalSections, icon: FiLayers, color: '#9333EA', bg: '#FDF4FF' },
            { label: 'Students', value: totalStudents, icon: FiUsers,  color: '#16A34A', bg: '#F0FDF4' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value}</p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 20, height: 20, color }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '14px 16px', color: '#B91C1C' }}>
            <FiAlertCircle style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14 }}>{error}</span>
          </div>
        )}

        {/* ── Card Panel ── */}
        {!error && (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>

            {/* Panel header with search */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <p style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>
                Section Assignments
                {filtered.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: '#6B7280', background: '#F3F4F6', borderRadius: 99, padding: '1px 8px' }}>
                    {filtered.length}
                  </span>
                )}
              </p>
              <div style={{ position: 'relative', width: 240 }}>
                <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', width: 15, height: 15, pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search class or section…"
                  style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#374151', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 12, textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiInbox style={{ width: 28, height: 28, color: '#9CA3AF' }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: 0 }}>
                  {cards.length === 0 ? 'No classes assigned yet' : 'No results match your search'}
                </p>
                <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0, maxWidth: 280 }}>
                  {cards.length === 0
                    ? 'Ask your admin to assign you to a class section.'
                    : 'Try a different class or section name.'}
                </p>
              </div>
            )}

            {/* Cards grid */}
            {filtered.length > 0 && (
              <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {filtered.map((card, idx) => (
                  <SectionCard key={card.key} card={card} idx={idx} onManage={() => handleManage(card, idx)} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
};

/* ─── Section Card ─────────────────────────────────────────────────────────── */

const SectionCard = ({ card, idx, onManage }) => {
  const [hovered, setHovered] = useState(false);

  const allZones  = card.zones.length === 0;
  const zonesList = allZones ? ['blue', 'red', 'green'] : card.zones;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1.5px solid ${hovered ? '#BFDBFE' : '#E5E7EB'}`,
        borderRadius: 14,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'border-color 0.18s, box-shadow 0.18s',
        boxShadow: hovered ? '0 4px 16px rgba(37,99,235,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        cursor: 'default',
      }}
    >
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <ClassInitials name={card.className} index={idx} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.className}
          </p>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '3px 0 0', fontWeight: 500 }}>
            {card.sectionName}
          </p>
        </div>
        <span style={{ flexShrink: 0, background: '#F0F9FF', border: '1px solid #BAE6FD', color: '#0369A1', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
          {card.studentCount} {card.studentCount === 1 ? 'student' : 'students'}
        </span>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #F1F5F9' }} />

      {/* Zones */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
          {allZones ? 'All Zones' : 'Assigned Zones'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allZones ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 99, padding: '3px 10px' }}>
              All Zones
            </span>
          ) : (
            zonesList.map(z => <ZoneBadge key={z} zone={z} />)
          )}
        </div>
      </div>

      {/* Manage button */}
      <button
        onClick={onManage}
        style={{
          marginTop: 2,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          padding: '10px 16px',
          background: hovered ? '#2563EB' : '#EFF6FF',
          color: hovered ? '#fff' : '#2563EB',
          border: `1.5px solid ${hovered ? '#2563EB' : '#BFDBFE'}`,
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.18s, color 0.18s, border-color 0.18s',
        }}
      >
        View Students
        <FiArrowRight style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
};

export default TeacherClasses;
