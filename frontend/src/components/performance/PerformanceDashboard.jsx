/**
 * Performance Dashboard Component
 * Holistic system health visibility with database, memory, CPU, and error tracking
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Row, Col, Badge, Button, Alert, ProgressBar, Spinner } from 'react-bootstrap';
import { 
  FiCpu, FiHardDrive, FiDatabase, FiActivity, FiAlertTriangle, 
  FiCheckCircle, FiRefreshCw, FiTrendingUp, FiUsers, FiClock,
  FiServer, FiWifi, FiBarChart2, FiSettings
} from 'react-icons/fi';
import performanceApi from '../../services/performanceApi';

const PerformanceDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await performanceApi.getDashboardData();
      
      if (response.success) {
        setDashboardData(response.data);
        setLastRefresh(new Date());
        setError(null);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadDashboardData();
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'danger';
      default: return 'secondary';
    }
  };

  const getUsageColor = (percentage, thresholds = { warning: 70, critical: 85 }) => {
    if (percentage >= thresholds.critical) return 'danger';
    if (percentage >= thresholds.warning) return 'warning';
    return 'success';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 MB';
    return `${bytes} MB`;
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading && !dashboardData) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" className="me-2" />
        Loading performance data...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <FiAlertTriangle className="me-2" />
        {error}
        <Button variant="outline-danger" size="sm" className="ms-2" onClick={handleRefresh}>
          <FiRefreshCw className="me-1" />
          Retry
        </Button>
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <Alert variant="info">
        <FiActivity className="me-2" />
        No performance data available
      </Alert>
    );
  }

  const { system, database, application, alerts, health, thresholds } = dashboardData;

  return (
    <div className="performance-dashboard">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>
          <FiServer className="me-2" />
          Performance Dashboard
        </h4>
        <div className="d-flex align-items-center">
          <Badge bg={getHealthStatusColor(health.status)} className="me-3">
            {health.status.toUpperCase()}
          </Badge>
          <small className="text-muted me-3">
            Last updated: {lastRefresh?.toLocaleTimeString()}
          </small>
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="me-2"
          >
            <FiRefreshCw className={`me-1 ${loading ? 'spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant={autoRefresh ? "primary" : "outline-secondary"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <FiWifi className="me-1" />
            Auto
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card className="mb-4">
        <CardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <FiActivity className="me-2" />
              System Health
            </h5>
            <div className="d-flex align-items-center">
              <Badge bg="info" className="me-2">
                Uptime: {health.uptime}
              </Badge>
              <Badge bg="secondary">
                v{health.version}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={3}>
              <div className="text-center">
                <h3 className="text-success mb-1">
                  <FiCheckCircle />
                </h3>
                <h6>System Status</h6>
                <Badge bg={getHealthStatusColor(health.status)}>
                  {health.status.toUpperCase()}
                </Badge>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <h3 className="text-info mb-1">
                  <FiUsers />
                </h3>
                <h6>Active Users</h6>
                <div className="h4">{application.activeUsers}</div>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <h3 className="text-primary mb-1">
                  <FiBarChart2 />
                </h3>
                <h6>Requests/sec</h6>
                <div className="h4">{application.requestsPerSecond.toFixed(1)}</div>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <h3 className="text-warning mb-1">
                  <FiClock />
                </h3>
                <h6>Avg Response</h6>
                <div className="h4">{Math.round(application.averageResponseTime)}ms</div>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Alerts Section */}
      {alerts.critical.length > 0 && (
        <Alert variant="danger" className="mb-4">
          <h5>
            <FiAlertTriangle className="me-2" />
            Critical Alerts ({alerts.critical.length})
          </h5>
          <div className="mt-2">
            {alerts.critical.map((alert, index) => (
              <div key={index} className="border-bottom pb-2 mb-2">
                <strong>{alert.type.toUpperCase()}:</strong> {alert.message}
                <br />
                <small className="text-muted">
                  Value: {alert.value} | Threshold: {alert.threshold} | 
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </small>
              </div>
            ))}
          </div>
        </Alert>
      )}

      {alerts.warning.length > 0 && (
        <Alert variant="warning" className="mb-4">
          <h5>
            <FiAlertTriangle className="me-2" />
            Warnings ({alerts.warning.length})
          </h5>
          <div className="mt-2">
            {alerts.warning.map((alert, index) => (
              <div key={index} className="border-bottom pb-2 mb-2">
                <strong>{alert.type.toUpperCase()}:</strong> {alert.message}
                <br />
                <small className="text-muted">
                  Value: {alert.value} | Threshold: {alert.threshold} | 
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </small>
              </div>
            ))}
          </div>
        </Alert>
      )}

      {/* System Resources */}
      <Row className="mb-4">
        <Col md={4}>
          <Card>
            <CardHeader>
              <h6 className="mb-0">
                <FiCpu className="me-2" />
                CPU Usage
              </h6>
            </CardHeader>
            <CardBody>
              <div className="mb-3">
                <ProgressBar 
                  variant={getUsageColor(system.cpuUsage.percentage)}
                  now={system.cpuUsage.percentage}
                  label={`${system.cpuUsage.percentage}%`}
                />
              </div>
              <div className="small text-muted">
                <div>Load Average:</div>
                <div>1min: {system.loadAverage[0]?.toFixed(2)}</div>
                <div>5min: {system.loadAverage[1]?.toFixed(2)}</div>
                <div>15min: {system.loadAverage[2]?.toFixed(2)}</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <CardHeader>
              <h6 className="mb-0">
                <FiHardDrive className="me-2" />
                Memory Usage
              </h6>
            </CardHeader>
            <CardBody>
              <div className="mb-3">
                <ProgressBar 
                  variant={getUsageColor(system.memoryUsage.percentage)}
                  now={system.memoryUsage.percentage}
                  label={`${system.memoryUsage.percentage}%`}
                />
              </div>
              <div className="small text-muted">
                <div>Used: {formatBytes(system.memoryUsage.used)}</div>
                <div>Free: {formatBytes(system.memoryUsage.free)}</div>
                <div>Total: {formatBytes(system.memoryUsage.total)}</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <CardHeader>
              <h6 className="mb-0">
                <FiDatabase className="me-2" />
                Database
              </h6>
            </CardHeader>
            <CardBody>
              <div className="mb-2">
                <Badge bg={database.connectionStatus === 'connected' ? 'success' : 'danger'}>
                  {database.connectionStatus.toUpperCase()}
                </Badge>
              </div>
              <div className="small text-muted">
                <div>Collections: {database.collections.count}</div>
                <div>Documents: {database.collections.totalDocuments.toLocaleString()}</div>
                <div>Size: {database.collections.totalSize} MB</div>
                <div>Avg Query: {database.queryPerformance.averageTime}ms</div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Application Performance */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <CardHeader>
              <h6 className="mb-0">
                <FiActivity className="me-2" />
                Application Performance
              </h6>
            </CardHeader>
            <CardBody>
              <Row>
                <Col md={6}>
                  <div className="mb-3">
                    <strong>Error Rate</strong>
                    <ProgressBar 
                      variant={getUsageColor(application.errorRate, { warning: 5, critical: 10 })}
                      now={application.errorRate}
                      label={`${application.errorRate.toFixed(1)}%`}
                      className="mt-1"
                    />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <strong>Avg Response Time</strong>
                    <ProgressBar 
                      variant={getUsageColor(application.averageResponseTime / 10, { warning: 200, critical: 500 })}
                      now={Math.min(100, application.averageResponseTime / 10)}
                      label={`${Math.round(application.averageResponseTime)}ms`}
                      className="mt-1"
                    />
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <div className="mb-3">
                    <strong>Throughput</strong>
                    <div className="h5">{application.throughput} req/min</div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <strong>Active Sessions</strong>
                    <div className="h5">{application.activeSessions}</div>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <CardHeader>
              <h6 className="mb-0">
                <FiDatabase className="me-2" />
                Database Performance
              </h6>
            </CardHeader>
            <CardBody>
              <Row>
                <Col md={6}>
                  <div className="mb-3">
                    <strong>Connection Pool</strong>
                    <div className="small text-muted">
                      <div>Active: {database.connectionPool.active}</div>
                      <div>Idle: {database.connectionPool.idle}</div>
                      <div>Total: {database.connectionPool.total}</div>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <strong>Query Performance</strong>
                    <div className="small text-muted">
                      <div>Avg Time: {database.queryPerformance.averageTime}ms</div>
                      <div>Slow Queries: {database.queryPerformance.slowQueries}</div>
                      <div>Error Queries: {database.queryPerformance.errorQueries}</div>
                    </div>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <div className="mb-3">
                    <strong>Database Stats</strong>
                    <div className="small text-muted">
                      <div>Collections: {database.collections.count}</div>
                      <div>Total Documents: {database.collections.totalDocuments.toLocaleString()}</div>
                      <div>Total Size: {database.collections.totalSize} MB</div>
                      <div>Indexes: {database.collections.indexes}</div>
                    </div>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Thresholds Information */}
      <Card>
        <CardHeader>
          <h6 className="mb-0">
            <FiSettings className="me-2" />
            Performance Thresholds
          </h6>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={3}>
              <strong>Memory</strong>
              <div className="small text-muted">
                Warning: {thresholds.memory.warning}% | Critical: {thresholds.memory.critical}%
              </div>
            </Col>
            <Col md={3}>
              <strong>CPU</strong>
              <div className="small text-muted">
                Warning: {thresholds.cpu.warning}% | Critical: {thresholds.cpu.critical}%
              </div>
            </Col>
            <Col md={3}>
              <strong>Response Time</strong>
              <div className="small text-muted">
                Warning: {thresholds.responseTime.warning}ms | Critical: {thresholds.responseTime.critical}ms
              </div>
            </Col>
            <Col md={3}>
              <strong>Error Rate</strong>
              <div className="small text-muted">
                Warning: {thresholds.errorRate.warning}% | Critical: {thresholds.errorRate.critical}%
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </div>
  );
};

export default PerformanceDashboard;
