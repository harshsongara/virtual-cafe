// Configuration
const API_BASE_URL = window.location.origin + '/api';
const SOCKET_URL = window.location.origin;

// Global variables
let socket;
let authToken = null;
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
        const response = await fetch(`${API_BASE_URL}/admin/validate`, {
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
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
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
    initializeSocket();
    loadDashboardData();
    
    // Set up periodic updates
    setInterval(() => {
        if (currentTab === 'dashboard') loadDashboardData();
        if (currentTab === 'orders') loadActiveOrders();
    }, 30000);
}

function initializeSocket() {
    socket = io(SOCKET_URL);
    
    socket.on('connect', function() {
        console.log('Connected to server');
        socket.emit('join_admin');
    });
    
    socket.on('disconnect', function() {
        console.log('Disconnected from server');
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
            document.getElementById('dailyRevenue').textContent = `$${data.stats.daily_revenue.toFixed(2)}`;
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
        <div class="border border-gray-200 rounded-lg p-4 mb-4">
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
                        <span>$${item.subtotal.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="flex justify-between items-center pt-3 border-t">
                <div>
                    <strong>Total: $${order.total_amount.toFixed(2)}</strong>
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
                            <p class="text-sm font-bold text-cafe-brown">$${item.price.toFixed(2)}</p>
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
        document.getElementById('salesChartData').textContent = 'No sales data available for this period.';
        return;
    }
    
    // Simple line chart implementation
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const maxOrders = Math.max(...data.map(d => d.order_count));
    
    const chartWidth = canvas.width - 80;
    const chartHeight = canvas.height - 60;
    const startX = 40;
    const startY = 30;
    
    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, startY + chartHeight);
    ctx.lineTo(startX + chartWidth, startY + chartHeight);
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX, startY + chartHeight);
    ctx.stroke();
    
    // Draw revenue line
    if (maxRevenue > 0) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((point, index) => {
            const x = startX + (index / (data.length - 1)) * chartWidth;
            const y = startY + chartHeight - (point.revenue / maxRevenue) * chartHeight;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }
    
    // Update chart data text
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = data.reduce((sum, d) => sum + d.order_count, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    document.getElementById('salesChartData').innerHTML = `
        Total Revenue: $${totalRevenue.toFixed(2)} | 
        Total Orders: ${totalOrders} | 
        Avg Order Value: $${avgOrderValue.toFixed(2)}
    `;
}

function renderPeakHoursChart(data) {
    const canvas = document.getElementById('peakHoursChart');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (data.length === 0) {
        document.getElementById('peakHoursData').textContent = 'No hourly data available.';
        return;
    }
    
    // Create 24-hour array
    const hourlyData = new Array(24).fill(0);
    data.forEach(item => {
        hourlyData[item.hour] = item.order_count;
    });
    
    const maxOrders = Math.max(...hourlyData);
    if (maxOrders === 0) {
        document.getElementById('peakHoursData').textContent = 'No orders in this period.';
        return;
    }
    
    const chartWidth = canvas.width - 80;
    const chartHeight = canvas.height - 60;
    const startX = 40;
    const startY = 30;
    const barWidth = chartWidth / 24;
    
    // Draw bars
    ctx.fillStyle = '#3B82F6';
    hourlyData.forEach((orders, hour) => {
        if (orders > 0) {
            const barHeight = (orders / maxOrders) * chartHeight;
            const x = startX + hour * barWidth;
            const y = startY + chartHeight - barHeight;
            ctx.fillRect(x, y, barWidth - 2, barHeight);
        }
    });
    
    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, startY + chartHeight);
    ctx.lineTo(startX + chartWidth, startY + chartHeight);
    ctx.stroke();
    
    // Find peak hours
    const peakHour = hourlyData.indexOf(maxOrders);
    const peakOrders = maxOrders;
    
    document.getElementById('peakHoursData').innerHTML = `
        Peak Hour: ${peakHour}:00 (${peakOrders} orders) | 
        Total Orders: ${hourlyData.reduce((a, b) => a + b, 0)}
    `;
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
                <p class="font-bold text-green-600">$${product.total_revenue.toFixed(2)}</p>
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
        `${cat.category}: $${cat.total_revenue.toFixed(2)} (${((cat.total_revenue / total) * 100).toFixed(1)}%)`
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
                $${product.total_revenue.toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                $${product.avg_price.toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${product.order_count}
            </td>
        </tr>
    `).join('');
}