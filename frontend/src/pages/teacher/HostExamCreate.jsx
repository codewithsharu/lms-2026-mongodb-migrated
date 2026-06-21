import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiChevronDown, FiCode, FiSend, FiClock, FiCalendar, FiUsers, FiAlertCircle } from 'react-icons/fi';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import { assessmentAPI, classAPI, compilerAPI, teacherAPI } from '../../services/api';

const SelectMenu = ({ label, value, onChange, options, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const selectedOption = options.find((option) => option.value === value) || options[0];

  return (
    <div className="relative" ref={wrapperRef}>
      {label && <label className="form-label">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`form-select flex w-full items-center justify-between gap-2 text-left ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span className="truncate">{selectedOption?.label || 'Select'}</span>
        <FiChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {options.map((option) => (
            <button
              key={`${label}-${option.value || 'empty'}`}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                option.value === value
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const MultiSelectMenu = ({ label, value = [], onChange, options, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const selectedOptions = options.filter((option) => value.includes(option.value));
  const selectedCount = selectedOptions.length;

  const handleToggle = (optionValue) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {label && <label className="form-label">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`form-select flex w-full items-center justify-between gap-2 text-left ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span className="truncate">
          {selectedCount === 0
            ? 'Select templates'
            : selectedCount === 1
              ? selectedOptions[0]?.label
              : `${selectedCount} selected`}
        </span>
        <FiChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {options.map((option) => (
            <button
              key={`${label}-${option.value || 'empty'}`}
              type="button"
              onClick={() => handleToggle(option.value)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                value.includes(option.value)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => {}}
                className="h-4 w-4"
              />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const HostExamCreate = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [assignmentScope, setAssignmentScope] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [challengeCatalog, setChallengeCatalog] = useState([]);
  const [challengeSearch, setChallengeSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hosting, setHosting] = useState(false);

  const [formData, setFormData] = useState({
    template_ids: [],
    exam_title: '',
    class_id: '',
    section_id: '',
    zone: '',
    specific_student_id: '',
    duration_minutes: 60,
    max_attempts: 1,
    allow_resume: true,
    result_mode: 'after_end',
    publish_status: 'draft',
    start_time: '',
    end_time: '',
    instructions: '',
    coding_challenge_ids: []
  });

  // All available zones for comprehensive selection
  const allZones = ['blue', 'red', 'green', 'unassigned'];

  const selectedTemplates = templates.filter((item) => formData.template_ids.includes(item.id));

  // Get zone options with user counts
  const getZoneOptions = () => {
    if (!formData.class_id) {
      // Show all zones when no class selected
      return allZones.map(zone => ({
        value: zone,
        label: `${zone.charAt(0).toUpperCase() + zone.slice(1)} Zone`,
        userCount: 0,
        hasUsers: false
      }));
    }

    // Show zones with user counts when class is selected
    return allZones.map(zone => {
      const userCount = availableStudents.filter(student => 
        student.classIds.includes(formData.class_id) && 
        student.zones.includes(zone)
      ).length;

      return {
        value: zone,
        label: `${zone.charAt(0).toUpperCase() + zone.slice(1)} Zone (${userCount} students)`,
        userCount,
        hasUsers: userCount > 0
      };
    });
  };

  // Enhanced time/date formatting
  const formatDateTimeLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Get current date/time for default values
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Get default end time (start time + 2 hours)
  const getDefaultEndTime = () => {
    const start = formData.start_time ? new Date(formData.start_time) : new Date();
    start.setMinutes(start.getMinutes() - start.getTimezoneOffset());
    start.setHours(start.getHours() + 2);
    return start.toISOString().slice(0, 16);
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [templateRes, assignedRes] = await Promise.all([
        assessmentAPI.getTemplates(),
        teacherAPI.getAssignedStudents()
      ]);

      setTemplates(templateRes.data.templates || []);

      const assignments = assignedRes.data?.assignments || [];
      const classMap = new Map();
      const studentMap = new Map();

      assignments.forEach((assignment) => {
        const classId = assignment.class?.id;
        if (!classId) return;

        if (!classMap.has(classId)) {
          classMap.set(classId, {
            classId,
            className: assignment.class?.name || 'Unknown Class',
            sectionsMap: new Map(),
            zonesSet: new Set(),
            hasAllSectionsAccess: false
          });
        }

        const entry = classMap.get(classId);

        if (assignment.section?.id) {
          entry.sectionsMap.set(assignment.section.id, {
            id: assignment.section.id,
            name: assignment.section.name || 'Section'
          });
        } else {
          entry.hasAllSectionsAccess = true;
        }

        if (assignment.zone) {
          entry.zonesSet.add(assignment.zone);
        }

        (assignment.students || []).forEach((student) => {
          const studentId = student.id;
          if (!studentId) return;

          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, {
              id: studentId,
              full_name: student.full_name || 'Student',
              email: student.email || '',
              classIds: new Set(),
              sectionIds: new Set(),
              zones: new Set()
            });
          }

          const studentEntry = studentMap.get(studentId);
          studentEntry.classIds.add(classId);

          if (student.section?.id || assignment.section?.id) {
            studentEntry.sectionIds.add(student.section?.id || assignment.section?.id);
          }

          if (student.zone || assignment.zone) {
            studentEntry.zones.add(student.zone || assignment.zone);
          }
        });
      });

      const classEntries = Array.from(classMap.values());

      await Promise.all(classEntries.map(async (entry) => {
        if (!entry.hasAllSectionsAccess) {
          return;
        }

        try {
          const sectionsResponse = await classAPI.getSections(entry.classId);
          (sectionsResponse.data || []).forEach((section) => {
            if (!section?.id) {
              return;
            }

            entry.sectionsMap.set(section.id, {
              id: section.id,
              name: section.name || 'Section'
            });
          });
        } catch {
          // Keep best-effort inferred sections from assignment payload.
        }
      }));

      const scopeList = classEntries.map((item) => ({
        classId: item.classId,
        className: item.className,
        sections: Array.from(item.sectionsMap.values()).sort((a, b) => String(a.name).localeCompare(String(b.name))),
        zones: Array.from(item.zonesSet.values()).sort()
      }));

      setAssignmentScope(scopeList);
      setClasses(scopeList.map((item) => ({ id: item.classId, name: item.className })));
      setAvailableStudents(
        Array.from(studentMap.values()).map((student) => ({
          id: student.id,
          full_name: student.full_name,
          email: student.email,
          classIds: Array.from(student.classIds),
          sectionIds: Array.from(student.sectionIds),
          zones: Array.from(student.zones)
        }))
      );

      try {
        const challengeRes = await compilerAPI.listTeacherChallenges({ limit: 150 });
        setChallengeCatalog(challengeRes.data?.challenges || []);
      } catch {
        setChallengeCatalog([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load hosting data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!formData.class_id) {
      setSections([]);
      return;
    }

    const classScope = assignmentScope.find((item) => item.classId === formData.class_id);
    setSections(classScope?.sections || []);

    if (formData.section_id && !classScope?.sections?.some((section) => section.id === formData.section_id)) {
      setFormData((prev) => ({ ...prev, section_id: '' }));
    }

    if (formData.zone && classScope?.zones?.length > 0 && !classScope.zones.includes(formData.zone)) {
      setFormData((prev) => ({ ...prev, zone: '' }));
    }
  }, [formData.class_id, assignmentScope, formData.section_id, formData.zone]);

  const filteredStudentOptions = useMemo(() => {
    return availableStudents.filter((student) => {
      if (formData.class_id && !student.classIds.includes(formData.class_id)) {
        return false;
      }

      if (formData.section_id && !student.sectionIds.includes(formData.section_id)) {
        return false;
      }

      if (formData.zone && !student.zones.includes(formData.zone)) {
        return false;
      }

      return true;
    });
  }, [availableStudents, formData.class_id, formData.section_id, formData.zone]);

  const filteredChallengeCatalog = useMemo(() => {
    const keyword = String(challengeSearch || '').trim().toLowerCase();

    if (!keyword) {
      return challengeCatalog;
    }

    return challengeCatalog.filter((challenge) => {
      const title = String(challenge.title || '').toLowerCase();
      const id = String(challenge.id || '').toLowerCase();
      return title.includes(keyword) || id.includes(keyword);
    });
  }, [challengeCatalog, challengeSearch]);

  useEffect(() => {
    if (!formData.specific_student_id) return;

    const existsInScope = filteredStudentOptions.some((student) => student.id === formData.specific_student_id);

    if (!existsInScope) {
      setFormData((prev) => ({ ...prev, specific_student_id: '' }));
    }
  }, [filteredStudentOptions, formData.specific_student_id]);

  const handleHostExam = async (event) => {
    event.preventDefault();

    if (!formData.template_ids || formData.template_ids.length === 0) {
      toast.error('Please select at least one template first');
      return;
    }

    if (selectedTemplates.some((template) => Number(template.question_count || 0) <= 0)) {
      toast.error('One or more selected templates have no questions. Add questions before scheduling the exam');
      return;
    }

    if (!formData.duration_minutes || !formData.max_attempts) {
      toast.error('Duration and attempts are required');
      return;
    }

    const duration = Number(formData.duration_minutes);
    const attempts = Number(formData.max_attempts);

    if (!Number.isFinite(duration) || duration <= 0) {
      toast.error('Duration must be greater than 0 minutes');
      return;
    }

    if (!Number.isFinite(attempts) || attempts <= 0) {
      toast.error('Max attempts must be at least 1');
      return;
    }

    if (formData.start_time && formData.end_time && new Date(formData.end_time) <= new Date(formData.start_time)) {
      toast.error('End time must be after start time');
      return;
    }

    if (formData.publish_status === 'published' && (!formData.start_time || !formData.end_time)) {
      toast.error('Start and end time are required to publish an exam');
      return;
    }

    try {
      setHosting(true);
      const response = await assessmentAPI.hostExam({
        template_ids: formData.template_ids,
        exam_title: String(formData.exam_title || '').trim() || null,
        class_id: formData.class_id || null,
        section_id: formData.section_id || null,
        zone: formData.zone || null,
        duration_minutes: Number(formData.duration_minutes),
        max_attempts: Number(formData.max_attempts),
        allow_resume: formData.allow_resume,
        result_mode: formData.result_mode,
        publish_status: formData.publish_status,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        instructions: formData.instructions || null,
        assigned_student_ids: [],
        coding_section: formData.coding_challenge_ids.length > 0
          ? {
            enabled: true,
            challenge_ids: formData.coding_challenge_ids
          }
          : null
      });
      toast.success(response.data?.message || 'Exam hosted successfully');
      navigate('/teacher/assessments/host');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to host exam');
    } finally {
      setHosting(false);
    }
  };

  const toggleCodingChallenge = (challengeId) => {
    setFormData((prev) => {
      const exists = prev.coding_challenge_ids.includes(challengeId);
      return {
        ...prev,
        coding_challenge_ids: exists
          ? prev.coding_challenge_ids.filter((id) => id !== challengeId)
          : [...prev.coding_challenge_ids, challengeId]
      };
    });
  };

  return (
    <Layout>
      <div className="app-page">
        <div className="page-header flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/teacher/assessments/host')}
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back to Hosted Exams
            </button>
            <h1>Schedule New Exam</h1>
            <p>Select a template and scope to publish the exam for your students.</p>
          </div>
        </div>

        <Card>
          <Card.Body>
            <InputField
              label="Exam Title (optional)"
              value={formData.exam_title}
              maxLength={120}
              onChange={(event) => setFormData((prev) => ({ ...prev, exam_title: event.target.value }))}
              placeholder="Leave blank to use template title"
            />
            <p className="mt-2 text-xs text-slate-500">
              This name appears in hosted exam lists and student screens.
            </p>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <h2 className="section-title">Exam Configuration</h2>
          </Card.Header>
          <Card.Body>
            <form onSubmit={handleHostExam} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <MultiSelectMenu
                  label="Assessment Templates *"
                  value={formData.template_ids}
                  onChange={(nextValues) => setFormData({ ...formData, template_ids: nextValues })}
                  options={templates.map((template) => ({
                    value: template.id,
                    label: `${template.title} (${template.subject}) — ID: ${template.id.slice(0, 8)}`
                  }))}
                />
                {selectedTemplates.length > 0 && (
                  <p className="mt-2 text-sm text-slate-600">
                    Selected: {selectedTemplates.length} template{selectedTemplates.length !== 1 ? 's' : ''} • Total questions: {selectedTemplates.reduce((sum, t) => sum + Number(t.question_count || 0), 0)}
                  </p>
                )}
              </div>

              <SelectMenu
                label="Class"
                value={formData.class_id}
                onChange={(nextValue) => setFormData({ ...formData, class_id: nextValue, section_id: '' })}
                options={[
                  { value: '', label: 'Select Assigned Class' },
                  ...classes.map((cls) => ({ value: cls.id, label: cls.name }))
                ]}
              />

              <SelectMenu
                label="Section"
                value={formData.section_id}
                onChange={(nextValue) => setFormData({ ...formData, section_id: nextValue })}
                disabled={!formData.class_id}
                options={[
                  { value: '', label: 'All Sections' },
                  ...sections.map((section) => ({ value: section.id, label: section.name }))
                ]}
              />

              <div>
              <SelectMenu
                label="Zone"
                value={formData.zone}
                onChange={(nextValue) => setFormData({ ...formData, zone: nextValue })}
                options={[
                  { value: '', label: 'All Zones' },
                  ...getZoneOptions().map(zone => ({
                    value: zone.value,
                    label: zone.label
                  }))
                ]}
              />
              {formData.class_id && formData.zone && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  {getZoneOptions().find(z => z.value === formData.zone)?.hasUsers ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <FiUsers className="h-4 w-4" />
                      <span>{getZoneOptions().find(z => z.value === formData.zone)?.userCount} students will have access</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600">
                      <FiAlertCircle className="h-4 w-4" />
                      <span>No students in this zone - exam will be inaccessible</span>
                    </div>
                  )}
                </div>
              )}
            </div>

              <InputField
                label="Duration (minutes) *"
                type="number"
                min="1"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                required
              />

              <InputField
                label="Max Attempts *"
                type="number"
                min="1"
                value={formData.max_attempts}
                onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })}
                required
              />

              <SelectMenu
                label="Resume Attempt"
                value={formData.allow_resume ? 'true' : 'false'}
                onChange={(nextValue) => setFormData({ ...formData, allow_resume: nextValue === 'true' })}
                options={[
                  { value: 'true', label: 'Allow resume after exit' },
                  { value: 'false', label: 'Do not allow resume after exit' }
                ]}
              />

              <SelectMenu
                label="Result Visibility"
                value={formData.result_mode}
                onChange={(nextValue) => setFormData({ ...formData, result_mode: nextValue })}
                options={[
                  { value: 'after_end', label: 'After End Time' },
                  { value: 'immediate', label: 'Immediate' },
                  { value: 'manual', label: 'Manual Release' }
                ]}
              />

              <SelectMenu
                label="Publish Status"
                value={formData.publish_status}
                onChange={(nextValue) => setFormData({ ...formData, publish_status: nextValue })}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                  { value: 'closed', label: 'Closed' }
                ]}
              />

              <div>
              <label className="form-label flex items-center gap-2">
                <FiCalendar className="h-4 w-4" />
                Start Date/Time
              </label>
              <div className="relative">
                <InputField
                  type="datetime-local"
                  value={formatDateTimeLocal(formData.start_time)}
                  onChange={(e) => {
                    const newStartTime = e.target.value;
                    setFormData({ 
                      ...formData, 
                      start_time: newStartTime,
                      // Auto-adjust end time if it's before start time
                      end_time: formData.end_time && new Date(newStartTime) >= new Date(formData.end_time) 
                        ? getDefaultEndTime() 
                        : formData.end_time
                    });
                  }}
                  min={getCurrentDateTime()}
                  placeholder="Select start date and time"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <FiCalendar className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                When students can begin taking the exam
              </p>
            </div>

            <div>
              <label className="form-label flex items-center gap-2">
                <FiClock className="h-4 w-4" />
                End Date/Time
              </label>
              <div className="relative">
                <InputField
                  type="datetime-local"
                  value={formatDateTimeLocal(formData.end_time)}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  min={formData.start_time || getCurrentDateTime()}
                  placeholder="Select end date and time"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <FiClock className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                When exam window closes (auto-submission)
              </p>
              {formData.start_time && formData.end_time && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  {new Date(formData.end_time) <= new Date(formData.start_time) ? (
                    <div className="flex items-center gap-1 text-red-600">
                      <FiAlertCircle className="h-4 w-4" />
                      <span>End time must be after start time</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-green-600">
                      <FiClock className="h-4 w-4" />
                      <span>
                        Duration: {Math.round((new Date(formData.end_time) - new Date(formData.start_time)) / (1000 * 60 * 60))} hours
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

              <div className="md:col-span-2">
                <label className="form-label">Instructions</label>
                <textarea
                  className="form-input min-h-24"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Exam instructions visible to students"
                />
              </div>

              <div className="md:col-span-2 rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/70 via-white to-slate-50 p-4 lg:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <FiCode className="h-4 w-4 text-indigo-600" />
                    Coding Section (optional)
                  </div>
                  <span className={`status-badge ${formData.coding_challenge_ids.length > 0 ? 'success' : 'info'}`}>
                    {formData.coding_challenge_ids.length > 0
                      ? `${formData.coding_challenge_ids.length} selected`
                      : 'None selected'}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-600">
                  Select coding challenges to include in the same exam attempt. If selected, students will see both MCQ and coding; if left blank, they will see MCQ only.
                </p>

                <div className="mt-4 space-y-4">
                  <InputField
                    label="Search Coding Challenges"
                    value={challengeSearch}
                    onChange={(event) => setChallengeSearch(event.target.value)}
                    placeholder="Search by challenge title or ID"
                  />

                  <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
                    {filteredChallengeCatalog.length > 0 ? (
                      <div className="space-y-2">
                        {filteredChallengeCatalog.map((challenge) => {
                          const checked = formData.coding_challenge_ids.includes(challenge.id);

                          return (
                            <label
                              key={challenge.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                                checked
                                  ? 'border-indigo-200 bg-indigo-50/60 shadow-[0_1px_2px_rgba(79,70,229,0.12)]'
                                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCodingChallenge(challenge.id)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-slate-800">
                                  {challenge.title || 'Untitled Challenge'}
                                </span>
                                <span
                                  className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                    checked
                                      ? 'border-indigo-200 bg-indigo-100 text-indigo-700'
                                      : 'border-slate-200 bg-slate-50 text-slate-500'
                                  }`}
                                >
                                  ID: {challenge.id}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="px-2 py-4 text-sm text-slate-500">No coding challenges found.</p>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">
                    Selected coding challenges: <span className="font-semibold text-slate-800">{formData.coding_challenge_ids.length}</span>
                  </p>
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={hosting || loading}>
                  <FiSend className="h-4 w-4" />
                  {hosting ? 'Hosting...' : 'Host Exam'}
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>
      </div>
    </Layout>
  );
};

export default HostExamCreate;
