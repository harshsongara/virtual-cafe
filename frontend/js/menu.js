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
    tableNumber = urlParams.get('table');
    
    if (!tableNumber) {
        showError('No table number specified');
        return;
    }
    
    // Update UI with table number
    document.getElementById('tableNumber').textContent = `Table: ${tableNumber}`;
    
    // Restore cart from localStorage
    restoreCartState();
    
    // Initialize socket connection
    initializeSocket();
    
    // Validate table and load menu
    validateTableAndLoadMenu();
    
    // Load current orders
    loadCurrentOrders();
    
    // Set up periodic updates
    setInterval(loadCurrentOrders, 30000); // Update every 30 seconds
});

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
        const response = await fetch(`${API_BASE_URL}/menu`);
        const data = await response.json();
        
        if (data.success) {
            menuData = data.categories;
            renderMenu();
            document.getElementById('loadingSpinner').classList.add('hidden');
            document.getElementById('menuContent').classList.remove('hidden');
        } else {
            showError('Failed to load menu');
        }
    } catch (error) {
        console.error('Error loading menu:', error);
        showError('Unable to load menu');
    }
}

// Render menu categories and items
function renderMenu() {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = '';
    
    menuData.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'mb-8';
        
        categoryDiv.innerHTML = `
            <h2 class="text-2xl font-bold mb-4 text-cafe-brown">${category.name}</h2>
            <div class="grid gap-4">
                ${category.items.map(item => `
                    <div class="bg-white rounded-lg shadow-md p-4 flex justify-between items-center">
                        <div class="flex-1">
                            <h3 class="font-semibold text-lg">${item.name}</h3>
                            <p class="text-gray-600 text-sm mb-2">${item.description}</p>
                            <p class="font-bold text-cafe-brown">$${item.price.toFixed(2)}</p>
                        </div>
                        <div class="flex items-center space-x-3 ml-4">
                            <button onclick="changeQuantity(${item.id}, -1)" 
                                class="bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-300 disabled:opacity-50"
                                ${getItemQuantity(item.id) <= 0 ? 'disabled' : ''}>
                                -
                            </button>
                            <span class="font-bold min-w-[20px] text-center" id="qty-${item.id}">
                                ${getItemQuantity(item.id)}
                            </span>
                            <button onclick="changeQuantity(${item.id}, 1)" 
                                class="bg-cafe-brown text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-90">
                                +
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.appendChild(categoryDiv);
    });
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
    // Update quantity displays
    cart.forEach(item => {
        const qtyElement = document.getElementById(`qty-${item.id}`);
        if (qtyElement) {
            qtyElement.textContent = item.quantity;
        }
    });
    
    // Update buttons
    menuData.forEach(category => {
        category.items.forEach(item => {
            const qtyElement = document.getElementById(`qty-${item.id}`);
            const minusBtn = qtyElement?.parentElement?.querySelector('button:first-child');
            if (minusBtn) {
                minusBtn.disabled = getItemQuantity(item.id) <= 0;
            }
        });
    });
    
    // Update cart summary
    updateCartSummary();
    
    // Update cart button
    const cartCount = document.getElementById('cartCount');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalItems > 0) {
        cartCount.textContent = totalItems;
        cartCount.classList.remove('hidden');
    } else {
        cartCount.classList.add('hidden');
    }
}

function updateCartSummary() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="text-gray-500 text-center">Your cart is empty</p>';
        cartTotal.textContent = '$0.00';
        placeOrderBtn.disabled = true;
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="flex justify-between items-center mb-2">
            <div class="flex-1">
                <span class="font-medium">${item.name}</span>
                <div class="text-sm text-gray-500">$${item.price.toFixed(2)} x ${item.quantity}</div>
            </div>
            <div class="text-right">
                <span class="font-bold">$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `$${total.toFixed(2)}`;
    placeOrderBtn.disabled = false;
}

function toggleCart() {
    const cartSummary = document.getElementById('cartSummary');
    cartSummary.classList.toggle('hidden');
}

function closeCart() {
    document.getElementById('cartSummary').classList.add('hidden');
}

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
        <div class="mb-2">Total: $${orderData.total_amount.toFixed(2)}</div>
        <div class="mb-2">Estimated Time: ${orderData.estimated_time} minutes</div>
        <div>Status: ${orderData.status}</div>
    `;
    
    modal.classList.remove('hidden');
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
                        <span>$${item.subtotal.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="flex justify-between items-center pt-3 border-t">
                <div>
                    <strong>Total: $${order.total_amount.toFixed(2)}</strong>
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

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-cafe-brown text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}