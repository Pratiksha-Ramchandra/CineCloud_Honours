/**
 * CineCloud Booking Console
 * Main Application File
 * Handles routing, initialization, and core functionality
 */

// ==================== GLOBAL STATE ====================
const AppState = {
    currentUser: null,
    currentPage: 'dashboard',
    selectedMovie: null,
    selectedShowtime: null,
    selectedSeats: [],
    bookingStep: 1,
    isLoading: false
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
        AppState.currentUser = JSON.parse(savedUser);
        // Verify token with server
        try {
            const user = await api.getMe();
            AppState.currentUser = user;
            localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
            // Token expired or invalid
            logout();
            return;
        }
    }
    
    // Initialize the app
    initRouter();
});

// ==================== ROUTER ====================
function initRouter() {
    // Handle navigation
    window.addEventListener('popstate', handleRouteChange);
    handleRouteChange();
}

function handleRouteChange() {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    
    // Check authentication for protected routes
    const protectedRoutes = ['/dashboard', '/movies', '/movie-details', '/seat-selection', '/payment', '/bookings', '/profile', '/admin'];
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
    
    if (isProtectedRoute && !isAuthenticated()) {
        navigateTo('/login');
        return;
    }
    
    // Admin route protection
    if (path.startsWith('/admin') && !isAdmin()) {
        navigateTo('/dashboard');
        return;
    }
    
    // Route handling
    switch (path) {
        case '/':
        case '/dashboard':
            renderDashboard();
            break;
        case '/login':
            renderLogin();
            break;
        case '/register':
            renderRegister();
            break;
        case '/movies':
            renderMovies();
            break;
        case '/movie-details':
            const movieId = params.get('id');
            if (movieId) {
                renderMovieDetails(movieId);
            } else {
                navigateTo('/movies');
            }
            break;
        case '/seat-selection':
            const showtimeId = params.get('showtimeId');
            const price = params.get('price');
            if (showtimeId && price) {
                renderSeatSelection(showtimeId, price);
            } else {
                navigateTo('/movies');
            }
            break;
        case '/payment':
            renderPayment();
            break;
        case '/bookings':
            renderBookings();
            break;
        case '/profile':
            renderProfile();
            break;
        case '/admin':
            renderAdminDashboard();
            break;
        default:
            navigateTo('/dashboard');
    }
}

// Navigation helper
function navigateTo(path, replace = false) {
    if (replace) {
        window.location.replace(path);
    } else {
        window.history.pushState({}, '', path);
        handleRouteChange();
    }
}

// ==================== RENDER FUNCTIONS ====================

// Render Login Page
function renderLogin() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                <div class="text-center mb-8">
                    <i class="fas fa-film text-5xl text-blue-600 mb-3"></i>
                    <h1 class="text-3xl font-bold text-gray-800">CineCloud</h1>
                    <p class="text-gray-500 mt-2">Welcome back!</p>
                </div>
                
                <div id="errorMessage" class="hidden mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm"></div>
                
                <form id="loginForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input type="email" id="email" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" id="password" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Sign In
                    </button>
                </form>
                
                <p class="text-center text-gray-600 mt-6">
                    Don't have an account? 
                    <a href="/register" class="text-blue-600 hover:text-blue-700 font-medium">Sign up</a>
                </p>
                
                <div class="mt-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-500">
                    <p class="font-semibold mb-1">Demo Accounts:</p>
                    <p>Admin: admin@cinecloud.com / admin123</p>
                    <p>Customer: john@example.com / john123</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const result = await api.login({ email, password });
        
        if (result.error) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = result.error;
            errorDiv.classList.remove('hidden');
        } else {
            setAuth(result.token, result.user);
            AppState.currentUser = result.user;
            redirectBasedOnRole(result.user);
        }
    });
}

// Render Register Page
function renderRegister() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                <div class="text-center mb-8">
                    <i class="fas fa-film text-5xl text-blue-600 mb-3"></i>
                    <h1 class="text-3xl font-bold text-gray-800">Create Account</h1>
                    <p class="text-gray-500 mt-2">Join CineCloud today</p>
                </div>
                
                <div id="errorMessage" class="hidden mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm"></div>
                
                <form id="registerForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input type="text" id="name" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input type="email" id="email" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input type="tel" id="phone" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" id="password" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <input type="password" id="confirmPassword" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Sign Up
                    </button>
                </form>
                
                <p class="text-center text-gray-600 mt-6">
                    Already have an account? 
                    <a href="/login" class="text-blue-600 hover:text-blue-700 font-medium">Sign in</a>
                </p>
            </div>
        </div>
    `;
    
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        const userData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password: password,
            phone: document.getElementById('phone').value
        };
        
        const result = await api.register(userData);
        
        if (result.error) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = result.error;
            errorDiv.classList.remove('hidden');
        } else {
            setAuth(result.token, result.user);
            AppState.currentUser = result.user;
            navigateTo('/dashboard');
        }
    });
}

// Render Dashboard
async function renderDashboard() {
    const app = document.getElementById('app');
    if (!app) return;
    
    AppState.isLoading = true;
    app.innerHTML = `
        ${renderNavbar('dashboard')}
        <div class="container mx-auto px-4 py-8">
            <div class="text-center py-12">
                <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
                <p class="mt-2 text-gray-500">Loading...</p>
            </div>
        </div>
    `;
    
    try {
        const movies = await api.getMovies();
        const bookings = await api.getMyBookings();
        
        const stats = {
            totalMovies: movies.length,
            totalBookings: bookings.length,
            totalSpent: bookings.reduce((sum, b) => sum + b.total_amount, 0)
        };
        
        app.innerHTML = `
            ${renderNavbar('dashboard')}
            <div class="container mx-auto px-4 py-8">
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
                    <h1 class="text-3xl font-bold mb-2">Welcome back, ${AppState.currentUser.name}! 🎬</h1>
                    <p class="text-blue-100">Discover the latest movies and book your tickets instantly.</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white rounded-xl p-6 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">Movies Available</p>
                                <p class="text-2xl font-bold">${stats.totalMovies}</p>
                            </div>
                            <i class="fas fa-film text-3xl text-blue-500"></i>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-6 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">Total Bookings</p>
                                <p class="text-2xl font-bold">${stats.totalBookings}</p>
                            </div>
                            <i class="fas fa-ticket-alt text-3xl text-green-500"></i>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-6 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">Total Spent</p>
                                <p class="text-2xl font-bold">₹${stats.totalSpent}</p>
                            </div>
                            <i class="fas fa-rupee-sign text-3xl text-purple-500"></i>
                        </div>
                    </div>
                </div>
                
                <div class="mb-8">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold">Now Showing</h2>
                        <a href="/movies" class="text-blue-600 hover:text-blue-700">View All →</a>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" id="moviesGrid"></div>
                </div>
            </div>
        `;
        
        const moviesGrid = document.getElementById('moviesGrid');
        movies.slice(0, 6).forEach(movie => {
            moviesGrid.innerHTML += `
                <div onclick="viewMovie('${movie.id}')" class="movie-card bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer">
                    <img src="${movie.poster_url}" alt="${movie.title}" class="w-full h-48 object-cover">
                    <div class="p-3">
                        <h3 class="font-semibold text-sm truncate">${movie.title}</h3>
                        <p class="text-gray-500 text-xs">${movie.genre}</p>
                        <p class="text-gray-500 text-xs">${movie.duration} min</p>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        app.innerHTML = `
            ${renderNavbar('dashboard')}
            <div class="container mx-auto px-4 py-8">
                <div class="bg-red-100 text-red-700 p-4 rounded-lg text-center">
                    Failed to load dashboard. Please try again.
                </div>
            </div>
        `;
    } finally {
        AppState.isLoading = false;
    }
}

// Render Movies Page
async function renderMovies() {
    const app = document.getElementById('app');
    if (!app) return;
    
    AppState.isLoading = true;
    app.innerHTML = `
        ${renderNavbar('movies')}
        <div class="container mx-auto px-4 py-8">
            <div class="text-center py-12">
                <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
                <p class="mt-2 text-gray-500">Loading movies...</p>
            </div>
        </div>
    `;
    
    try {
        const movies = await api.getMovies();
        
        app.innerHTML = `
            ${renderNavbar('movies')}
            <div class="container mx-auto px-4 py-8">
                <div class="flex flex-col md:flex-row justify-between items-center mb-8">
                    <h1 class="text-3xl font-bold mb-4 md:mb-0">Now Showing</h1>
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="searchInput" placeholder="Search movies..." class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" id="moviesGrid"></div>
            </div>
        `;
        
        function renderMoviesGrid(filteredMovies) {
            const grid = document.getElementById('moviesGrid');
            if (!grid) return;
            
            if (filteredMovies.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-12">
                        <i class="fas fa-film text-4xl text-gray-400 mb-3"></i>
                        <p class="text-gray-500">No movies found</p>
                    </div>
                `;
                return;
            }
            
            grid.innerHTML = filteredMovies.map(movie => `
                <div onclick="viewMovie('${movie.id}')" class="movie-card bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer">
                    <img src="${movie.poster_url}" alt="${movie.title}" class="w-full h-64 object-cover">
                    <div class="p-4">
                        <h3 class="font-bold text-lg mb-1">${movie.title}</h3>
                        <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <span>${movie.genre}</span>
                            <span>•</span>
                            <span>${movie.duration} min</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span></span>
                            <span class="text-blue-600 font-semibold">Book Now →</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        renderMoviesGrid(movies);
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filtered = movies.filter(m => 
                    m.title.toLowerCase().includes(searchTerm) || 
                    m.genre.toLowerCase().includes(searchTerm)
                );
                renderMoviesGrid(filtered);
            });
        }
    } catch (error) {
        console.error('Failed to load movies:', error);
        app.innerHTML = `
            ${renderNavbar('movies')}
            <div class="container mx-auto px-4 py-8">
                <div class="bg-red-100 text-red-700 p-4 rounded-lg text-center">
                    Failed to load movies. Please try again.
                </div>
            </div>
        `;
    } finally {
        AppState.isLoading = false;
    }
}

// Render Movie Details
async function renderMovieDetails(movieId) {
    const app = document.getElementById('app');
    if (!app) return;
    
    AppState.isLoading = true;
    app.innerHTML = `
        ${renderNavbar('movies')}
        <div class="container mx-auto px-4 py-8">
            <div class="text-center py-12">
                <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
                <p class="mt-2 text-gray-500">Loading movie details...</p>
            </div>
        </div>
    `;
    
    try {
        const data = await api.getMovieDetails(movieId);
        const movie = data;
        const showtimes = data.showtimes || [];
        
        app.innerHTML = `
            ${renderNavbar('movies')}
            <div class="container mx-auto px-4 py-8">
                <button onclick="window.history.back()" class="flex items-center text-gray-600 hover:text-gray-800 mb-4">
                    <i class="fas fa-arrow-left mr-2"></i>Back to Movies
                </button>
                
                <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
                    <div class="md:flex">
                        <div class="md:w-1/3">
                            <img src="${movie.poster_url}" alt="${movie.title}" class="w-full h-auto">
                            ${movie.trailer_url ? `
                            <div class="mt-4">
                                <h2 class="text-lg font-semibold mb-2">Trailer</h2>
                                <video controls class="w-full rounded-lg shadow-sm">
                                    <source src="${movie.trailer_url}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                            ` : ''}
                        </div>
                        <div class="md:w-2/3 p-6">
                            <h1 class="text-3xl font-bold mb-2">${movie.title}</h1>
                            <div class="flex flex-wrap gap-4 mb-4 text-sm text-gray-600">
                                <span>${movie.duration} min</span>
                                <span>${movie.language}</span>
                                <span>${movie.genre}</span>
                            </div>
                            <p class="text-gray-700 mb-4">${movie.description}</p>
                            <div class="text-sm text-gray-500">
                                <i class="fas fa-calendar mr-2"></i>Release Date: ${new Date(movie.release_date).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-xl font-bold mb-4">Select Showtime</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3" id="showtimesGrid"></div>
                </div>
            </div>
        `;
        
        const showtimesGrid = document.getElementById('showtimesGrid');
        if (showtimes.length === 0) {
            showtimesGrid.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">No showtimes available</p>';
        } else {
            showtimesGrid.innerHTML = showtimes.map(showtime => `
                <button onclick="selectShowtime('${showtime.id}', ${showtime.price})" class="border rounded-lg p-3 text-left hover:border-blue-500 transition-all hover:shadow-md">
                    <div class="font-semibold">${new Date(showtime.show_date).toLocaleDateString()}</div>
                    <div class="text-sm text-gray-600"><i class="far fa-clock mr-1"></i>${showtime.show_time}</div>
                    <div class="text-sm font-semibold text-blue-600 mt-1">₹${showtime.price}</div>
                    <div class="text-xs text-gray-500">${showtime.available_seats} seats left</div>
                    <div class="text-xs text-gray-400 mt-1"><i class="fas fa-building mr-1"></i>${showtime.theater_name}</div>
                </button>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load movie details:', error);
        app.innerHTML = `
            ${renderNavbar('movies')}
            <div class="container mx-auto px-4 py-8">
                <div class="bg-red-100 text-red-700 p-4 rounded-lg text-center">
                    Failed to load movie details. Please try again.
                </div>
            </div>
        `;
    } finally {
        AppState.isLoading = false;
    }
}

// Render Seat Selection
async function renderSeatSelection(showtimeId, price) {
    const app = document.getElementById('app');
    if (!app) return;
    
    AppState.isLoading = true;
    app.innerHTML = `
        ${renderNavbar('movies')}
        <div class="container mx-auto px-4 py-8">
            <div class="text-center py-12">
                <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
                <p class="mt-2 text-gray-500">Loading seat map...</p>
            </div>
        </div>
    `;
    
    try {
        const data = await api.getShowtimeSeats(showtimeId);
        const seatsData = data.seats;
        let selectedSeats = [];
        
        app.innerHTML = `
            ${renderNavbar('movies')}
            <div class="container mx-auto px-4 py-8">
                <button onclick="window.history.back()" class="flex items-center text-gray-600 hover:text-gray-800 mb-4">
                    <i class="fas fa-arrow-left mr-2"></i>Back to Movie
                </button>
                
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold">Select Your Seats</h2>
                        <div class="text-right">
                            <p class="text-sm text-gray-600">Showtime: ${data.showtime.show_date} at ${data.showtime.show_time}</p>
                            <p class="text-sm font-semibold text-blue-600">₹${price} per seat</p>
                        </div>
                    </div>
                    
                    <div class="mb-6">
                        <div class="text-center mb-6">
                            <div class="inline-block bg-gray-800 text-white px-12 py-3 rounded-lg"><i class="fas fa-tv mr-2"></i>SCREEN</div>
                        </div>
                        <div class="seat-grid" id="seatsGrid"></div>
                    </div>
                    
                    <div class="flex justify-center gap-6 mb-6">
                        <div class="flex items-center"><div class="w-6 h-6 bg-blue-100 rounded mr-2"></div><span class="text-sm">Available</span></div>
                        <div class="flex items-center"><div class="w-6 h-6 bg-green-500 rounded mr-2"></div><span class="text-sm">Selected</span></div>
                        <div class="flex items-center"><div class="w-6 h-6 bg-gray-300 rounded mr-2"></div><span class="text-sm">Booked</span></div>
                    </div>
                    
                    <div id="bookingSummary" class="hidden border-t pt-4"></div>
                </div>
            </div>
        `;
        
        function renderSeats() {
            const grid = document.getElementById('seatsGrid');
            if (!grid) return;
            
            grid.innerHTML = seatsData.map(seat => {
                const isSelected = selectedSeats.includes(seat.id);
                let seatClass = 'seat ';
                if (seat.is_booked) seatClass += 'booked';
                else if (isSelected) seatClass += 'selected';
                else seatClass += 'available';
                
                return `
                    <button onclick="toggleSeat('${seat.id}')" 
                        class="${seatClass}" 
                        ${seat.is_booked ? 'disabled' : ''}>
                        ${seat.id}
                    </button>
                `;
            }).join('');
            
            updateSummary();
        }
        
        window.toggleSeat = (seatId) => {
            const seat = seatsData.find(s => s.id === seatId);
            if (seat.is_booked) return;
            
            if (selectedSeats.includes(seatId)) {
                selectedSeats = selectedSeats.filter(s => s !== seatId);
            } else {
                selectedSeats.push(seatId);
            }
            renderSeats();
        };
        
        function updateSummary() {
            const summaryDiv = document.getElementById('bookingSummary');
            if (!summaryDiv) return;
            
            if (selectedSeats.length > 0) {
                const totalAmount = selectedSeats.length * price;
                summaryDiv.classList.remove('hidden');
                summaryDiv.innerHTML = `
                    <div class="flex justify-between items-center mb-4">
                        <div>
                            <span class="font-semibold">Selected Seats: </span>
                            <span>${selectedSeats.join(', ')}</span>
                            <span class="ml-4 text-sm text-gray-500">(${selectedSeats.length} tickets)</span>
                        </div>
                        <div>
                            <span class="font-semibold">Total: </span>
                            <span class="text-2xl font-bold text-blue-600">₹${totalAmount}</span>
                        </div>
                    </div>
                    <button onclick="proceedToPayment()" class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        Proceed to Payment
                    </button>
                `;
            } else {
                summaryDiv.classList.add('hidden');
            }
        }
        
        window.proceedToPayment = () => {
            localStorage.setItem('selectedSeats', JSON.stringify(selectedSeats));
            localStorage.setItem('showtimeId', showtimeId);
            localStorage.setItem('totalAmount', selectedSeats.length * price);
            navigateTo(`/payment`);
        };
        
        renderSeats();
    } catch (error) {
        console.error('Failed to load seats:', error);
        app.innerHTML = `
            ${renderNavbar('movies')}
            <div class="container mx-auto px-4 py-8">
                <div class="bg-red-100 text-red-700 p-4 rounded-lg text-center">
                    Failed to load seat map. Please try again.
                </div>
            </div>
        `;
    } finally {
        AppState.isLoading = false;
    }
}

// Render Payment
async function renderPayment() {
    const app = document.getElementById('app');
    if (!app) return;
    
    const showtimeId = localStorage.getItem('showtimeId');
    const selectedSeats = JSON.parse(localStorage.getItem('selectedSeats') || '[]');
    const totalAmount = localStorage.getItem('totalAmount');
    const pricePerSeat = totalAmount / selectedSeats.length;
    
    app.innerHTML = `
        ${renderNavbar('movies')}
        <div class="container mx-auto px-4 py-8">
            <button onclick="window.history.back()" class="flex items-center text-gray-600 hover:text-gray-800 mb-4">
                <i class="fas fa-arrow-left mr-2"></i>Back to Seats
            </button>
            
            <div class="max-w-2xl mx-auto">
                <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 class="text-xl font-bold mb-4">Payment Summary</h2>
                    <div class="space-y-3">
                        <div class="flex justify-between py-2 border-b">
                            <span class="text-gray-600">Tickets</span>
                            <span class="font-medium">${selectedSeats.length} seats</span>
                        </div>
                        <div class="flex justify-between py-2 border-b">
                            <span class="text-gray-600">Seats</span>
                            <span class="font-medium">${selectedSeats.join(', ')}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b">
                            <span class="text-gray-600">Price per seat</span>
                            <span class="font-medium">₹${pricePerSeat}</span>
                        </div>
                        <div class="flex justify-between py-2 text-lg font-bold">
                            <span>Total Amount</span>
                            <span class="text-blue-600">₹${totalAmount}</span>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <h3 class="font-semibold mb-4">Payment Method</h3>
                    <div class="space-y-3">
                        <div class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50" onclick="selectPayment('card')">
                            <input type="radio" name="payment" value="card" class="mr-3" checked>
                            <i class="fab fa-cc-visa text-2xl text-blue-600 mr-3"></i>
                            <div>
                                <p class="font-medium">Credit/Debit Card</p>
                                <p class="text-xs text-gray-500">Visa, Mastercard, RuPay</p>
                            </div>
                        </div>
                        <div class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50" onclick="selectPayment('upi')">
                            <input type="radio" name="payment" value="upi" class="mr-3">
                            <i class="fab fa-google-pay text-2xl text-green-600 mr-3"></i>
                            <div>
                                <p class="font-medium">UPI / Google Pay</p>
                                <p class="text-xs text-gray-500">Instant payment</p>
                            </div>
                        </div>
                    </div>
                    
                    <button onclick="processPayment()" id="payBtn" class="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="fas fa-lock mr-2"></i>Pay Now
                    </button>
                </div>
            </div>
        </div>
    `;
    
    window.selectPayment = (method) => {
        document.querySelectorAll('input[name="payment"]').forEach(input => {
            input.checked = input.value === method;
        });
    };
    
    window.processPayment = async () => {
        const btn = document.getElementById('payBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        
        const result = await api.createBooking({
            showtimeId,
            seats: selectedSeats
        });
        
        if (result.error) {
            alert('Payment failed: ' + result.error);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-lock mr-2"></i>Pay Now';
        } else {
            alert(`Booking Confirmed!\nBooking ID: ${result.bookingId}\nTotal Amount: ₹${result.totalAmount}`);
            localStorage.removeItem('selectedSeats');
            localStorage.removeItem('showtimeId');
            localStorage.removeItem('totalAmount');
            navigateTo('/bookings');
        }
    };
}

// Render Bookings
async function renderBookings() {
    const app = document.getElementById('app');
    if (!app) return;
    
    AppState.isLoading = true;
    app.innerHTML = `
        ${renderNavbar('bookings')}
        <div class="container mx-auto px-4 py-8">
            <div class="text-center py-12">
                <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
                <p class="mt-2 text-gray-500">Loading bookings...</p>
            </div>
        </div>
    `;
    
    try {
        const bookings = await api.getMyBookings();
        
        if (bookings.length === 0) {
            app.innerHTML = `
                ${renderNavbar('bookings')}
                <div class="container mx-auto px-4 py-8">
                    <div class="text-center py-12">
                        <i class="fas fa-ticket-alt text-6xl text-gray-300 mb-4"></i>
                        <h2 class="text-2xl font-semibold text-gray-600">No Bookings Yet</h2>
                        <p class="text-gray-500 mt-2">Book your first movie ticket now!</p>
                        <a href="/movies" class="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Browse Movies</a>
                    </div>
                </div>
            `;
            return;
        }
        
        let bookingsHtml = `
            ${renderNavbar('bookings')}
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-3xl font-bold mb-8">My Bookings</h1>
                <div class="space-y-4">
        `;
        
        bookings.forEach(booking => {
            bookingsHtml += `
                <div class="booking-card bg-white rounded-xl shadow-sm overflow-hidden">
                    <div class="p-4">
                        <div class="flex flex-wrap justify-between items-start gap-4">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-3">
                                    <h3 class="text-xl font-bold">${booking.movie_title}</h3>
                                    <span class="px-2 py-1 text-xs rounded-full ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${booking.status.toUpperCase()}
                                    </span>
                                </div>
                                <div class="space-y-2 text-gray-600">
                                    <div><i class="fas fa-calendar w-5"></i> ${new Date(booking.show_date).toLocaleDateString()}</div>
                                    <div><i class="fas fa-clock w-5"></i> ${booking.show_time}</div>
                                    <div><i class="fas fa-building w-5"></i> ${booking.theater_name}</div>
                                    <div><i class="fas fa-ticket-alt w-5"></i> Seats: ${booking.seats.join(', ')}</div>
                                    <div><i class="fas fa-receipt w-5"></i> Booking ID: ${booking.booking_id}</div>
                                    <div><span class="font-semibold">Amount:</span> <span class="text-lg font-bold text-blue-600">₹${booking.total_amount}</span></div>
                                </div>
                            </div>
                            ${booking.status === 'confirmed' ? `
                                <button onclick="cancelBooking('${booking.booking_id}')" class="text-red-600 hover:text-red-800">
                                    <i class="fas fa-times-circle text-2xl"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        bookingsHtml += `
                </div>
            </div>
        `;
        
        app.innerHTML = bookingsHtml;
        
        window.cancelBooking = async (bookingId) => {
            if (confirm('Are you sure you want to cancel this booking?')) {
                const result = await api.cancelBooking(bookingId);
                if (result.error) {
                    alert('Failed to cancel: ' + result.error);
                } else {
                    alert('Booking cancelled successfully');
                    renderBookings();
                }
            }
        };
    } catch (error) {
        console.error('Failed to load bookings:', error);
        app.innerHTML = `
            ${renderNavbar('bookings')}
            <div class="container mx-auto px-4 py-8">
                <div class="bg-red-100 text-red-700 p-4 rounded-lg text-center">
                    Failed to load bookings. Please try again.
                </div>
            </div>
        `;
    } finally {
        AppState.isLoading = false;
    }
}

// Render Profile
async function renderProfile() {
    const app = document.getElementById('app');
    if (!app) return;
    
    let showPasswordForm = false;
    
    app.innerHTML = `
        ${renderNavbar('profile')}
        <div class="container mx-auto px-4 py-8">
            <div class="max-w-2xl mx-auto">
                <h1 class="text-3xl font-bold mb-8">My Profile</h1>
                
                <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div class="flex items-center gap-4 mb-6 pb-6 border-b">
                        <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-user text-3xl text-blue-600"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-semibold">${AppState.currentUser.name}</h2>
                            <p class="text-gray-500 capitalize">${AppState.currentUser.role}</p>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-envelope w-5 text-gray-400"></i>
                            <div>
                                <p class="text-sm text-gray-500">Email Address</p>
                                <p class="font-medium">${AppState.currentUser.email}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <i class="fas fa-phone w-5 text-gray-400"></i>
                            <div>
                                <p class="text-sm text-gray-500">Phone Number</p>
                                <p class="font-medium">${AppState.currentUser.phone || 'Not provided'}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <i class="fas fa-lock w-5 text-gray-400"></i>
                            <div>
                                <p class="text-sm text-gray-500">Password</p>
                                <button onclick="togglePasswordForm()" class="text-blue-600 hover:text-blue-700 text-sm">Change Password</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="passwordForm" class="hidden bg-white rounded-xl shadow-sm p-6"></div>
            </div>
        </div>
    `;
    
    window.togglePasswordForm = () => {
        showPasswordForm = !showPasswordForm;
        const formDiv = document.getElementById('passwordForm');
        
        if (showPasswordForm) {
            formDiv.classList.remove('hidden');
            formDiv.innerHTML = `
                <h3 class="text-lg font-semibold mb-4">Change Password</h3>
                <form id="changePasswordForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input type="password" id="currentPassword" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input type="password" id="newPassword" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input type="password" id="confirmPassword" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Update Password</button>
                </form>
            `;
            
            document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                
                if (newPassword !== confirmPassword) {
                    alert('New passwords do not match');
                    return;
                }
                
                if (newPassword.length < 6) {
                    alert('Password must be at least 6 characters');
                    return;
                }
                
                const result = await api.changePassword({
                    currentPassword: document.getElementById('currentPassword').value,
                    newPassword: newPassword
                });
                
                if (result.error) {
                    alert(result.error);
                } else {
                    alert('Password changed successfully');
                    window.togglePasswordForm();
                }
            });
        } else {
            formDiv.classList.add('hidden');
        }
    };
}

// Render Admin Dashboard
async function renderAdminDashboard() {
    const app = document.getElementById('app');
    if (!app) return;
    
    AppState.isLoading = true;
    app.innerHTML = `
        ${renderNavbar('admin')}
        <div class="container mx-auto px-4 py-8">
            <div class="text-center py-12">
                <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
                <p class="mt-2 text-gray-500">Loading dashboard...</p>
            </div>
        </div>
    `;
    
    try {
        const stats = await api.getAdminStats();
        const bookings = await api.getAllBookings();
        const showtimes = await api.getAllShowtimes();
        
        app.innerHTML = `
            ${renderNavbar('admin')}
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-2xl font-bold mb-6">Admin Dashboard</h1>
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white rounded-xl p-6 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div><p class="text-gray-500 text-sm">Total Users</p><p class="text-2xl font-bold">${stats.totalUsers}</p></div>
                            <i class="fas fa-users text-3xl text-blue-500"></i>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-6 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div><p class="text-gray-500 text-sm">Active Movies</p><p class="text-2xl font-bold">${stats.totalMovies}</p></div>
                            <i class="fas fa-film text-3xl text-green-500"></i>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-6 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div><p class="text-gray-500 text-sm">Total Bookings</p><p class="text-2xl font-bold">${stats.totalBookings}</p></div>
                            <i class="fas fa-ticket-alt text-3xl text-purple-500"></i>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-6 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div><p class="text-gray-500 text-sm">Total Revenue</p><p class="text-2xl font-bold">₹${stats.totalRevenue}</p></div>
                            <i class="fas fa-rupee-sign text-3xl text-orange-500"></i>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div class="bg-white rounded-xl shadow-sm p-6">
                        <h3 class="font-semibold mb-4">Recent Bookings</h3>
                        <div class="space-y-3 max-h-80 overflow-y-auto" id="recentBookings"></div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <h3 class="font-semibold mb-4">Manage Showtimes</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">Movie</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">Theater</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">Time</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">Price</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">Available</th>
                                </tr>
                            </thead>
                            <tbody id="showtimesTable"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Recent bookings
        const recentDiv = document.getElementById('recentBookings');
        if (stats.recentBookings && stats.recentBookings.length > 0) {
            stats.recentBookings.slice(0, 10).forEach(booking => {
                recentDiv.innerHTML += `
                    <div class="flex justify-between items-center p-2 border-b">
                        <div>
                            <p class="font-medium text-sm">${booking.movie_title}</p>
                            <p class="text-xs text-gray-500">${booking.user_name} • ${new Date(booking.booking_date).toLocaleDateString()}</p>
                        </div>
                        <span class="font-semibold">₹${booking.total_amount}</span>
                    </div>
                `;
            });
        } else {
            recentDiv.innerHTML = '<p class="text-gray-500 text-center py-4">No recent bookings</p>';
        }
        
        // Showtimes table
        const tableBody = document.getElementById('showtimesTable');
        if (showtimes.length > 0) {
            showtimes.forEach(showtime => {
                tableBody.innerHTML += `
                    <tr class="border-b">
                        <td class="px-4 py-3 text-sm">${showtime.movie_title}</td>
                        <td class="px-4 py-3 text-sm">${showtime.theater_name}</td>
                        <td class="px-4 py-3 text-sm">${new Date(showtime.show_date).toLocaleDateString()}</td>
                        <td class="px-4 py-3 text-sm">${showtime.show_time}</td>
                        <td class="px-4 py-3 text-sm">₹${showtime.price}</td>
                        <td class="px-4 py-3 text-sm">${showtime.available_seats}/${showtime.total_seats}</td>
                    </tr>
                `;
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">No showtimes available</td></tr>';
        }
    } catch (error) {
        console.error('Failed to load admin dashboard:', error);
        app.innerHTML = `
            ${renderNavbar('admin')}
            <div class="container mx-auto px-4 py-8">
                <div class="bg-red-100 text-red-700 p-4 rounded-lg text-center">
                    Failed to load admin dashboard. Please try again.
                </div>
            </div>
        `;
    } finally {
        AppState.isLoading = false;
    }
}

// ==================== HELPER FUNCTIONS ====================

// Render Navbar
function renderNavbar(activePage) {
    const user = AppState.currentUser;
    if (!user) return '';
    
    return `
        <nav class="bg-white shadow-md sticky top-0 z-50">
            <div class="container mx-auto px-4 py-3">
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-2 cursor-pointer" onclick="navigateTo('/dashboard')">
                        <i class="fas fa-film text-3xl text-blue-600"></i>
                        <span class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CineCloud</span>
                    </div>
                    
                    <div class="hidden md:flex space-x-6">
                        <a href="/dashboard" class="flex items-center space-x-2 ${activePage === 'dashboard' ? 'text-blue-600' : 'text-gray-600'} hover:text-blue-600">
                            <i class="fas fa-home"></i><span>Dashboard</span>
                        </a>
                        <a href="/movies" class="flex items-center space-x-2 ${activePage === 'movies' ? 'text-blue-600' : 'text-gray-600'} hover:text-blue-600">
                            <i class="fas fa-ticket-alt"></i><span>Movies</span>
                        </a>
                        
                        ${user.role === 'admin' ? `
                            <a href="/admin" class="flex items-center space-x-2 ${activePage === 'admin' ? 'text-blue-600' : 'text-gray-600'} hover:text-blue-600">
                                <i class="fas fa-chart-line"></i><span>Admin</span>
                            </a>
                        ` : ''}
                    </div>
                    
                    <div class="flex items-center space-x-4">
                        <a href="/profile" class="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
                            <i class="fas fa-user-circle text-2xl"></i>
                            <span class="hidden md:inline">${user.name}</span>
                        </a>
                        <button onclick="logout()" class="text-gray-600 hover:text-red-600">
                            <i class="fas fa-sign-out-alt text-xl"></i>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    `;
}

// Global functions for onclick handlers
window.viewMovie = (movieId) => {
    navigateTo(`/movie-details?id=${movieId}`);
};

window.selectShowtime = (showtimeId, price) => {
    navigateTo(`/seat-selection?showtimeId=${showtimeId}&price=${price}`);
};

window.navigateTo = navigateTo;
window.logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    AppState.currentUser = null;
    navigateTo('/login', true);
};