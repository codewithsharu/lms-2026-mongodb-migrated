import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiBookOpen, FiCopy, FiSearch, FiTerminal } from 'react-icons/fi';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import { assessmentAPI, compilerAPI } from '../../services/api';

const CentralRepo = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [templateSearch, setTemplateSearch] = useState('');
  const [challengeSearch, setChallengeSearch] = useState('');
  const [cloningTemplateId, setCloningTemplateId] = useState(null);
  const [cloningChallengeId, setCloningChallengeId] = useState(null);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await assessmentAPI.getCentralTemplates();
      setTemplates(response.data?.templates || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load central templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchChallenges = async (query = '') => {
    try {
      setLoadingChallenges(true);
      const response = await compilerAPI.listCentralChallenges({ q: query || undefined, limit: 100 });
      setChallenges(response.data?.challenges || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load central challenges');
    } finally {
      setLoadingChallenges(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchChallenges('');
  }, []);

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((template) => (
      String(template.title || '').toLowerCase().includes(query)
      || String(template.subject || '').toLowerCase().includes(query)
      || String(template.author_name || '').toLowerCase().includes(query)
    ));
  }, [templates, templateSearch]);

  const handleCloneTemplate = async (templateId) => {
    if (!templateId) return;

    try {
      setCloningTemplateId(templateId);
      await assessmentAPI.cloneTemplate(templateId);
      toast.success('Question bank cloned to your account');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to clone question bank');
    } finally {
      setCloningTemplateId(null);
    }
  };

  const handleCloneChallenge = async (challengeId) => {
    if (!challengeId) return;

    try {
      setCloningChallengeId(challengeId);
      await compilerAPI.cloneChallenge(challengeId);
      toast.success('Challenge cloned to your account');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to clone challenge');
    } finally {
      setCloningChallengeId(null);
    }
  };

  return (
    <Layout>
      <div className="app-page">
        <div className="page-header flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1>Central Repository</h1>
            <p>Browse shared question banks and coding challenges published by teachers.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={activeTab === 'templates' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('templates')}
          >
            <FiBookOpen className="h-4 w-4" />
            Question Banks
          </Button>
          <Button
            variant={activeTab === 'challenges' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('challenges')}
          >
            <FiTerminal className="h-4 w-4" />
            Coding Challenges
          </Button>
        </div>

        {activeTab === 'templates' && (
          <Card>
            <Card.Body>
              <div className="mb-4 max-w-md">
                <InputField
                  label="Search question banks"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  leftIcon={FiSearch}
                  placeholder="Search title, subject, author..."
                />
              </div>

              {loadingTemplates ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : filteredTemplates.length > 0 ? (
                <div className="table-shell overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Subject</th>
                        <th>Tag</th>
                        <th>Author</th>
                        <th>Questions</th>
                        <th>Updated</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTemplates.map((template) => (
                        <tr key={template.id}>
                          <td className="font-medium text-slate-800">{template.title || 'Untitled Question Bank'}</td>
                          <td>{template.subject || 'MCQ'}</td>
                          <td>
                            <span className="status-badge info">Questions</span>
                          </td>
                          <td>{template.author_name || '—'}</td>
                          <td>{template.question_count || 0}</td>
                          <td>{template.updated_at ? new Date(template.updated_at).toLocaleString() : '—'}</td>
                          <td>
                            <div className="flex justify-end">
                              <Button
                                variant="secondary"
                                className="h-9! px-3!"
                                onClick={() => handleCloneTemplate(template.id)}
                                disabled={cloningTemplateId === template.id}
                              >
                                <FiCopy className="h-4 w-4" />
                                Clone
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-slate-500">No question banks available in Central Repo.</div>
              )}
            </Card.Body>
          </Card>
        )}

        {activeTab === 'challenges' && (
          <Card>
            <Card.Body>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[240px]">
                  <InputField
                    label="Search challenges"
                    value={challengeSearch}
                    onChange={(e) => setChallengeSearch(e.target.value)}
                    leftIcon={FiSearch}
                    placeholder="Search title, tag, author..."
                  />
                </div>
                <Button variant="secondary" onClick={() => fetchChallenges(challengeSearch)}>Search</Button>
              </div>

              {loadingChallenges ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : challenges.length > 0 ? (
                <div className="table-shell overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Tags</th>
                        <th>Author</th>
                        <th>ID</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {challenges.map((challenge) => (
                        <tr key={challenge.id}>
                          <td className="font-medium text-slate-800">{challenge.title || 'Untitled Challenge'}</td>
                          <td>
                            {(challenge.tags || []).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {(challenge.tags || []).map((tag) => (
                                  <span key={`${challenge.id}-${tag}`} className="status-badge info">{tag}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="status-badge warning">No tags</span>
                            )}
                          </td>
                          <td>{challenge.author_name || '—'}</td>
                          <td className="text-xs text-slate-500">{challenge.id}</td>
                          <td>
                            <div className="flex justify-end">
                              <Button
                                variant="secondary"
                                className="h-9! px-3!"
                                onClick={() => handleCloneChallenge(challenge.id)}
                                disabled={cloningChallengeId === challenge.id}
                              >
                                <FiCopy className="h-4 w-4" />
                                Clone
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-slate-500">No challenges available in Central Repo.</div>
              )}
            </Card.Body>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default CentralRepo;
