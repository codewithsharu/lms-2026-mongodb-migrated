/**
 * Performance Alerts Component
 * Real-time performance alerts and notifications
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Alert, Badge, Button, Row, Col } from 'react-bootstrap';
import { 
  FiAlertTriangle, FiX, FiRefreshCw, FiBell, FiInfo, FiSettings,
  FiActivity, FiDatabase, FiCpu, FiHardDrive
} from 'react-icons/fi';
import performanceApi from '../../services/performanceApi';

const PerformanceAlerts = ({ autoRefresh = true, refreshInterval = 30000 }) => {
  const [alerts, setAlerts] = useState({ critical: [], warning: [], info: [] });
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [thresholds, setThresholds] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);

  useEffect(() => {
    loadAlerts();
    
    if (autoRefresh) {
      const interval = setInterval(loadAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await performanceApi.getAlerts();
      
      if (response.success) {
        setAlerts(response.data.alerts);
        setLastRefresh(new Date());
        
        // Add to history if new alerts
        const newAlerts = [...response.data.alerts.critical, ...response.data.alerts.warning];
        if (newAlerts.length > 0) {
          setAlertHistory(prev => [
            ...newAlerts.map(alert => ({
              ...alert,
              timestamp: new Date(),
              acknowledged: false
            })),
            ...prev.slice(0, 50) // Keep only last 50 alerts
          ]);
        }
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = (alertIndex, alertType) => {
    setAlerts(prev => ({
      ...prev,
      [alertType]: prev[alertType].map((alert, index) => 
        index === alertIndex ? { ...alert, acknowledged: true } : alert
      )
    }));
  };

  const clearAlert = (alertIndex, alertType) => {
    setAlerts(prev => ({
      ...prev,
      [alertType]: prev[alertType].filter((_, index) => index !== alertIndex)
    }));
  };

  const clearAllAlerts = (alertType) => {
    setAlerts(prev => ({
      ...prev,
      [alertType]: []
    }));
  };

  const loadThresholds = async () => {
    try {
      const response = await performanceApi.getThresholds();
      if (response.success) {
        setThresholds(response.data);
      }
    } catch (error) {
      console.error('Failed to load thresholds:', error);
    }
  };

  const updateThresholds = async (newThresholds) => {
    try {
      const response = await performanceApi.updateThresholds(newThresholds);
      if (response.success) {
        setThresholds(response.data.updatedThresholds);
        setShowSettings(false);
      }
    } catch (error) {
      console.error('Failed to update thresholds:', error);
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'memory': return <FiHardDrive />;
      case 'cpu': return <FiCpu />;
      case 'database': return <FiDatabase />;
      case 'response_time': return <FiActivity />;
      case 'error_rate': return <FiAlertTriangle />;
      default: return <FiInfo />;
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'secondary';
    }
  };

  const totalAlerts = alerts.critical.length + alerts.warning.length + alerts.info.length;
  const criticalCount = alerts.critical.length;

  if (totalAlerts === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <FiBell className="me-2" />
              Performance Alerts
            </h6>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={loadAlerts}
              disabled={loading}
            >
              <FiRefreshCw className={`me-1 ${loading ? 'spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="text-center text-muted py-3">
            <FiCheckCircle className="mb-2" style={{ fontSize: '2rem' }} />
            <div>No active alerts</div>
            <small>System is performing normally</small>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="performance-alerts">
      {/* Alert Summary */}
      <Card className="mb-3">
        <CardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <FiBell className="me-2" />
              Performance Alerts
              <Badge bg={criticalCount > 0 ? 'danger' : 'success'} className="ms-2">
                {totalAlerts}
              </Badge>
            </h6>
            <div className="d-flex align-items-center">
              {criticalCount > 0 && (
                <Badge bg="danger" className="me-2">
                  {criticalCount} Critical
                </Badge>
              )}
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={loadAlerts}
                disabled={loading}
                className="me-2"
              >
                <FiRefreshCw className={`me-1 ${loading ? 'spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <FiSettings className="me-1" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <small className="text-muted">
            Last updated: {lastRefresh?.toLocaleTimeString()}
          </small>
        </CardBody>
      </Card>

      {/* Critical Alerts */}
      {alerts.critical.length > 0 && (
        <Alert variant="danger" className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">
              <FiAlertTriangle className="me-2" />
              Critical Alerts ({alerts.critical.length})
            </h6>
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={() => clearAllAlerts('critical')}
            >
              Clear All
            </Button>
          </div>
          <div className="alert-list">
            {alerts.critical.map((alert, index) => (
              <div key={index} className="border-bottom pb-2 mb-2">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      {getAlertIcon(alert.type)}
                      <strong className="ms-2">{alert.type.toUpperCase()}</strong>
                      {alert.acknowledged && (
                        <Badge bg="secondary" className="ms-2">Acknowledged</Badge>
                      )}
                    </div>
                    <div>{alert.message}</div>
                    <small className="text-muted">
                      Value: {alert.value} | Threshold: {alert.threshold} | 
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </small>
                  </div>
                  <div className="d-flex align-items-center">
                    {!alert.acknowledged && (
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => acknowledgeAlert(index, 'critical')}
                        className="me-1"
                      >
                        Ack
                      </Button>
                    )}
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => clearAlert(index, 'critical')}
                    >
                      <FiX />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Alert>
      )}

      {/* Warning Alerts */}
      {alerts.warning.length > 0 && (
        <Alert variant="warning" className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">
              <FiAlertTriangle className="me-2" />
              Warnings ({alerts.warning.length})
            </h6>
            <Button 
              variant="outline-warning" 
              size="sm"
              onClick={() => clearAllAlerts('warning')}
            >
              Clear All
            </Button>
          </div>
          <div className="alert-list">
            {alerts.warning.map((alert, index) => (
              <div key={index} className="border-bottom pb-2 mb-2">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      {getAlertIcon(alert.type)}
                      <strong className="ms-2">{alert.type.toUpperCase()}</strong>
                      {alert.acknowledged && (
                        <Badge bg="secondary" className="ms-2">Acknowledged</Badge>
                      )}
                    </div>
                    <div>{alert.message}</div>
                    <small className="text-muted">
                      Value: {alert.value} | Threshold: {alert.threshold} | 
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </small>
                  </div>
                  <div className="d-flex align-items-center">
                    {!alert.acknowledged && (
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => acknowledgeAlert(index, 'warning')}
                        className="me-1"
                      >
                        Ack
                      </Button>
                    )}
                    <Button 
                      variant="outline-warning" 
                      size="sm"
                      onClick={() => clearAlert(index, 'warning')}
                    >
                      <FiX />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Alert>
      )}

      {/* Info Alerts */}
      {alerts.info.length > 0 && (
        <Alert variant="info" className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">
              <FiInfo className="me-2" />
              Information ({alerts.info.length})
            </h6>
            <Button 
              variant="outline-info" 
              size="sm"
              onClick={() => clearAllAlerts('info')}
            >
              Clear All
            </Button>
          </div>
          <div className="alert-list">
            {alerts.info.map((alert, index) => (
              <div key={index} className="border-bottom pb-2 mb-2">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      {getAlertIcon(alert.type)}
                      <strong className="ms-2">{alert.type.toUpperCase()}</strong>
                    </div>
                    <div>{alert.message}</div>
                    <small className="text-muted">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </small>
                  </div>
                  <Button 
                    variant="outline-info" 
                    size="sm"
                    onClick={() => clearAlert(index, 'info')}
                  >
                    <FiX />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Alert>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Card className="mt-3">
          <CardHeader>
            <h6 className="mb-0">
              <FiSettings className="me-2" />
              Alert Thresholds
            </h6>
          </CardHeader>
          <CardBody>
            {thresholds ? (
              <div>
                <Row className="mb-3">
                  <Col md={6}>
                    <label className="form-label">Memory Warning (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={thresholds.memory.warning}
                      onChange={(e) => setThresholds(prev => ({
                        ...prev,
                        memory: { ...prev.memory, warning: parseInt(e.target.value) }
                      }))}
                      min="0"
                      max="100"
                    />
                  </Col>
                  <Col md={6}>
                    <label className="form-label">Memory Critical (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={thresholds.memory.critical}
                      onChange={(e) => setThresholds(prev => ({
                        ...prev,
                        memory: { ...prev.memory, critical: parseInt(e.target.value) }
                      }))}
                      min="0"
                      max="100"
                    />
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <label className="form-label">CPU Warning (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={thresholds.cpu.warning}
                      onChange={(e) => setThresholds(prev => ({
                        ...prev,
                        cpu: { ...prev.cpu, warning: parseInt(e.target.value) }
                      }))}
                      min="0"
                      max="100"
                    />
                  </Col>
                  <Col md={6}>
                    <label className="form-label">CPU Critical (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={thresholds.cpu.critical}
                      onChange={(e) => setThresholds(prev => ({
                        ...prev,
                        cpu: { ...prev.cpu, critical: parseInt(e.target.value) }
                      }))}
                      min="0"
                      max="100"
                    />
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <label className="form-label">Response Time Warning (ms)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={thresholds.responseTime.warning}
                      onChange={(e) => setThresholds(prev => ({
                        ...prev,
                        responseTime: { ...prev.responseTime, warning: parseInt(e.target.value) }
                      }))}
                      min="0"
                    />
                  </Col>
                  <Col md={6}>
                    <label className="form-label">Response Time Critical (ms)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={thresholds.responseTime.critical}
                      onChange={(e) => setThresholds(prev => ({
                        ...prev,
                        responseTime: { ...prev.responseTime, critical: parseInt(e.target.value) }
                      }))}
                      min="0"
                    />
                  </Col>
                </Row>
                <div className="d-flex justify-content-end">
                  <Button 
                    variant="secondary" 
                    className="me-2"
                    onClick={() => setShowSettings(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary"
                    onClick={() => updateThresholds(thresholds)}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Button variant="primary" onClick={loadThresholds}>
                  Load Thresholds
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default PerformanceAlerts;
