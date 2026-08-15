const API_BASE = '/api';
let tokenProvider = null;

export const setTokenProvider = (provider) => {
  tokenProvider = provider;
};

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (tokenProvider) {
    const token = await tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'omit',
    headers,
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
  sync: (payload) => request('/auth/sync', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  dashboard: () => request('/dashboard/summary'),
  branches: () => request('/branches'),
  createBranch: (payload) => request('/branches', { method: 'POST', body: JSON.stringify(payload) }),
  updateBranch: (id, payload) => request(`/branches/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  users: () => request('/users'),
  createUser: (payload) => request('/users', { method: 'POST', body: JSON.stringify(payload) }),
  removeUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  courses: (branchId) => request(`/courses${branchId ? `?branch_id=${encodeURIComponent(branchId)}` : ''}`),
  createCourse: (payload) => request('/courses', { method: 'POST', body: JSON.stringify(payload) }),
  updateCourse: (id, payload) => request(`/courses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  disableCourse: (id) => request(`/courses/${id}`, { method: 'DELETE' }),
  students: (branchId) => request(`/students${branchId ? `?branch_id=${encodeURIComponent(branchId)}` : ''}`),
  createStudent: (payload) => request('/students', { method: 'POST', body: JSON.stringify(payload) }),
  updateStudent: (id, payload) => request(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deactivateStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),
  accounts: (studentId) => request(`/billing/accounts${studentId ? `?student_id=${encodeURIComponent(studentId)}` : ''}`),
  createEnrollment: (payload) => request('/billing/enrollments', { method: 'POST', body: JSON.stringify(payload) }),
  receivePayment: (payload) => request('/billing/payments', { method: 'POST', body: JSON.stringify(payload) }),
  expenses: (branchId) => request(`/expenses${branchId ? `?branch_id=${encodeURIComponent(branchId)}` : ''}`),
  createExpense: (payload) => request('/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
};
