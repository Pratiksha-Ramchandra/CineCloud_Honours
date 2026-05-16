// Navbar Component
function Navbar(user, activePage) {
    return `
        <nav class="bg-white shadow-md sticky top-0 z-50">
            <div class="container mx-auto px-4 py-3">
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-2 cursor-pointer" onclick="window.location.href='/dashboard'">
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