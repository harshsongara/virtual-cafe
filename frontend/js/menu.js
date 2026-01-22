// Configuration
const API_BASE_URL = window.location.origin + '/api';
const SOCKET_URL = window.location.origin;

// Global variables
let socket;
let tableNumber = null;
let cart = [];
let menuData = [];
let currentOrders = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Get table number from URL
    const urlParams = new URLSearchParams(window.location.search);
    tableNumber = urlParams.get('table') || '1'; // Default to table 1 for testing
    
    // Update UI with table number
    document.getElementById('tableNumber').textContent = `Table: ${tableNumber}`;
    
    // Restore cart from localStorage
    restoreCartState();
    
    // Initialize socket connection
    initializeSocket();
    
    // Load menu directly (skip table validation for demo)
    loadMenu();
    
    // Load current orders
    loadCurrentOrders();
    
    // Set up periodic updates
    setInterval(loadCurrentOrders, 30000); // Update every 30 seconds
    
    // Initialize search functionality
    initializeSearch();
    
    // Initialize category menu modal
    initializeCategoryMenu();
});

// Search and filter functionality
let allMenuItems = [];
let currentFilter = 'all';
let currentSearchTerm = '';

function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    // Search input event
    searchInput.addEventListener('input', function(e) {
        currentSearchTerm = e.target.value.toLowerCase().trim();
        
        if (currentSearchTerm) {
            clearSearch.classList.remove('hidden');
        } else {
            clearSearch.classList.add('hidden');
        }
        
        filterAndRenderMenu();
    });
    
    // Clear search
    clearSearch.addEventListener('click', function() {
        searchInput.value = '';
        currentSearchTerm = '';
        clearSearch.classList.add('hidden');
        filterAndRenderMenu();
    });
}

function createCategoryNavigation() {
    const container = document.getElementById('categoryNavigation');
    const existingButtons = container.querySelectorAll('button:not([data-category="recommended"]):not([data-category="bestsellers"])');
    existingButtons.forEach(btn => btn.remove());
    
    // Add category navigation buttons
    menuData.forEach(category => {
        const button = document.createElement('button');
        button.onclick = () => scrollToCategory(category.name.toLowerCase().replace(/\s+/g, '-'));
        button.className = 'category-nav-item flex items-center bg-gray-100 text-gray-600 px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all hover:bg-tea-green hover:text-white';
        button.setAttribute('data-category', category.name.toLowerCase().replace(/\s+/g, '-'));
        
        // Category icons
        const categoryIcons = {
            'tea': 'fas fa-mug-hot',
            'coffee': 'fas fa-coffee', 
            'snacks': 'fas fa-cookie-bite',
            'sweets': 'fas fa-birthday-cake',
            'beverages': 'fas fa-glass-whiskey',
            'food': 'fas fa-utensils',
            'desserts': 'fas fa-ice-cream'
        };
        
        const iconClass = categoryIcons[category.name.toLowerCase()] || 'fas fa-leaf';
        
        button.innerHTML = `
            <i class="${iconClass} mr-2"></i>
            ${category.name}
        `;
        container.appendChild(button);
    });
    
    // Initialize scroll detection
    setupScrollDetection();
}

function scrollToCategory(categoryId) {
    // Update active button
    updateActiveCategory(categoryId);
    
    if (categoryId === 'recommended') {
        // Scroll to top for recommended
        window.scrollTo({
            top: document.querySelector('.menu-section') ? document.querySelector('.menu-section').offsetTop - 120 : 0,
            behavior: 'smooth'
        });
        return;
    }
    
    if (categoryId === 'bestsellers') {
        // Show bestsellers (could be first few items or specific items)
        showBestsellers();
        return;
    }
    
    // Scroll to specific category section
    const targetSection = document.querySelector(`[data-section="${categoryId}"]`);
    if (targetSection) {
        window.scrollTo({
            top: targetSection.offsetTop - 120,
            behavior: 'smooth'
        });
    }
}

function updateActiveCategory(categoryId) {
    // Remove active class from all buttons
    const buttons = document.querySelectorAll('.category-nav-item');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('bg-gray-100', 'text-gray-600');
        btn.classList.remove('bg-tea-green', 'text-white');
    });
    
    // Add active class to clicked button
    const activeButton = document.querySelector(`[data-category="${categoryId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
        activeButton.classList.remove('bg-gray-100', 'text-gray-600');
    }
}

function setupScrollDetection() {
    let isScrolling = false;
    
    window.addEventListener('scroll', () => {
        if (isScrolling) return;
        
        isScrolling = true;
        requestAnimationFrame(() => {
            detectActiveSection();
            isScrolling = false;
        });
    });
}

function detectActiveSection() {
    const sections = document.querySelectorAll('.menu-section');
    const scrollPosition = window.scrollY + 150; // Offset for sticky header
    
    let activeSection = 'recommended';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            activeSection = section.getAttribute('data-section');
        }
    });
    
    // Update active category without scrolling
    const currentActive = document.querySelector('.category-nav-item.active');
    const newActive = document.querySelector(`[data-category="${activeSection}"]`);
    
    if (currentActive !== newActive) {
        updateActiveCategory(activeSection);
    }
}

function showBestsellers() {
    // Filter and show bestseller items (items with index % 3 === 0 as marked popular)
    const bestsellerItems = [];
    menuData.forEach(category => {
        category.items.forEach((item, index) => {
            if (index % 3 === 0) { // Items marked as popular
                bestsellerItems.push({...item, categoryName: category.name});
            }
        });
    });
    
    // Create a special bestsellers display
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = `
        <div class="menu-section mb-8 animate-fade-in" data-section="bestsellers">
            <div class="flex items-center mb-6 px-2">
                <div class="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-2xl mr-4">
                    <i class="fas fa-fire text-white text-xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl sm:text-3xl font-bold text-gray-800">🔥 Bestsellers</h2>
                    <p class="text-gray-600">Most Popular Items at The Tea Estate</p>
                </div>
            </div>
            
            <div class="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                ${bestsellerItems.map((item, index) => {
                    const foodImages = {
                        'masala chai': 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400',
                        'green tea': 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
                        'earl grey': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400',
                        'filter coffee': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
                        'cappuccino': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
                        'samosa': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
                        'pakora': 'https://images.unsplash.com/photo-1626132647573-6b4e4d7c3b57?w=400',
                        'gulab jamun': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400',
                        'kulfi': 'https://images.unsplash.com/photo-1582716401301-b2407dc7563d?w=400',
                        'default': 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400'
                    };
                    const imageUrl = foodImages[item.name.toLowerCase()] || foodImages.default;
                    
                    return `
                        <div class="food-card bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden border border-gray-100 relative">
                            <!-- Bestseller Badge -->
                            <div class="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10 flex items-center">
                                <i class="fas fa-fire mr-1"></i> Bestseller
                            </div>
                            
                            <!-- Food Image -->
                            <div class="relative h-48 overflow-hidden">
                                <img src="${imageUrl}" alt="${item.name}" 
                                     class="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                                     onerror="this.src='${foodImages.default}'">
                                
                                <!-- Price Badge -->
                                <div class="absolute top-3 right-3 bg-tea-cream text-tea-green px-3 py-1 rounded-full font-bold text-lg shadow-lg">
                                    ₹${item.price.toFixed(2)}
                                </div>
                            </div>
                            
                            <!-- Card Content -->
                            <div class="p-4">
                                <h3 class="font-bold text-xl text-gray-800 mb-2">${item.name}</h3>
                                <p class="text-gray-600 text-sm mb-2 line-clamp-2">${item.description}</p>
                                <p class="text-tea-green text-sm font-medium mb-4">From ${item.categoryName}</p>
                                
                                <!-- Rating Stars -->
                                <div class="flex items-center mb-4">
                                    <div class="flex text-yellow-400">
                                        ${'★'.repeat(5)}
                                    </div>
                                    <span class="text-gray-500 text-sm ml-2">(4.8) • 500+ orders</span>
                                </div>
                                
                                <!-- Action Buttons -->
                                <div class="flex items-center justify-center space-x-3">
                                    ${getItemQuantity(item.id) > 0 ? `
                                        <button onclick="changeQuantity(${item.id}, -1)" 
                                            class="w-10 h-10 bg-gray-100 hover:bg-tea-green hover:text-white text-gray-600 rounded-full flex items-center justify-center font-bold transition-all transform hover:scale-110">
                                            <i class="fas fa-minus text-sm"></i>
                                        </button>
                                        
                                        <span class="font-bold text-lg min-w-[40px] text-center text-gray-800 bg-gray-50 py-2 px-3 rounded-lg" id="qty-${item.id}">
                                            ${getItemQuantity(item.id)}
                                        </span>
                                    ` : ''}
                                    
                                    <button onclick="changeQuantity(${item.id}, 1)" 
                                        class="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center font-bold transition-all transform hover:scale-110 shadow-lg">
                                        <i class="fas fa-plus text-lg"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function filterAndRenderMenu() {
    console.log('filterAndRenderMenu called');
    console.log('menuData:', menuData);
    console.log('currentFilter:', currentFilter);
    console.log('currentSearchTerm:', currentSearchTerm);
    
    let filteredData = [...menuData];
    
    // Apply category filter
    if (currentFilter !== 'all') {
        console.log('Applying category filter:', currentFilter);
        filteredData = filteredData.filter(category => 
            category.name.toLowerCase() === currentFilter
        );
        console.log('Filtered by category:', filteredData);
    }
    
    // Apply search filter
    if (currentSearchTerm) {
        console.log('Applying search filter:', currentSearchTerm);
        filteredData = filteredData.map(category => ({
            ...category,
            items: category.items.filter(item => 
                item.name.toLowerCase().includes(currentSearchTerm) ||
                item.description.toLowerCase().includes(currentSearchTerm)
            )
        })).filter(category => category.items.length > 0);
        console.log('Filtered by search:', filteredData);
    }
    
    console.log('Final filtered data:', filteredData);
    
    // Show/hide search results header
    const searchResults = document.getElementById('searchResults');
    const searchResultsText = document.getElementById('searchResultsText');
    
    if (currentSearchTerm) {
        const totalItems = filteredData.reduce((sum, cat) => sum + cat.items.length, 0);
        if (searchResults) searchResults.classList.remove('hidden');
        if (searchResultsText) searchResultsText.textContent = `Found ${totalItems} items matching "${currentSearchTerm}"`;
    } else {
        if (searchResults) searchResults.classList.add('hidden');
    }
    
    // Render filtered menu
    renderFilteredMenu(filteredData);
}

// Socket initialization
function initializeSocket() {
    socket = io(SOCKET_URL);
    
    socket.on('connect', function() {
        console.log('Connected to server');
        socket.emit('join_table', { table_number: tableNumber });
        socket.emit('join_customers');
    });
    
    socket.on('disconnect', function() {
        console.log('Disconnected from server');
    });
    
    socket.on('order_status_updated', function(order) {
        console.log('Order status updated:', order);
        updateOrderStatus(order);
        loadCurrentOrders();
    });
    
    socket.on('menu_updated', function() {
        console.log('Menu updated');
        loadMenu();
    });
    
    socket.on('item_unavailable', function(data) {
        console.log('Item unavailable:', data);
        removeItemFromCart(data.item_id);
        showNotification('An item in your cart is no longer available and has been removed');
    });
}

// Validate table number and load menu
async function validateTableAndLoadMenu() {
    try {
        // Validate table
        const tableResponse = await fetch(`${API_BASE_URL}/tables/${tableNumber}`);
        const tableData = await tableResponse.json();
        
        if (!tableData.exists || !tableData.is_active) {
            showError('Invalid table number');
            return;
        }
        
        // Load menu
        await loadMenu();
        
    } catch (error) {
        console.error('Error validating table:', error);
        showError('Unable to connect to the server');
    }
}

// Load menu data
async function loadMenu() {
    try {
        console.log('Loading menu from:', `${API_BASE_URL}/menu`);
        const response = await fetch(`${API_BASE_URL}/menu`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Menu data received:', data);
        console.log('Categories count:', data.categories ? data.categories.length : 'No categories');
        
        if (data.success && data.categories && data.categories.length > 0) {
            menuData = data.categories;
            console.log('Menu categories loaded:', menuData.map(c => `${c.name}: ${c.items.length} items`));
            console.log('Current filter:', currentFilter);
            console.log('Current search term:', currentSearchTerm);
            renderMenu();
            populateCategoryGrid(); // Populate the floating category menu
            document.getElementById('loadingSpinner').classList.add('hidden');
            document.getElementById('menuContent').classList.remove('hidden');
            console.log('Menu rendering completed');
            
            // Debug: Check what was actually rendered
            const container = document.getElementById('categoriesContainer');
            console.log('Menu container content length:', container ? container.innerHTML.length : 'Container not found');
        } else {
            // Fallback to sample data if API fails
            console.log('Using fallback menu data - API returned:', data);
            loadFallbackMenu();
        }
    } catch (error) {
        console.error('Error loading menu:', error);
        // Use fallback data instead of showing error
        loadFallbackMenu();
    }
}

// Fallback menu data for demo purposes
function loadFallbackMenu() {
    menuData = [
        {
            name: "Tea",
            items: [
                { id: 1, name: "Masala Chai", description: "Traditional spiced tea with aromatic herbs", price: 25 },
                { id: 2, name: "Green Tea", description: "Fresh and healthy antioxidant-rich tea", price: 30 },
                { id: 3, name: "Earl Grey", description: "Classic black tea with bergamot essence", price: 35 }
            ]
        },
        {
            name: "Coffee",
            items: [
                { id: 4, name: "Filter Coffee", description: "South Indian style filter coffee", price: 40 },
                { id: 5, name: "Cappuccino", description: "Italian coffee with steamed milk foam", price: 65 }
            ]
        },
        {
            name: "Snacks",
            items: [
                { id: 6, name: "Samosa", description: "Crispy pastry with spiced potato filling", price: 20 },
                { id: 7, name: "Pakora", description: "Deep-fried fritters with mint chutney", price: 35 }
            ]
        },
        {
            name: "Sweets",
            items: [
                { id: 8, name: "Gulab Jamun", description: "Sweet milk dumplings in sugar syrup", price: 45 },
                { id: 9, name: "Kulfi", description: "Traditional Indian ice cream", price: 50 }
            ]
        }
    ];
    
    renderMenu();
    populateCategoryGrid(); // Populate the floating category menu
    document.getElementById('loadingSpinner').classList.add('hidden');
    document.getElementById('menuContent').classList.remove('hidden');
    
    // Show a notice about demo mode
    showNotification('Demo mode: Using sample menu data for The Tea Estate', 'info');
}

function renderFilteredMenu(filteredData) {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = '';
    
    if (filteredData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4 opacity-50">🔍</div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">No items found</h3>
                <p class="text-gray-600">Try searching for something else or browse all categories</p>
            </div>
        `;
        return;
    }
    
    filteredData.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'menu-section mb-8 animate-fade-in';
        categoryDiv.setAttribute('data-section', category.name.toLowerCase().replace(/\s+/g, '-'));
        
        // Food images for different categories
        const foodImages = {
            'masala chai': 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400',
            'green tea': 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
            'earl grey': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400',
            'filter coffee': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
            'cappuccino': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
            'samosa': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
            'pakora': 'https://images.unsplash.com/photo-1626132647573-6b4e4d7c3b57?w=400',
            'gulab jamun': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400',
            'kulfi': 'https://images.unsplash.com/photo-1582716401301-b2407dc7563d?w=400',
            'default': 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400'
        };
        
        categoryDiv.innerHTML = `
            ${!currentSearchTerm ? `
            <!-- Category Header with Icon -->
            <div class="flex items-center mb-6 px-2">
                <div class="bg-gradient-to-r from-tea-green to-tea-light-green p-3 rounded-2xl mr-4">
                    <i class="fas fa-leaf text-white text-xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl sm:text-3xl font-bold text-gray-800">${category.name}</h2>
                    <p class="text-gray-600">Fresh & Delicious Options</p>
                </div>
            </div>
            ` : ''}
            
            <!-- Menu Items Grid -->
            <div class="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                ${category.items.map((item, index) => {
                    const imageUrl = foodImages[item.name.toLowerCase()] || foodImages.default;
                    const highlightedName = highlightSearchTerm(item.name);
                    const highlightedDesc = highlightSearchTerm(item.description);
                    
                    return `
                    <div class="food-card bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden border border-gray-100">
                        <!-- Food Image -->
                        <div class="relative h-48 overflow-hidden">
                            <img src="${imageUrl}" alt="${item.name}" 
                                 class="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                                 onerror="this.src='${foodImages.default}'">
                            
                            <!-- Price Badge -->
                            <div class="absolute top-3 right-3 bg-tea-cream text-tea-green px-3 py-1 rounded-full font-bold text-lg shadow-lg">
                                ₹${item.price.toFixed(2)}
                            </div>
                            
                            <!-- Popular Badge (for some items) -->
                            ${index % 3 === 0 ? `
                                <div class="absolute top-3 left-3 bg-tea-green text-white px-2 py-1 rounded-full text-xs font-semibold">
                                    🍃 Popular
                                </div>
                            ` : ''}
                        </div>
                        
                        <!-- Card Content -->
                        <div class="p-4">
                            <h3 class="font-bold text-xl text-gray-800 mb-2">${highlightedName}</h3>
                            <p class="text-gray-600 text-sm mb-4 line-clamp-2">${highlightedDesc}</p>
                            
                            <!-- Rating Stars (decorative) -->
                            <div class="flex items-center mb-4">
                                <div class="flex text-yellow-400">
                                    ${'★'.repeat(4)}${'☆'.repeat(1)}
                                </div>
                                <span class="text-gray-500 text-sm ml-2">(4.2)</span>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="flex items-center justify-center space-x-3">
                                ${getItemQuantity(item.id) > 0 ? `
                                    <button onclick="changeQuantity(${item.id}, -1)" 
                                        class="w-10 h-10 bg-gray-100 hover:bg-tea-green hover:text-white text-gray-600 rounded-full flex items-center justify-center font-bold transition-all transform hover:scale-110">
                                        <i class="fas fa-minus text-sm"></i>
                                    </button>
                                    
                                    <span class="font-bold text-lg min-w-[40px] text-center text-gray-800 bg-gray-50 py-2 px-3 rounded-lg" id="qty-${item.id}">
                                        ${getItemQuantity(item.id)}
                                    </span>
                                ` : ''}
                                
                                <button onclick="changeQuantity(${item.id}, 1)" 
                                    class="w-12 h-12 bg-gradient-to-r from-tea-green to-tea-light-green text-white rounded-full flex items-center justify-center font-bold transition-all transform hover:scale-110 shadow-lg">
                                    <i class="fas fa-plus text-lg"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
        
        container.appendChild(categoryDiv);
    });
}

// Update the original renderMenu function to use new system
function renderMenu() {
    filterAndRenderMenu();
}

function highlightSearchTerm(text) {
    if (!currentSearchTerm) return text;
    
    const regex = new RegExp(`(${currentSearchTerm})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

// Cart management
function getItemQuantity(itemId) {
    const item = cart.find(item => item.id === itemId);
    return item ? item.quantity : 0;
}

function changeQuantity(itemId, change) {
    const menuItem = findMenuItem(itemId);
    if (!menuItem) return;
    
    const cartItem = cart.find(item => item.id === itemId);
    
    if (cartItem) {
        cartItem.quantity += change;
        if (cartItem.quantity <= 0) {
            cart = cart.filter(item => item.id !== itemId);
        }
    } else if (change > 0) {
        cart.push({
            id: itemId,
            name: menuItem.name,
            price: menuItem.price,
            quantity: change
        });
    }
    
    updateCartDisplay();
    saveCartState();
}

function findMenuItem(itemId) {
    for (const category of menuData) {
        const item = category.items.find(item => item.id === itemId);
        if (item) return item;
    }
    return null;
}

function removeItemFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCartDisplay();
    saveCartState();
}

function updateCartDisplay() {
    // Re-render menu to update quantity displays
    renderMenu();
    
    // Update cart summary and floating cart
    updateCartSummary();
    updateFloatingCart();
}

function updateFloatingCart() {
    const floatingCart = document.getElementById('floatingCart');
    const cartItemCount = document.getElementById('cartItemCount');
    const floatingCartTotal = document.getElementById('floatingCartTotal');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (totalItems > 0) {
        floatingCart.classList.remove('hidden');
        cartItemCount.textContent = totalItems === 1 ? '1 item' : `${totalItems} items`;
        floatingCartTotal.textContent = `₹${total.toFixed(2)}`;
    } else {
        floatingCart.classList.add('hidden');
        closeCart();
    }
}

function updateCartSummary() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const cartSubtitle = document.getElementById('cartSubtitle');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    
    // Food images for cart display
    const foodImages = {
        'Espresso': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
        'Latte': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
        'Cappuccino': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
        'Green Tea': 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
        'Earl Grey': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400',
        'Croissant': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
        'Bagel': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
        'Chocolate Cake': 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=400',
        'Cheesecake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400'
    };
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4 opacity-50">🛒</div>
                <p class="text-gray-500 mb-2 text-lg">Your cart is empty</p>
                <p class="text-sm text-gray-400">Add some delicious items to get started!</p>
            </div>
        `;
        if (cartTotal) cartTotal.textContent = '₹0.00';
        if (cartSubtotal) cartSubtotal.textContent = '₹0.00';
        if (placeOrderBtn) placeOrderBtn.disabled = true;
        return;
    }
    
    if (cartSubtitle) {
        cartSubtitle.textContent = totalItems === 1 ? '1 item added' : `${totalItems} items added`;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="bg-gray-50 rounded-2xl p-4 mb-4 hover:bg-gray-100 transition-all">
            <div class="flex items-center space-x-4">
                <!-- Item Image -->
                <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img src="${foodImages[item.name] || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400'}" 
                         alt="${item.name}" 
                         class="w-full h-full object-cover"
                         onerror="this.src='https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400'">
                </div>
                
                <!-- Item Details -->
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-800 mb-1">${item.name}</h4>
                    <p class="text-sm text-gray-600">₹${item.price.toFixed(2)} each</p>
                </div>
                
                <!-- Quantity Controls and Price -->
                <div class="text-right">
                    <div class="flex items-center space-x-2 mb-2">
                        <button onclick="changeQuantity(${item.id}, -1)" 
                            class="w-8 h-8 bg-white border-2 border-tea-green text-tea-green rounded-full flex items-center justify-center font-bold hover:bg-tea-green hover:text-white transition-all">
                            <i class="fas fa-minus text-xs"></i>
                        </button>
                        <span class="font-bold text-gray-800 min-w-[24px] text-center">${item.quantity}</span>
                        <button onclick="changeQuantity(${item.id}, 1)" 
                            class="w-8 h-8 bg-tea-green text-white rounded-full flex items-center justify-center font-bold hover:bg-tea-light-green transition-all">
                            <i class="fas fa-plus text-xs"></i>
                        </button>
                    </div>
                    <p class="font-bold text-tea-green">₹${(item.price * item.quantity).toFixed(2)}</p>
                </div>
            </div>
        </div>
    `).join('');
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceCharge = 20.00;
    const total = subtotal + serviceCharge;
    
    if (cartSubtotal) cartSubtotal.textContent = `₹${subtotal.toFixed(2)}`;
    if (cartTotal) cartTotal.textContent = `₹${total.toFixed(2)}`;
    if (placeOrderBtn) placeOrderBtn.disabled = false;
}

function toggleCart() {
    const cartModal = document.getElementById('cartModal');
    const body = document.body;
    
    if (cartModal.classList.contains('hidden')) {
        cartModal.classList.remove('hidden');
        body.style.overflow = 'hidden'; // Prevent background scrolling
        updateCartSummary();
    } else {
        cartModal.classList.add('hidden');
        body.style.overflow = 'auto'; // Restore scrolling
    }
}

function closeCart() {
    const cartModal = document.getElementById('cartModal');
    const body = document.body;
    
    cartModal.classList.add('hidden');
    body.style.overflow = 'auto'; // Restore scrolling
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const cartModal = document.getElementById('cartModal');
    
    cartModal?.addEventListener('click', function(event) {
        if (event.target === cartModal) {
            closeCart();
        }
    });
});

// Order management
async function placeOrder() {
    if (cart.length === 0) return;
    
    try {
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Placing Order...';
        
        const orderData = {
            table_number: parseInt(tableNumber),
            items: cart.map(item => ({
                menu_item_id: item.id,
                quantity: item.quantity
            }))
        };
        
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success modal
            showOrderSuccess(data);
            
            // Clear cart
            cart = [];
            updateCartDisplay();
            saveCartState();
            closeCart();
            
            // Reload current orders
            loadCurrentOrders();
        } else {
            showError(data.error || 'Failed to place order');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showError('Unable to place order');
    } finally {
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'Place Order';
    }
}

function showOrderSuccess(orderData) {
    const modal = document.getElementById('orderModal');
    const details = document.getElementById('orderDetails');
    
    details.innerHTML = `
        <div class="mb-2"><strong>Order #${orderData.order_id}</strong></div>
        <div class="mb-2">Total: ₹${orderData.total_amount.toFixed(2)}</div>
        <div class="mb-2">Estimated Time: ${orderData.estimated_time} minutes</div>
        <div>Status: ${orderData.status}</div>
    `;
    
    modal.classList.remove('hidden');
}

// Add item directly to cart (for mobile add buttons)
function addToCart(itemId) {
    const item = findMenuItem(itemId);
    if (item) {
        const existingItem = cart.find(cartItem => cartItem.id === itemId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: 1
            });
        }
        updateCartDisplay();
        updateCartSummary();
        renderMenu(); // Re-render to update button visibility
    }
}

// Remove item from cart
function removeFromCart(itemId) {
    const index = cart.findIndex(item => item.id === itemId);
    if (index !== -1) {
        cart.splice(index, 1);
        updateCartDisplay();
        updateCartSummary();
        renderMenu(); // Re-render to update quantities and buttons
    }
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.add('hidden');
}

// Current orders
async function loadCurrentOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/table/${tableNumber}`);
        const data = await response.json();
        
        if (data.success) {
            currentOrders = data.orders;
            renderCurrentOrders();
        }
    } catch (error) {
        console.error('Error loading current orders:', error);
    }
}

function renderCurrentOrders() {
    const section = document.getElementById('currentOrdersSection');
    const container = document.getElementById('currentOrders');
    
    if (currentOrders.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    
    container.innerHTML = currentOrders.map(order => `
        <div class="border border-gray-200 rounded-lg p-4 mb-4 ${getOrderStatusClass(order.status)}">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h3 class="font-bold">Order #${order.id}</h3>
                    <p class="text-sm text-gray-600">${new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div class="text-right">
                    <span class="inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(order.status)}">
                        ${order.status.toUpperCase()}
                    </span>
                </div>
            </div>
            
            <div class="mb-3">
                ${order.items.map(item => `
                    <div class="flex justify-between text-sm">
                        <span>${item.quantity}x ${item.menu_item_name}</span>
                        <span>₹${item.subtotal.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="flex justify-between items-center pt-3 border-t">
                <div>
                    <strong>Total: ₹${order.total_amount.toFixed(2)}</strong>
                </div>
                <div class="text-right text-sm">
                    ${order.estimated_time > 0 ? `Est. ${order.estimated_time} min` : 'Ready!'}
                </div>
            </div>
        </div>
    `).join('');
}

function getOrderStatusClass(status) {
    switch (status) {
        case 'pending': return 'border-yellow-300 bg-yellow-50';
        case 'preparing': return 'border-blue-300 bg-blue-50';
        case 'ready': return 'border-green-300 bg-green-50';
        default: return 'border-gray-300 bg-gray-50';
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'preparing': return 'bg-blue-100 text-blue-800';
        case 'ready': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function updateOrderStatus(updatedOrder) {
    const orderIndex = currentOrders.findIndex(order => order.id === updatedOrder.id);
    if (orderIndex !== -1) {
        currentOrders[orderIndex] = updatedOrder;
        renderCurrentOrders();
        
        // Show notification for ready orders
        if (updatedOrder.status === 'ready') {
            showNotification(`Order #${updatedOrder.id} is ready!`);
        }
    }
}

// Utility functions
function saveCartState() {
    localStorage.setItem('cart', JSON.stringify(cart));
    localStorage.setItem('tableNumber', tableNumber);
}

function restoreCartState() {
    const savedCart = localStorage.getItem('cart');
    const savedTable = localStorage.getItem('tableNumber');
    
    if (savedCart && savedTable === tableNumber) {
        cart = JSON.parse(savedCart);
    } else {
        // Clear old data
        localStorage.removeItem('cart');
        localStorage.removeItem('tableNumber');
        cart = [];
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // Hide loading spinner and show error
    document.getElementById('loadingSpinner').classList.add('hidden');
    
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    const bgClass = type === 'info' ? 'bg-blue-500' : type === 'error' ? 'bg-red-500' : 'bg-cafe-brown';
    
    notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 ${bgClass} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, type === 'info' ? 5000 : 3000);
}

// Category Menu Modal Functions
function initializeCategoryMenu() {
    // Close modal when clicking outside
    document.getElementById('categoryMenuModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeCategoryMenu();
        }
    });
    
    // Close modal when pressing Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !document.getElementById('categoryMenuModal').classList.contains('hidden')) {
            closeCategoryMenu();
        }
    });
    
    // Populate category list when menu data is loaded
    if (menuData.length > 0) {
        populateCategoryGrid();
    }
}

function openCategoryMenu() {
    populateCategoryGrid();
    document.getElementById('categoryMenuModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    // Transform menu button to close button
    const menuButton = document.querySelector('[onclick="openCategoryMenu()"]');
    if (menuButton) {
        menuButton.innerHTML = '<i class="fas fa-times text-xl"></i>';
        menuButton.onclick = closeCategoryMenu;
    }
}

function closeCategoryMenu() {
    document.getElementById('categoryMenuModal').classList.add('hidden');
    document.body.style.overflow = 'auto'; // Restore scrolling
    // Transform close button back to menu button
    const closeButton = document.querySelector('#floatingCategoryButton button');
    if (closeButton) {
        closeButton.innerHTML = '<i class="fas fa-bars text-xl"></i><span class="ml-2 font-medium">MENU</span>';
        closeButton.onclick = openCategoryMenu;
    }
}

function populateCategoryGrid() {
    const list = document.getElementById('categoryMenuList');
    if (!list || menuData.length === 0) return;
    
    // Calculate total items for special sections
    const totalItems = menuData.reduce((sum, cat) => sum + cat.items.length, 0);
    
    // Update special section counts
    const recommendedElement = document.getElementById('recommendedCount');
    const bestsellerElement = document.getElementById('bestsellerCount');
    const userOrdersElement = document.getElementById('userOrdersCount');
    
    if (recommendedElement) recommendedElement.textContent = Math.floor(totalItems * 0.6);
    if (bestsellerElement) bestsellerElement.textContent = Math.floor(totalItems * 0.15);
    if (userOrdersElement) userOrdersElement.textContent = currentOrders.length || 0;
    
    // Create vertical category list
    list.innerHTML = menuData.map(category => {
        const itemCount = category.items.length;
        const hasSubcategories = itemCount > 5; // Show plus icon for categories with many items
        
        return `
            <button onclick="scrollToCategoryFromModal('${category.name.toLowerCase().replace(/\s+/g, '-')}')" 
                class="w-full text-left py-4 px-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-between group">
                
                <div class="flex items-center">
                    <span class="text-white text-lg font-medium">${category.name}</span>
                    ${hasSubcategories ? '<i class="fas fa-plus text-tea-light-green text-sm ml-2"></i>' : ''}
                </div>
                
                <div class="flex items-center">
                    <span class="text-white text-lg">${itemCount}</span>
                </div>
            </button>
        `;
    }).join('');
}

function scrollToCategoryFromModal(categoryId) {
    // Close the modal first
    closeCategoryMenu();
    
    // Small delay for smooth transition
    setTimeout(() => {
        // Scroll to specific category section
        const targetSection = document.querySelector(`[data-section="${categoryId}"]`);
        if (targetSection) {
            window.scrollTo({
                top: targetSection.offsetTop - 120,
                behavior: 'smooth'
            });
        }
    }, 300);
}

function showAllItems() {
    // Close the modal first
    closeCategoryMenu();
    
    // Show all menu items (default view)
    setTimeout(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, 300);
}

function showBestsellers() {
    // Close the modal first  
    closeCategoryMenu();
    
    // Filter and show bestseller items (items with index % 3 === 0 as marked popular)
    setTimeout(() => {
        const bestsellerItems = [];
        menuData.forEach(category => {
            category.items.forEach((item, index) => {
                if (index % 3 === 0) { // Items marked as popular
                    bestsellerItems.push({...item, categoryName: category.name});
                }
            });
        });
        
        // Create a special bestsellers display
        const container = document.getElementById('categoriesContainer');
        container.innerHTML = `
            <div class="menu-section mb-8 animate-fade-in" data-section="bestsellers">
                <div class="flex items-center mb-6 px-2">
                    <div class="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-2xl mr-4">
                        <i class="fas fa-fire text-white text-xl"></i>
                    </div>
                    <div>
                        <h2 class="text-2xl sm:text-3xl font-bold text-gray-800">🔥 Bestsellers</h2>
                        <p class="text-gray-600">Most Popular Items at The Tea Estate</p>
                    </div>
                </div>
                
                <div class="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                    ${bestsellerItems.map((item, index) => {
                        const foodImages = {
                            'masala chai': 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400',
                            'green tea': 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
                            'earl grey': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400',
                            'filter coffee': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
                            'cappuccino': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
                            'samosa': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
                            'pakora': 'https://images.unsplash.com/photo-1626132647573-6b4e4d7c3b57?w=400',
                            'gulab jamun': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400',
                            'kulfi': 'https://images.unsplash.com/photo-1582716401301-b2407dc7563d?w=400',
                            'default': 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400'
                        };
                        const imageUrl = foodImages[item.name.toLowerCase()] || foodImages.default;
                        
                        return `
                            <div class="food-card bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden border border-gray-100 relative">
                                <!-- Bestseller Badge -->
                                <div class="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10 flex items-center">
                                    <i class="fas fa-fire mr-1"></i> Bestseller
                                </div>
                                
                                <!-- Food Image -->
                                <div class="relative h-48 overflow-hidden">
                                    <img src="${imageUrl}" alt="${item.name}" 
                                         class="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                                         onerror="this.src='${foodImages.default}'">
                                    
                                    <!-- Price Badge -->
                                    <div class="absolute top-3 right-3 bg-tea-cream text-tea-green px-3 py-1 rounded-full font-bold text-lg shadow-lg">
                                        ₹${item.price.toFixed(2)}
                                    </div>
                                </div>
                                
                                <!-- Card Content -->
                                <div class="p-4">
                                    <h3 class="font-bold text-xl text-gray-800 mb-2">${item.name}</h3>
                                    <p class="text-gray-600 text-sm mb-2 line-clamp-2">${item.description}</p>
                                    <p class="text-tea-green text-sm font-medium mb-4">From ${item.categoryName}</p>
                                    
                                    <!-- Rating Stars -->
                                    <div class="flex items-center mb-4">
                                        <div class="flex text-yellow-400">
                                            ${'★'.repeat(5)}
                                        </div>
                                        <span class="text-gray-500 text-sm ml-2">(4.8) • 500+ orders</span>
                                    </div>
                                    
                                    <!-- Action Buttons -->
                                    <div class="flex items-center justify-center space-x-3">
                                        ${getItemQuantity(item.id) > 0 ? `
                                            <button onclick="changeQuantity(${item.id}, -1)" 
                                                class="w-10 h-10 bg-gray-100 hover:bg-tea-green hover:text-white text-gray-600 rounded-full flex items-center justify-center font-bold transition-all transform hover:scale-110">
                                                <i class="fas fa-minus text-sm"></i>
                                            </button>
                                            
                                            <span class="font-bold text-lg min-w-[40px] text-center text-gray-800 bg-gray-50 py-2 px-3 rounded-lg" id="qty-${item.id}">
                                                ${getItemQuantity(item.id)}
                                            </span>
                                        ` : ''}
                                        
                                        <button onclick="changeQuantity(${item.id}, 1)" 
                                            class="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center font-bold transition-all transform hover:scale-110 shadow-lg">
                                            <i class="fas fa-plus text-lg"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }, 300);
}