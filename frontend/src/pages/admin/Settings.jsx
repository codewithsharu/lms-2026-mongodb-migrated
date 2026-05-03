import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiSettings, FiDatabase, FiMail, FiBell, FiShield, FiGlobe, FiUsers, FiBook } from 'react-icons/fi';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';

const AdminSettings = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    siteName: 'EDU LMS Platform',
    siteDescription: 'Learning Management System',
    allowStudentRegistration: true,
    allowTeacherRegistration: false,
    defaultUserRole: 'student',
    emailNotifications: true,
    maintenanceMode: false,
    sessionTimeout: '24',
    maxFileSize: '10',
    allowedFileTypes: '.pdf,.doc,.doc,.docx,.txt',
    theme: 'light'
  });

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('adminSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      localStorage.setItem('adminSettings', JSON.stringify(settings));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = () => {
    setSettings({
      siteName: 'EDU LMS Platform',
      siteDescription: 'Learning Management System',
      allowStudentRegistration: true,
      allowTeacherRegistration: false,
      defaultUserRole: 'student',
      emailNotifications: true,
      maintenanceMode: false,
      sessionTimeout: '24',
      maxFileSize: '10',
      allowedFileTypes: '.pdf,.doc,.doc,.docx,.txt',
      theme: 'light'
    });
    toast.success('Settings reset to defaults');
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: field === 'allowStudentRegistration' || field === 'allowTeacherRegistration' || field === 'emailNotifications' || field === 'maintenanceMode'
        ? value === 'true' || value === true
        : value
    }));
  };

  const settingsCategories = [
    {
      title: 'General Settings',
      icon: FiSettings,
      fields: [
        {
          name: 'siteName',
          label: 'Site Name',
          type: 'text',
          description: 'Name of your learning management platform'
        },
        {
          name: 'siteDescription',
          label: 'Site Description',
          type: 'text',
          description: 'Brief description of your platform'
        }
      ]
    },
    {
      title: 'User Management',
      icon: FiUsers,
      fields: [
        {
          name: 'allowStudentRegistration',
          label: 'Allow Student Registration',
          type: 'switch',
          description: 'Enable new student self-registration'
        },
        {
          name: 'allowTeacherRegistration',
          label: 'Allow Teacher Registration',
          type: 'switch',
          description: 'Enable new teacher registration requests'
        },
        {
          name: 'defaultUserRole',
          label: 'Default User Role',
          type: 'select',
          options: [
            { value: 'student', label: 'Student' },
            { value: 'teacher', label: 'Teacher' },
            { value: 'admin', label: 'Admin' }
          ],
          description: 'Default role for new user registrations'
        }
      ]
    },
    {
      title: 'System Configuration',
      icon: FiDatabase,
      fields: [
        {
          name: 'sessionTimeout',
          label: 'Session Timeout (hours)',
          type: 'number',
          description: 'User session duration before automatic logout'
        },
        {
          name: 'maxFileSize',
          label: 'Max File Size (MB)',
          type: 'number',
          description: 'Maximum file upload size in megabytes'
        },
        {
          name: 'allowedFileTypes',
          label: 'Allowed File Types',
          type: 'text',
          description: 'Comma-separated list of allowed file extensions'
        }
      ]
    },
    {
      title: 'Notifications',
      icon: FiMail,
      fields: [
        {
          name: 'emailNotifications',
          label: 'Email Notifications',
          type: 'switch',
          description: 'Enable system email notifications'
        }
      ]
    },
    {
      title: 'Security & Maintenance',
      icon: FiShield,
      fields: [
        {
          name: 'maintenanceMode',
          label: 'Maintenance Mode',
          type: 'switch',
          description: 'Put the system in maintenance mode'
        }
      ]
    },
    {
      title: 'Appearance',
      icon: FiGlobe,
      fields: [
        {
          name: 'theme',
          label: 'Theme',
          type: 'select',
          options: [
            { value: 'light', label: 'Light Theme' },
            { value: 'dark', label: 'Dark Theme' },
            { value: 'auto', label: 'System Default' }
          ],
          description: 'Choose interface theme'
        }
      ]
    }
  ];

  const renderField = (field) => {
    const value = settings[field.name];

    switch (field.type) {
      case 'text':
        return (
          <InputField
            label={field.label}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.description}
            className="w-full"
          />
        );

      case 'number':
        return (
          <InputField
            type="number"
            label={field.label}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.description}
            min="1"
            className="w-full"
          />
        );

      case 'select':
        return (
          <SelectField
            label={field.label}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            options={field.options}
            className="w-full"
          />
        );

      case 'switch':
        return (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            <button
              onClick={() => handleInputChange(field.name, !value)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                value ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  value ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs text-gray-500 ml-2">
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        );

      default:
        return (
          <InputField
            label={field.label}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.description}
            className="w-full"
          />
        );
    }
  };

  return (
    <Layout>
      <div className="app-page">
        <div className="page-header">
          <div>
            <h1>Admin Settings</h1>
            <p className="text-gray-500">Configure system-wide settings and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {settingsCategories.map((category, index) => (
            <Card key={index} className="h-fit">
              <Card.Header>
                <div className="flex items-center gap-3">
                  <category.icon className="w-5 h-5 text-gray-600" />
                  <h3 className="section-title">{category.title}</h3>
                </div>
              </Card.Header>
              <Card.Body className="space-y-4">
                {category.fields.map((field, fieldIndex) => (
                  <div key={fieldIndex}>
                    <div className="mb-3">
                      <div className="text-sm text-gray-600 mb-1">{field.description}</div>
                      {renderField(field)}
                    </div>
                  </div>
                ))}
              </Card.Body>
            </Card>
          ))}
        </div>

        <div className="fixed bottom-6 right-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={handleResetSettings}
            disabled={loading}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default AdminSettings;
