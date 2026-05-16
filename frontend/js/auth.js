// Authentication utilities
function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

function requireAdmin() {
    const user = getUser();
    if (!isAuthenticated() || user?.role !== 'admin') {
        window.location.href = '/dashboard';
        return false;
    }
    return true;
}

function redirectBasedOnRole(user) {
    if (user.role === 'admin') {
        window.location.href = '/admin';
    } else {
        window.location.href = '/dashboard';
    }
}