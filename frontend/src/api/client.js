const API_BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(data?.error || 'Request failed');
    error.details = data?.details;
    throw error;
  }

  return data;
}

export const api = {
  me: () => request('/auth/me'),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  dashboard: () => request('/dashboard/summary'),
  branches: () => request('/branches'),
  createBranch: (payload) => request('/branches', { method: 'POST', body: JSON.stringify(payload) }),
  updateBranch: (id, payload) => request(`/branches/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  courses: (branchId) => request(`/courses${branchId ? `?branch_id=${branchId}` : ''}`),
  createCourse: (payload) => request('/courses', { method: 'POST', body: JSON.stringify(payload) }),
  updateCourse: (id, payload) => request(`/courses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  disableCourse: (id) => request(`/courses/${id}`, { method: 'DELETE' }),
  students: (branchId) => request(`/students${branchId ? `?branch_id=${branchId}` : ''}`),
  createStudent: (payload) => request('/students', { method: 'POST', body: JSON.stringify(payload) }),
  accounts: (studentId) => request(`/billing/accounts${studentId ? `?student_id=${studentId}` : ''}`),
  createEnrollment: (payload) => request('/billing/enrollments', { method: 'POST', body: JSON.stringify(payload) }),
  receivePayment: (payload) => request('/billing/payments', { method: 'POST', body: JSON.stringify(payload) }),
};
