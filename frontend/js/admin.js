// Configuration
const API_BASE_URL = window.location.origin + '/api';
const SOCKET_URL = window.location.origin;

// Global variables
let socket;
let authToken = localStorage.getItem('adminToken') || null;
let currentTab = 'dashboard';
let menuItems = [];
let tables = [];
let activeOrders = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check for existing token
    authToken = localStorage.getItem('adminToken');
    
    if (authToken) {
        validateToken();
    } else {
        showLoginModal();
    }
    
    // Set up form handlers
    setupFormHandlers();
});

// Authentication
function showLoginModal() {
    document.getElementById('loginModal').classList.remove('hidden');
}

function hideLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
}

async function validateToken() {
    if (!authToken) {
        showLoginModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/validate`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            hideLoginModal();
            initializeApp();
        } else {
            localStorage.removeItem('adminToken');
            showLoginModal();
        }
    } catch (error) {
        console.error('Token validation error:', error);
        showLoginModal();
    }
}

async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            hideLoginModal();
            initializeApp();
            return true;
        } else {
            showLoginError(data.error || 'Login failed');
            return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('Connection error');
        return false;
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('adminToken');
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    showLoginModal();
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// Application initialization
function initializeApp() {
    loadDashboardData();
    
    // Initialize Socket.IO with a small delay to ensure proper connection
    setTimeout(() => {
        initializeSocket();
    }, 1000);
    
    // Set up periodic updates
    setInterval(() => {
        if (currentTab === 'dashboard') loadDashboardData();
        if (currentTab === 'orders') loadActiveOrders();
    }, 30000);
}

function initializeSocket() {
    // Configure Socket.IO with better transport options and error handling
    socket = io(SOCKET_URL, {
        transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
        upgrade: true,
        rememberUpgrade: false,
        timeout: 20000,
        forceNew: true
    });
    
    socket.on('connect', function() {
        console.log('Connected to server via', socket.io.engine.transport.name);
        socket.emit('join_admin');
        updateConnectionStatus('connected');
    });
    
    socket.on('disconnect', function(reason) {
        console.log('Disconnected from server:', reason);
        updateConnectionStatus('disconnected');
        if (reason === 'io server disconnect') {
            // Server initiated disconnect, reconnect manually
            socket.connect();
        }
    });
    
    socket.on('connect_error', function(error) {
        console.log('Connection error:', error);
        updateConnectionStatus('error');
    });
    
    socket.on('reconnect', function(attemptNumber) {
        console.log('Reconnected after', attemptNumber, 'attempts');
    });
    
    socket.io.engine.on('upgrade', function() {
        console.log('Upgraded to transport:', socket.io.engine.transport.name);
    });
    
    socket.on('new_order', function(order) {
        console.log('New order received:', order);
        showNotification(`New order #${order.id} from table ${order.table_number}`);
        if (currentTab === 'orders') loadActiveOrders();
        if (currentTab === 'dashboard') loadDashboardData();
    });
    
    socket.on('order_updated', function(order) {
        console.log('Order updated:', order);
        if (currentTab === 'orders') loadActiveOrders();
    });
}

// Connection status indicator
function updateConnectionStatus(status) {
    // Optional: Add visual connection status indicator
    // This could update a small status dot in the header
    const statusColors = {
        'connected': 'green',
        'disconnected': 'red', 
        'error': 'orange'
    };
    
    // Log status for debugging
    console.log('Socket status:', status);
}

// API helper
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...options.headers
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        logout();
        return null;
    }
    
    return response.json();
}

// Tab management
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('border-cafe-brown', 'text-cafe-brown');
        btn.classList.add('border-transparent', 'text-gray-600');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    
    // Add active class to selected button
    event.target.classList.add('border-cafe-brown', 'text-cafe-brown');
    event.target.classList.remove('border-transparent', 'text-gray-600');
    
    currentTab = tabName;
    
    // Load data for the selected tab
    switch (tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'orders':
            loadActiveOrders();
            break;
        case 'analytics':
            loadAnalyticsData();
            break;
        case 'menu':
            loadMenuItems();
            break;
        case 'tables':
            loadTables();
            break;
    }
}

// Dashboard functions
async function loadDashboardData() {
    try {
        const data = await apiRequest('/admin/dashboard/stats');
        
        if (data && data.success) {
            document.getElementById('dailyOrders').textContent = data.stats.daily_orders;
            document.getElementById('dailyRevenue').textContent = `₹${data.stats.daily_revenue.toFixed(2)}`;
            document.getElementById('activeOrdersCount').textContent = data.stats.active_orders;
            
            renderPopularItems(data.stats.popular_items);
        }
        
        // Also load tables count
        const tablesData = await apiRequest('/admin/tables');
        if (tablesData && tablesData.success) {
            const activeTables = tablesData.tables.filter(t => t.active_orders > 0).length;
            document.getElementById('activeTablesCount').textContent = activeTables;
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function renderPopularItems(items) {
    const container = document.getElementById('popularItems');
    
    if (items.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No orders today</p>';
        return;
    }
    
    container.innerHTML = items.map((item, index) => `
        <div class="flex justify-between items-center py-2">
            <span class="font-medium">${index + 1}. ${item.name}</span>
            <span class="text-gray-600">${item.quantity} sold</span>
        </div>
    `).join('');
}

// Orders functions
async function loadActiveOrders() {
    try {
        const data = await apiRequest('/admin/orders/active');
        
        if (data && data.success) {
            activeOrders = data.orders;
            renderActiveOrders();
        }
    } catch (error) {
        console.error('Error loading active orders:', error);
    }
}

function renderActiveOrders() {
    const container = document.getElementById('activeOrdersList');
    
    if (activeOrders.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No active orders</p>';
        return;
    }
    
    container.innerHTML = activeOrders.map(order => `
        <div class="border border-gray-200 rounded-lg p-4 mb-4 transition-all duration-300" data-order-id="${order.id}">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h3 class="font-bold">Order #${order.id}</h3>
                    <p class="text-sm text-gray-600">Table ${order.table_number}</p>
                    <p class="text-sm text-gray-600">${new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div class="text-right">
                    <select onchange="updateOrderStatus(${order.id}, this.value)" 
                        class="px-3 py-1 border rounded ${getStatusSelectClass(order.status)}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                        <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
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
                <div class="flex items-center space-x-2">
                    <label class="text-sm">Est. time:</label>
                    <input type="number" value="${order.estimated_time || 15}" min="0" max="120"
                        onchange="updateEstimatedTime(${order.id}, this.value)"
                        class="w-16 px-2 py-1 text-sm border rounded">
                    <span class="text-sm">min</span>
                </div>
            </div>
        </div>
    `).join('');
}

function getStatusSelectClass(status) {
    switch (status) {
        case 'pending': return 'bg-yellow-100 border-yellow-300';
        case 'preparing': return 'bg-blue-100 border-blue-300';
        case 'ready': return 'bg-green-100 border-green-300';
        case 'completed': return 'bg-gray-100 border-gray-300';
        default: return 'bg-gray-100 border-gray-300';
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const data = await apiRequest(`/admin/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        
        if (data && data.success) {
            showNotification(`Order #${orderId} status updated to ${status}`);
            loadActiveOrders();
        }
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}

async function updateEstimatedTime(orderId, estimatedTime) {
    try {
        const order = activeOrders.find(o => o.id === orderId);
        if (!order) return;
        
        const data = await apiRequest(`/admin/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ 
                status: order.status, 
                estimated_time: parseInt(estimatedTime) 
            })
        });
        
        if (data && data.success) {
            // No notification for time updates to avoid spam
        }
    } catch (error) {
        console.error('Error updating estimated time:', error);
    }
}

// Menu functions
async function loadMenuItems() {
    try {
        const data = await apiRequest('/admin/menu-items');
        
        if (data && data.success) {
            menuItems = data.items;
            renderMenuItems();
        }
    } catch (error) {
        console.error('Error loading menu items:', error);
    }
}

function renderMenuItems() {
    const container = document.getElementById('menuItemsList');
    
    // Group items by category
    const categories = {
        1: { name: 'Beverages', items: [] },
        2: { name: 'Food', items: [] },
        3: { name: 'Desserts', items: [] }
    };
    
    menuItems.forEach(item => {
        if (categories[item.category_id]) {
            categories[item.category_id].items.push(item);
        }
    });
    
    container.innerHTML = Object.values(categories).map(category => `
        <div class="mb-6">
            <h3 class="text-lg font-bold mb-3 text-cafe-brown">${category.name}</h3>
            <div class="space-y-2">
                ${category.items.map(item => `
                    <div class="flex justify-between items-center p-3 border rounded ${item.is_available ? 'bg-white' : 'bg-gray-100'}">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2">
                                <span class="font-medium ${item.is_available ? '' : 'text-gray-500'}">${item.name}</span>
                                ${item.is_available ? '' : '<span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Unavailable</span>'}
                            </div>
                            <p class="text-sm text-gray-600">${item.description}</p>
                            <p class="text-sm font-bold text-tea-green">₹${item.price.toFixed(2)}</p>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="editMenuItem(${item.id})" 
                                class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                                Edit
                            </button>
                            <button onclick="deleteMenuItem(${item.id})" 
                                class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">
                                Delete
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function showAddItemModal() {
    document.getElementById('itemModalTitle').textContent = 'Add Menu Item';
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = '';
    document.getElementById('itemModal').classList.remove('hidden');
}

function editMenuItem(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('itemModalTitle').textContent = 'Edit Menu Item';
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemDescription').value = item.description;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemCategory').value = item.category_id;
    document.getElementById('itemAvailable').checked = item.is_available;
    
    document.getElementById('itemModal').classList.remove('hidden');
}

function closeItemModal() {
    document.getElementById('itemModal').classList.add('hidden');
}

async function saveMenuItem(formData) {
    try {
        const itemId = formData.get('itemId');
        const isEdit = itemId !== '';
        
        const itemData = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            category_id: parseInt(formData.get('category')),
            is_available: formData.get('available') === 'on'
        };
        
        const endpoint = isEdit ? `/admin/menu-items/${itemId}` : '/admin/menu-items';
        const method = isEdit ? 'PUT' : 'POST';
        
        const data = await apiRequest(endpoint, {
            method,
            body: JSON.stringify(itemData)
        });
        
        if (data && data.success) {
            showNotification(`Menu item ${isEdit ? 'updated' : 'created'} successfully`);
            closeItemModal();
            loadMenuItems();
        }
    } catch (error) {
        console.error('Error saving menu item:', error);
    }
}

async function deleteMenuItem(itemId) {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    
    try {
        const data = await apiRequest(`/admin/menu-items/${itemId}`, {
            method: 'DELETE'
        });
        
        if (data && data.success) {
            showNotification('Menu item deleted successfully');
            loadMenuItems();
        } else {
            showNotification(data?.error || 'Failed to delete menu item');
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
    }
}

// Tables functions
async function loadTables() {
    try {
        const data = await apiRequest('/admin/tables');
        
        if (data && data.success) {
            tables = data.tables;
            renderTables();
        }
    } catch (error) {
        console.error('Error loading tables:', error);
    }
}

function renderTables() {
    const container = document.getElementById('tablesList');
    
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${tables.map(table => `
                <div class="border rounded-lg p-4 ${table.active_orders > 0 ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-bold text-lg">Table ${table.table_number}</h3>
                            <p class="text-sm text-gray-600">
                                ${table.active_orders > 0 ? `${table.active_orders} active orders` : 'No active orders'}
                            </p>
                            <p class="text-xs text-gray-500">Created: ${new Date(table.created_at).toLocaleDateString()}</p>
                        </div>
                        <button onclick="deleteTable(${table.id})" 
                            class="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 ${table.active_orders > 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                            ${table.active_orders > 0 ? 'disabled title="Cannot delete table with active orders"' : ''}>
                            Delete
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showAddTableModal() {
    document.getElementById('tableForm').reset();
    document.getElementById('tableModal').classList.remove('hidden');
}

function closeTableModal() {
    document.getElementById('tableModal').classList.add('hidden');
}

async function saveTable(formData) {
    try {
        const tableData = {
            table_number: parseInt(formData.get('tableNumber'))
        };
        
        const data = await apiRequest('/admin/tables', {
            method: 'POST',
            body: JSON.stringify(tableData)
        });
        
        if (data && data.success) {
            showNotification('Table created successfully');
            closeTableModal();
            loadTables();
        } else {
            showNotification(data?.error || 'Failed to create table');
        }
    } catch (error) {
        console.error('Error creating table:', error);
    }
}

async function deleteTable(tableId) {
    if (!confirm('Are you sure you want to delete this table?')) return;
    
    try {
        const data = await apiRequest(`/admin/tables/${tableId}`, {
            method: 'DELETE'
        });
        
        if (data && data.success) {
            showNotification('Table deleted successfully');
            loadTables();
        } else {
            showNotification(data?.error || 'Failed to delete table');
        }
    } catch (error) {
        console.error('Error deleting table:', error);
    }
}

// Form handlers
function setupFormHandlers() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        await login(username, password);
    });
    
    // Item form
    document.getElementById('itemForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        formData.set('itemId', document.getElementById('itemId').value);
        formData.set('name', document.getElementById('itemName').value);
        formData.set('description', document.getElementById('itemDescription').value);
        formData.set('price', document.getElementById('itemPrice').value);
        formData.set('category', document.getElementById('itemCategory').value);
        if (document.getElementById('itemAvailable').checked) {
            formData.set('available', 'on');
        }
        
        saveMenuItem(formData);
    });
    
    // Table form
    document.getElementById('tableForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        saveTable(formData);
    });
}

// Utility functions
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Analytics functions
async function loadAnalyticsData() {
    const days = document.getElementById('analyticsTimePeriod').value;
    
    try {
        // Load all analytics data in parallel
        const [salesTrends, peakHours, productPerformance, categoryPerformance] = await Promise.all([
            apiRequest(`/admin/analytics/daily-trends?days=${days}`),
            apiRequest(`/admin/analytics/sales-by-hour?days=${days}`),
            apiRequest(`/admin/analytics/product-performance?days=${days}`),
            apiRequest(`/admin/analytics/category-performance?days=${days}`)
        ]);
        
        if (salesTrends && salesTrends.success) {
            renderSalesChart(salesTrends.data);
        }
        
        if (peakHours && peakHours.success) {
            renderPeakHoursChart(peakHours.data);
        }
        
        if (productPerformance && productPerformance.success) {
            renderTopProducts(productPerformance.data);
            renderAnalyticsTable(productPerformance.data);
        }
        
        if (categoryPerformance && categoryPerformance.success) {
            renderCategoryChart(categoryPerformance.data);
        }
        
    } catch (error) {
        console.error('Error loading analytics data:', error);
    }
}

function renderSalesChart(data) {
    const canvas = document.getElementById('salesChart');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (data.length === 0) {
        document.getElementById('salesChartData').innerHTML = '<div class="text-red-500"><i class="fas fa-exclamation-triangle mr-2"></i>No sales data available for this period.</div>';
        return;
    }
    
    // Sort data by date
    data.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Simple line chart implementation with enhanced visuals
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const maxOrders = Math.max(...data.map(d => d.order_count));
    
    const chartWidth = canvas.width - 120;
    const chartHeight = canvas.height - 80;
    const startX = 60;
    const startY = 20;
    
    // Draw grid lines
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = startY + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + chartWidth, y);
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY + chartHeight);
    ctx.lineTo(startX + chartWidth, startY + chartHeight);
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX, startY + chartHeight);
    ctx.stroke();
    
    // Draw Y-axis labels (Revenue)
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = (maxRevenue / 5) * (5 - i);
        const y = startY + (chartHeight / 5) * i + 3;
        ctx.fillText(`₹${value.toFixed(0)}`, startX - 5, y);
    }
    
    // Draw revenue line with gradient
    if (maxRevenue > 0) {
        const gradient = ctx.createLinearGradient(0, startY, 0, startY + chartHeight);
        gradient.addColorStop(0, '#10B981');
        gradient.addColorStop(1, '#059669');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        data.forEach((point, index) => {
            const x = startX + (index / (data.length - 1)) * chartWidth;
            const y = startY + chartHeight - (point.revenue / maxRevenue) * chartHeight;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            
            // Draw data points
            ctx.fillStyle = '#10B981';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        ctx.stroke();
    }
    
    // Enhanced summary with detailed breakdown
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = data.reduce((sum, d) => sum + d.order_count, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const bestDay = data.reduce((max, d) => d.revenue > max.revenue ? d : max, data[0]);
    const worstDay = data.reduce((min, d) => d.revenue < min.revenue ? d : min, data[0]);
    
    document.getElementById('salesChartData').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div class="bg-green-50 p-3 rounded-lg border border-green-200">
                <div class="font-semibold text-green-800">Total Revenue</div>
                <div class="text-xl font-bold text-green-900">₹${totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                <div class="text-green-600">${data.length} days</div>
            </div>
            <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div class="font-semibold text-blue-800">Total Orders</div>
                <div class="text-xl font-bold text-blue-900">${totalOrders.toLocaleString()}</div>
                <div class="text-blue-600">Avg: ${(totalOrders/data.length).toFixed(1)}/day</div>
            </div>
            <div class="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <div class="font-semibold text-purple-800">Avg Order Value</div>
                <div class="text-xl font-bold text-purple-900">₹${avgOrderValue.toFixed(0)}</div>
                <div class="text-purple-600">Per transaction</div>
            </div>
        </div>
        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <div class="font-semibold text-amber-800">📈 Best Day</div>
                <div class="text-amber-900">${new Date(bestDay.date).toLocaleDateString('en-IN')}</div>
                <div class="font-bold text-amber-900">₹${bestDay.revenue.toLocaleString()} (${bestDay.order_count} orders)</div>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div class="font-semibold text-gray-800">📉 Lowest Day</div>
                <div class="text-gray-700">${new Date(worstDay.date).toLocaleDateString('en-IN')}</div>
                <div class="font-bold text-gray-700">₹${worstDay.revenue.toLocaleString()} (${worstDay.order_count} orders)</div>
            </div>
        </div>
        <div class="mt-3 text-xs text-gray-500 flex items-center">
            <div class="w-3 h-3 bg-green-500 rounded mr-2"></div>
            Revenue trend line (₹) • Higher points = Better sales days
        </div>
    `;
    
    // Generate detailed daily sales table
    generateDailySalesTable(data);
}

function generateDailySalesTable(data) {
    const tableContainer = document.getElementById('dailySalesTable');
    
    if (data.length === 0) {
        tableContainer.innerHTML = '<div class="text-gray-500 text-center py-4">No daily sales data available</div>';
        return;
    }
    
    // Sort data by date for table display
    const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first
    
    let tableHTML = `
        <div class="bg-gray-50 rounded-lg border overflow-hidden">
            <div class="px-4 py-3 bg-gray-100 border-b">
                <h4 class="font-semibold text-gray-800">📅 Daily Sales Breakdown</h4>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100 border-b">
                        <tr>
                            <th class="px-3 py-2 text-left font-semibold">Date</th>
                            <th class="px-3 py-2 text-right font-semibold">Orders</th>
                            <th class="px-3 py-2 text-right font-semibold">Revenue</th>
                            <th class="px-3 py-2 text-right font-semibold">Avg Order</th>
                            <th class="px-3 py-2 text-center font-semibold">Performance</th>
                        </tr>
                    </thead>
                    <tbody>`;
    
    const avgRevenue = data.reduce((sum, d) => sum + d.revenue, 0) / data.length;
    const avgOrders = data.reduce((sum, d) => sum + d.order_count, 0) / data.length;
    
    sortedData.forEach((day, index) => {
        const avgOrderValue = day.order_count > 0 ? (day.revenue / day.order_count) : 0;
        const formattedDate = new Date(day.date).toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
        
        // Determine performance level
        let performanceLabel = 'Average';
        let performanceColor = 'bg-gray-100 text-gray-700';
        
        if (day.revenue >= avgRevenue * 1.3) {
            performanceLabel = 'Excellent';
            performanceColor = 'bg-green-100 text-green-800';
        } else if (day.revenue >= avgRevenue * 1.1) {
            performanceLabel = 'Good';
            performanceColor = 'bg-blue-100 text-blue-800';
        } else if (day.revenue <= avgRevenue * 0.7) {
            performanceLabel = 'Below Avg';
            performanceColor = 'bg-red-100 text-red-800';
        } else if (day.revenue <= avgRevenue * 0.9) {
            performanceLabel = 'Fair';
            performanceColor = 'bg-yellow-100 text-yellow-800';
        }
        
        const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        tableHTML += `
            <tr class="${rowClass} hover:bg-gray-100 transition-colors">
                <td class="px-3 py-2 font-medium">${formattedDate}</td>
                <td class="px-3 py-2 text-right">${day.order_count}</td>
                <td class="px-3 py-2 text-right font-medium">₹${day.revenue.toLocaleString('en-IN')}</td>
                <td class="px-3 py-2 text-right">₹${avgOrderValue.toFixed(0)}</td>
                <td class="px-3 py-2 text-center">
                    <span class="px-2 py-1 text-xs rounded-full ${performanceColor}">${performanceLabel}</span>
                </td>
            </tr>`;
    });
    
    const totalOrders = data.reduce((sum, d) => sum + d.order_count, 0);
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const overallAvg = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
    
    tableHTML += `
                    </tbody>
                    <tfoot class="bg-gray-100 border-t font-semibold">
                        <tr>
                            <td class="px-3 py-2">Total (${data.length} days)</td>
                            <td class="px-3 py-2 text-right">${totalOrders}</td>
                            <td class="px-3 py-2 text-right">₹${totalRevenue.toLocaleString('en-IN')}</td>
                            <td class="px-3 py-2 text-right">₹${overallAvg.toFixed(0)}</td>
                            <td class="px-3 py-2 text-center">-</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
    
    tableContainer.innerHTML = tableHTML;
}

function renderPeakHoursChart(data) {
    const canvas = document.getElementById('peakHoursChart');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (data.length === 0) {
        document.getElementById('peakHoursData').innerHTML = '<div class="text-red-500"><i class="fas fa-clock mr-2"></i>No hourly data available for this period.</div>';
        return;
    }
    
    // Create 24-hour array with proper structure
    const hourlyData = new Array(24).fill().map((_, i) => ({
        hour: i,
        order_count: 0,
        revenue: 0,
        avg_order_value: 0
    }));
    
    // Fill with actual data
    data.forEach(item => {
        if (item.hour >= 0 && item.hour < 24) {
            hourlyData[item.hour] = {
                hour: item.hour,
                order_count: item.order_count || 0,
                revenue: item.revenue || 0,
                avg_order_value: item.avg_order_value || 0
            };
        }
    });
    
    const maxOrders = Math.max(...hourlyData.map(d => d.order_count));
    const maxRevenue = Math.max(...hourlyData.map(d => d.revenue));
    
    const chartWidth = canvas.width - 100;
    const chartHeight = canvas.height - 80;
    const startX = 50;
    const startY = 20;
    const barWidth = chartWidth / 24;
    
    // Draw grid lines
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = startY + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + chartWidth, y);
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY + chartHeight);
    ctx.lineTo(startX + chartWidth, startY + chartHeight);
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX, startY + chartHeight);
    ctx.stroke();
    
    // Draw bars with gradient
    hourlyData.forEach((hour, index) => {
        if (hour.order_count > 0) {
            const x = startX + index * barWidth + 2;
            const barHeight = maxOrders > 0 ? (hour.order_count / maxOrders) * chartHeight : 0;
            const y = startY + chartHeight - barHeight;
            
            // Create gradient for bars
            const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
            if (hour.hour >= 7 && hour.hour <= 10) {
                // Morning rush - orange
                gradient.addColorStop(0, '#F59E0B');
                gradient.addColorStop(1, '#D97706');
            } else if (hour.hour >= 12 && hour.hour <= 14) {
                // Lunch rush - blue
                gradient.addColorStop(0, '#3B82F6');
                gradient.addColorStop(1, '#2563EB');
            } else if (hour.hour >= 17 && hour.hour <= 20) {
                // Evening rush - green
                gradient.addColorStop(0, '#10B981');
                gradient.addColorStop(1, '#059669');
            } else {
                // Regular hours - gray
                gradient.addColorStop(0, '#6B7280');
                gradient.addColorStop(1, '#4B5563');
            }
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth - 4, barHeight);
        }
    });
    
    // Draw hour labels for key hours
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    [0, 6, 12, 18, 23].forEach(hour => {
        const x = startX + hour * barWidth + barWidth/2;
        const timeLabel = hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour-12}PM`;
        ctx.fillText(timeLabel, x, startY + chartHeight + 15);
    });
    
    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = Math.round((maxOrders / 5) * (5 - i));
        const y = startY + (chartHeight / 5) * i + 3;
        ctx.fillText(value.toString(), startX - 5, y);
    }
    
    // Find peak hours and busy periods
    const peakHour = hourlyData.reduce((max, hour) => hour.order_count > max.order_count ? hour : max, hourlyData[0]);
    const busyHours = hourlyData.filter(h => h.order_count >= maxOrders * 0.7).map(h => h.hour);
    const totalDayOrders = hourlyData.reduce((sum, h) => sum + h.order_count, 0);
    const totalDayRevenue = hourlyData.reduce((sum, h) => sum + h.revenue, 0);
    
    // Format busy hours for display
    const formatHour = (hour) => hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour-12}PM`;
    const busyPeriods = busyHours.length > 0 ? busyHours.map(formatHour).join(', ') : 'None identified';
    
    document.getElementById('peakHoursData').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
            <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <div class="font-semibold text-yellow-800">🕐 Peak Hour</div>
                <div class="text-xl font-bold text-yellow-900">${formatHour(peakHour.hour)}</div>
                <div class="text-yellow-700">${peakHour.order_count} orders • ₹${peakHour.revenue.toFixed(0)}</div>
            </div>
            <div class="bg-red-50 p-3 rounded-lg border border-red-200">
                <div class="font-semibold text-red-800">🔥 Busy Periods</div>
                <div class="text-red-900 font-medium">${busyPeriods}</div>
                <div class="text-red-700">${busyHours.length} peak hours identified</div>
            </div>
        </div>
        
        <div class="bg-gray-50 p-4 rounded-lg border">
            <h4 class="font-semibold mb-3 text-gray-800">📊 Hourly Breakdown</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div class="text-center">
                    <div class="w-4 h-4 bg-amber-500 rounded mx-auto mb-1"></div>
                    <div class="font-medium">Morning Rush</div>
                    <div class="text-gray-600">7AM - 10AM</div>
                </div>
                <div class="text-center">
                    <div class="w-4 h-4 bg-blue-500 rounded mx-auto mb-1"></div>
                    <div class="font-medium">Lunch Rush</div>
                    <div class="text-gray-600">12PM - 2PM</div>
                </div>
                <div class="text-center">
                    <div class="w-4 h-4 bg-green-500 rounded mx-auto mb-1"></div>
                    <div class="font-medium">Evening Rush</div>
                    <div class="text-gray-600">5PM - 8PM</div>
                </div>
                <div class="text-center">
                    <div class="w-4 h-4 bg-gray-500 rounded mx-auto mb-1"></div>
                    <div class="font-medium">Regular Hours</div>
                    <div class="text-gray-600">Other times</div>
                </div>
            </div>
        </div>
        
        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                <div class="font-semibold text-indigo-800">Daily Total Orders</div>
                <div class="text-xl font-bold text-indigo-900">${totalDayOrders.toLocaleString()}</div>
            </div>
            <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <div class="font-semibold text-emerald-800">Daily Total Revenue</div>
                <div class="text-xl font-bold text-emerald-900">₹${totalDayRevenue.toLocaleString('en-IN')}</div>
            </div>
        </div>
    `;
    
    // Generate detailed hourly data table
    generateHourlyDataTable(hourlyData);
}

function generateHourlyDataTable(hourlyData) {
    const tableContainer = document.getElementById('hourlyDataTable');
    
    // Filter out hours with no data for cleaner table
    const activeHours = hourlyData.filter(hour => hour.order_count > 0);
    
    if (activeHours.length === 0) {
        tableContainer.innerHTML = '<div class="text-gray-500 text-center py-4">No hourly sales data available</div>';
        return;
    }
    
    const formatHour = (hour) => hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour-12}PM`;
    
    let tableHTML = `
        <div class="bg-gray-50 rounded-lg border overflow-hidden">
            <div class="px-4 py-3 bg-gray-100 border-b">
                <h4 class="font-semibold text-gray-800">🕒 Detailed Hourly Sales Data</h4>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100 border-b">
                        <tr>
                            <th class="px-3 py-2 text-left font-semibold">Time</th>
                            <th class="px-3 py-2 text-right font-semibold">Orders</th>
                            <th class="px-3 py-2 text-right font-semibold">Revenue</th>
                            <th class="px-3 py-2 text-right font-semibold">Avg Order</th>
                            <th class="px-3 py-2 text-center font-semibold">Period</th>
                        </tr>
                    </thead>
                    <tbody>`;
    
    activeHours.forEach((hour, index) => {
        const timeLabel = formatHour(hour.hour);
        const avgOrder = hour.order_count > 0 ? (hour.revenue / hour.order_count) : 0;
        
        let periodLabel = 'Regular';
        let periodColor = 'bg-gray-100 text-gray-700';
        
        if (hour.hour >= 7 && hour.hour <= 10) {
            periodLabel = 'Morning Rush';
            periodColor = 'bg-amber-100 text-amber-800';
        } else if (hour.hour >= 12 && hour.hour <= 14) {
            periodLabel = 'Lunch Rush';
            periodColor = 'bg-blue-100 text-blue-800';
        } else if (hour.hour >= 17 && hour.hour <= 20) {
            periodLabel = 'Evening Rush';
            periodColor = 'bg-green-100 text-green-800';
        }
        
        const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        tableHTML += `
            <tr class="${rowClass} hover:bg-gray-100 transition-colors">
                <td class="px-3 py-2 font-medium">${timeLabel}</td>
                <td class="px-3 py-2 text-right">${hour.order_count}</td>
                <td class="px-3 py-2 text-right font-medium">₹${hour.revenue.toLocaleString('en-IN')}</td>
                <td class="px-3 py-2 text-right">₹${avgOrder.toFixed(0)}</td>
                <td class="px-3 py-2 text-center">
                    <span class="px-2 py-1 text-xs rounded-full ${periodColor}">${periodLabel}</span>
                </td>
            </tr>`;
    });
    
    const totalOrders = activeHours.reduce((sum, h) => sum + h.order_count, 0);
    const totalRevenue = activeHours.reduce((sum, h) => sum + h.revenue, 0);
    const overallAvg = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
    
    tableHTML += `
                    </tbody>
                    <tfoot class="bg-gray-100 border-t font-semibold">
                        <tr>
                            <td class="px-3 py-2">Total (${activeHours.length} active hours)</td>
                            <td class="px-3 py-2 text-right">${totalOrders}</td>
                            <td class="px-3 py-2 text-right">₹${totalRevenue.toLocaleString('en-IN')}</td>
                            <td class="px-3 py-2 text-right">₹${overallAvg.toFixed(0)}</td>
                            <td class="px-3 py-2 text-center">-</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
    
    tableContainer.innerHTML = tableHTML;
}

function renderTopProducts(data) {
    const container = document.getElementById('topProducts');
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No product data available.</p>';
        return;
    }
    
    const topProducts = data.slice(0, 10); // Top 10 products
    
    container.innerHTML = topProducts.map((product, index) => `
        <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <div class="flex-1">
                <div class="flex items-center space-x-2">
                    <span class="font-bold text-lg text-cafe-brown">#${index + 1}</span>
                    <div>
                        <p class="font-medium">${product.name}</p>
                        <p class="text-sm text-gray-600">${product.category}</p>
                    </div>
                </div>
            </div>
            <div class="text-right">
                <p class="font-bold text-green-600">₹${product.total_revenue.toFixed(2)}</p>
                <p class="text-sm text-gray-600">${product.total_quantity} sold</p>
            </div>
        </div>
    `).join('');
}

function renderCategoryChart(data) {
    const canvas = document.getElementById('categoryChart');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (data.length === 0) {
        document.getElementById('categoryData').textContent = 'No category data available.';
        return;
    }
    
    // Simple pie chart
    const total = data.reduce((sum, cat) => sum + cat.total_revenue, 0);
    if (total === 0) {
        document.getElementById('categoryData').textContent = 'No sales in this period.';
        return;
    }
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;
    
    const colors = ['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];
    
    let currentAngle = 0;
    data.forEach((category, index) => {
        const sliceAngle = (category.total_revenue / total) * 2 * Math.PI;
        
        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.fill();
        
        // Draw label
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
        const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
        
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(category.category, labelX, labelY);
        
        currentAngle += sliceAngle;
    });
    
    // Update category data text
    document.getElementById('categoryData').innerHTML = data.map(cat => 
        `${cat.category}: ₹${cat.total_revenue.toFixed(2)} (${((cat.total_revenue / total) * 100).toFixed(1)}%)`
    ).join(' | ');
}

function renderAnalyticsTable(data) {
    const tbody = document.getElementById('analyticsTable');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No product data available.</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(product => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900">${product.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    ${product.category}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${product.total_quantity}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                ₹${product.total_revenue.toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ₹${product.avg_price.toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${product.order_count}
            </td>
        </tr>
    `).join('');
}

// Dashboard Interactivity Functions
async function openOrdersDetail() {
    try {
        // Fetch daily orders data
        const response = await fetch(`${API_BASE_URL}/admin/orders/daily`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            populateOrdersModal(data);
            document.getElementById('ordersDetailModal').classList.remove('hidden');
        } else {
            showNotification('Failed to load orders data', 'error');
        }
    } catch (error) {
        console.error('Error loading orders detail:', error);
        showNotification('Error loading orders data', 'error');
    }
}

function closeOrdersDetail() {
    document.getElementById('ordersDetailModal').classList.add('hidden');
}

function populateOrdersModal(data) {
    // Update summary stats
    document.getElementById('modalTotalOrders').textContent = data.orders.length;
    const completedOrders = data.orders.filter(order => order.status === 'completed').length;
    const pendingOrders = data.orders.filter(order => order.status !== 'completed').length;
    
    document.getElementById('modalCompletedOrders').textContent = completedOrders;
    document.getElementById('modalPendingOrders').textContent = pendingOrders;
    
    // Populate orders list
    const ordersList = document.getElementById('dailyOrdersList');
    if (data.orders.length === 0) {
        ordersList.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-shopping-bag text-4xl mb-2 opacity-50"></i>
                <p>No orders found for today</p>
            </div>
        `;
        return;
    }
    
    ordersList.innerHTML = data.orders.map(order => {
        const statusColors = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'confirmed': 'bg-blue-100 text-blue-800',
            'preparing': 'bg-orange-100 text-orange-800',
            'ready': 'bg-purple-100 text-purple-800',
            'completed': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800'
        };
        
        return `
            <div class="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer" onclick="viewOrderDetail(${order.id})">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="font-semibold text-gray-800">Order #${order.id}</span>
                        <span class="ml-2 text-sm text-gray-500">Table ${order.table_number || 'N/A'}</span>
                    </div>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}">
                        ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                </div>
                <div class="text-sm text-gray-600 mb-2">
                    ${order.items.length} items • ₹${order.total_amount.toFixed(2)}
                </div>
                <div class="text-xs text-gray-500">
                    ${new Date(order.created_at).toLocaleTimeString()}
                </div>
            </div>
        `;
    }).join('');
}

async function openRevenueDetail() {
    try {
        // Fetch revenue analytics data
        const response = await fetch(`${API_BASE_URL}/admin/analytics/revenue-detail`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            populateRevenueModal(data);
            document.getElementById('revenueDetailModal').classList.remove('hidden');
        } else {
            showNotification('Failed to load revenue data', 'error');
        }
    } catch (error) {
        console.error('Error loading revenue detail:', error);
        showNotification('Error loading revenue data', 'error');
    }
}

function closeRevenueDetail() {
    document.getElementById('revenueDetailModal').classList.add('hidden');
}

function populateRevenueModal(data) {
    // Update summary stats
    document.getElementById('modalTotalRevenue').textContent = `₹${data.total_revenue.toFixed(2)}`;
    document.getElementById('modalAvgOrderValue').textContent = `₹${data.avg_order_value.toFixed(2)}`;
    document.getElementById('modalTopCategory').textContent = data.top_category || 'N/A';
    document.getElementById('modalGrowthRate').textContent = `${data.growth_rate > 0 ? '+' : ''}${data.growth_rate.toFixed(1)}%`;
    
    // Populate hourly revenue chart
    const hourlyChart = document.getElementById('hourlyRevenueChart');
    const maxHourlyRevenue = Math.max(...data.hourly_revenue.map(h => h.revenue));
    
    hourlyChart.innerHTML = data.hourly_revenue.map(hour => {
        const percentage = maxHourlyRevenue > 0 ? (hour.revenue / maxHourlyRevenue) * 100 : 0;
        return `
            <div class="flex items-center justify-between py-2">
                <span class="text-sm font-medium w-16">${hour.hour}:00</span>
                <div class="flex-1 mx-3 bg-gray-200 rounded-full h-6 relative">
                    <div class="bg-gradient-to-r from-tea-green to-tea-light-green h-full rounded-full transition-all duration-300" 
                         style="width: ${percentage}%"></div>
                </div>
                <span class="text-sm font-semibold text-gray-700 w-20 text-right">₹${hour.revenue.toFixed(2)}</span>
            </div>
        `;
    }).join('');
    
    // Populate category revenue chart
    const categoryChart = document.getElementById('categoryRevenueChart');
    const maxCategoryRevenue = Math.max(...data.category_revenue.map(c => c.revenue));
    
    categoryChart.innerHTML = data.category_revenue.map(category => {
        const percentage = maxCategoryRevenue > 0 ? (category.revenue / category.revenue_total) * 100 : 0;
        const barPercentage = maxCategoryRevenue > 0 ? (category.revenue / maxCategoryRevenue) * 100 : 0;
        
        return `
            <div class="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                <div class="flex-1">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm font-medium text-gray-700">${category.category}</span>
                        <span class="text-sm font-semibold text-gray-800">₹${category.revenue.toFixed(2)}</span>
                    </div>
                    <div class="flex items-center">
                        <div class="flex-1 bg-gray-200 rounded-full h-3 mr-3">
                            <div class="bg-gradient-to-r from-tea-green to-tea-light-green h-full rounded-full transition-all duration-300" 
                                 style="width: ${barPercentage}%"></div>
                        </div>
                        <span class="text-xs text-gray-500 w-12">${percentage.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function viewOrderDetail(orderId) {
    // Switch to orders tab and highlight specific order
    switchTab('orders');
    closeOrdersDetail();
    
    // Highlight the specific order after a short delay
    setTimeout(() => {
        const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderElement) {
            orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            orderElement.classList.add('ring-2', 'ring-tea-green', 'ring-opacity-50');
            setTimeout(() => {
                orderElement.classList.remove('ring-2', 'ring-tea-green', 'ring-opacity-50');
            }, 3000);
        }
    }, 500);
}