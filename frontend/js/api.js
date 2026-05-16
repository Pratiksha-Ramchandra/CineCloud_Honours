// API Configuration — use backend origin so port mismatches won't break auth
const API_URL = '/api';

// Get token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Set token in headers
function setAuthHeader() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// API calls
const api = {
    // Auth
    async register(userData) {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return response.json();
    },

    async login(credentials) {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        return response.json();
    },

    async getMe() {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: setAuthHeader()
        });
        return response.json();
    },

    async changePassword(data) {
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'PUT',
            headers: setAuthHeader(),
            body: JSON.stringify(data)
        });
        return response.json();
    },

    // Movies
    async getMovies() {
        const response = await fetch(`${API_URL}/movies`);
        return response.json();
    },

    async getMovieDetails(id) {
        const response = await fetch(`${API_URL}/movies/${id}`);
        return response.json();
    },

    async getShowtimeSeats(showtimeId) {
        const response = await fetch(`${API_URL}/movies/showtime/${showtimeId}/seats`);
        return response.json();
    },

    async createMovie(data) {
        const response = await fetch(`${API_URL}/movies`, {
            method: 'POST',
            headers: setAuthHeader(),
            body: JSON.stringify(data)
        });
        return response.json();
    },

    // Bookings
    async createBooking(data) {
        const response = await fetch(`${API_URL}/bookings/create`, {
            method: 'POST',
            headers: setAuthHeader(),
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async getMyBookings() {
        const response = await fetch(`${API_URL}/bookings/my-bookings`, {
            headers: setAuthHeader()
        });
        return response.json();
    },

    async cancelBooking(bookingId) {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
            method: 'PUT',
            headers: setAuthHeader()
        });
        return response.json();
    },

    // Admin
    async getAdminStats() {
        const response = await fetch(`${API_URL}/admin/dashboard/stats`, {
            headers: setAuthHeader()
        });
        return response.json();
    },

    async getAllBookings() {
        const response = await fetch(`${API_URL}/admin/bookings`, {
            headers: setAuthHeader()
        });
        return response.json();
    },

    async getAllShowtimes() {
        const response = await fetch(`${API_URL}/admin/showtimes`, {
            headers: setAuthHeader()
        });
        return response.json();
    },

    async getTheaters() {
        const response = await fetch(`${API_URL}/admin/theaters`, {
            headers: setAuthHeader()
        });
        return response.json();
    },

    async createShowtime(data) {
        const response = await fetch(`${API_URL}/admin/showtimes`, {
            method: 'POST',
            headers: setAuthHeader(),
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async updateShowtime(showtimeId, data) {
        const response = await fetch(`${API_URL}/admin/showtimes/${showtimeId}`, {
            method: 'PUT',
            headers: setAuthHeader(),
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async freeShowtime(showtimeId) {
        const response = await fetch(`${API_URL}/admin/showtimes/${showtimeId}/free`, {
            method: 'PUT',
            headers: setAuthHeader()
        });
        return response.json();
    },

    async getAllUsers() {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: setAuthHeader()
        });
        return response.json();
    }
};