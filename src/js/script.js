document.addEventListener('DOMContentLoaded', () => {
    // Authentication state management
    let currentUser = null;
    let authToken = localStorage.getItem('authToken');

    // Check if user is already logged in
    if (authToken) {
        validateToken();
    }

    // Authentication form handling
    const authContainer = document.getElementById('authContainer');
    const appContainer = document.getElementById('appContainer');
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authSwitchText = document.getElementById('authSwitchText');
    const authSwitchLink = document.getElementById('authSwitchLink');
    const authUsername = document.getElementById('authUsername');
    const authPassword = document.getElementById('authPassword');
    const welcomeText = document.getElementById('welcomeText');
    const logoutBtn = document.getElementById('logoutBtn');

    let isLoginMode = true;

    // Helper function to check if server is responding
    async function checkServerHealth() {
        try {
            const response = await fetch('/validate-token', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer invalid-token'
                }
            });
            // We expect a 401/403 response, which means server is running
            return response.status === 401 || response.status === 403;
        } catch (error) {
            return false;
        }
    }

    // Helper function to safely parse JSON
    async function safeJsonParse(response) {
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (error) {
            console.error('Failed to parse JSON:', text);
            throw new Error('Servera kļūda: Nederīga atbilde');
        }
    }

    // Switch between login and signup
    authSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        
        if (isLoginMode) {
            authTitle.textContent = 'Pieslēgšanās';
            authSubmitBtn.textContent = 'Pieslēgties';
            authSwitchText.textContent = 'Nav konta?';
            authSwitchLink.textContent = 'Reģistrēties';
        } else {
            authTitle.textContent = 'Reģistrācija';
            authSubmitBtn.textContent = 'Reģistrēties';
            authSwitchText.textContent = 'Jau ir konts?';
            authSwitchLink.textContent = 'Pieslēgties';
        }
    });

    // Handle authentication form submission
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = authUsername.value.trim();
        const password = authPassword.value;

        if (!username || !password) {
            alert('Lūdzu aizpildiet visus laukus!');
            return;
        }

        // Disable submit button during request
        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'Ielādē...';

        try {
            // First check if server is responding
            const serverHealthy = await checkServerHealth();
            if (!serverHealthy) {
                throw new Error('Serveris nav pieejams. Pārliecinieties, ka serveris darbojas uz porta 3000.');
            }

            const endpoint = isLoginMode ? '/login' : '/signup';
            console.log(`Making request to: ${endpoint}`);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            const data = await safeJsonParse(response);

            if (!response.ok) {
                throw new Error(data.message || 'Nezināma kļūda');
            }

            // Store token and user info
            localStorage.setItem('authToken', data.token);
            authToken = data.token;
            currentUser = data.user;

            // Show main app
            showMainApp();

            // Clear form
            authForm.reset();

        } catch (error) {
            console.error('Authentication error:', error);
            alert(`Kļūda: ${error.message}`);
        } finally {
            // Re-enable submit button
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isLoginMode ? 'Pieslēgties' : 'Reģistrēties';
        }
    });

    // Validate existing token
    async function validateToken() {
        try {
            const response = await fetch('/validate-token', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const data = await safeJsonParse(response);
                currentUser = data.user;
                showMainApp();
            } else {
                logout();
            }
        } catch (error) {
            console.error('Token validation failed:', error);
            logout();
        }
    }

    // Show main application
    function showMainApp() {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        welcomeText.textContent = `Sveiks, ${currentUser.username}!`;
        loadTasks();
    }

    // Logout function
    function logout() {
        localStorage.removeItem('authToken');
        authToken = null;
        currentUser = null;
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
    }

    // Logout button handler
    logoutBtn.addEventListener('click', logout);

    // Main app functionality
    const taskForm = document.getElementById('taskForm');
    const taskList = document.getElementById('taskList');
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');

    // Helper function to get auth headers
    function getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
    }

    // Task form submission
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!titleInput.value.trim()) {
            alert('Nosaukums ir obligāts lauks!');
            return;
        }

        try {
            const response = await fetch('/tasks', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    title: titleInput.value,
                    description: descriptionInput.value
                }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    alert('Sesija beigusies. Lūdzu pieslēdzieties no jauna.');
                    logout();
                    return;
                }
                const errorData = await safeJsonParse(response);
                throw new Error(errorData.message || 'Kļūda pievienojot uzdevumu');
            }
            
            taskForm.reset();
            await loadTasks();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    // Load tasks function
    async function loadTasks() {
        if (!authToken) return;

        try {
            const response = await fetch('/tasks', {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                if (response.status === 401) {
                    alert('Sesija beigusies. Lūdzu pieslēdzieties no jauna.');
                    logout();
                    return;
                }
                const errorData = await safeJsonParse(response);
                throw new Error(errorData.message || 'Kļūda ielādējot uzdevumus');
            }
            
            const tasks = await safeJsonParse(response);
            renderTasks(tasks);
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    // Render tasks
    function renderTasks(tasks) {
        taskList.innerHTML = '';
        if (tasks.length === 0) {
            taskList.innerHTML = '<p style="text-align: center; color: #666;">Nav uzdevumu. Pievienojiet pirmo!</p>';
            return;
        }

        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task ${task.status === 'complete' ? 'completed' : ''}`;
            taskElement.innerHTML = `
                <div class="task-header">
                    <h3>${escapeHtml(task.title)}</h3>
                    <div class="task-actions">
                        <button class="edit-btn" onclick="editTask('${task._id}')">✏️</button>
                        <input 
                            type="checkbox" 
                            class="status-checkbox" 
                            ${task.status === 'complete' ? 'checked' : ''} 
                            onchange="toggleStatus('${task._id}')"
                        >
                        <button class="delete-btn" onclick="deleteTask('${task._id}')">🗑️</button>
                    </div>
                </div>
                ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
                <div class="task-meta">
                    <small>Izveidots: ${new Date(task.createdAt).toLocaleString('lv-LV')}</small>
                    ${task.updatedAt !== task.createdAt 
                        ? `<small>Labots: ${new Date(task.updatedAt).toLocaleString('lv-LV')}</small>` 
                        : ''}
                </div>
            `;
            taskList.appendChild(taskElement);
        });
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    // Toggle task status
    window.toggleStatus = async (id) => {
        try {
            const taskElement = document.querySelector(`[onchange*="${id}"]`).closest('.task');
            const currentStatus = taskElement.classList.contains('completed') ? 'complete' : 'incomplete';
            
            const response = await fetch(`/tasks/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    status: currentStatus === 'complete' ? 'incomplete' : 'complete'
                }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    alert('Sesija beigusies. Lūdzu pieslēdzieties no jauna.');
                    logout();
                    return;
                }
                const errorData = await safeJsonParse(response);
                throw new Error(errorData.message || 'Kļūda mainot statusu');
            }
            
            await loadTasks();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    // Edit task (improved)
    window.editTask = async (id) => {
        try {
            // Get current task data
            const response = await fetch(`/tasks/${id}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    return;
                }
                throw new Error('Nevar ielādēt uzdevuma datus');
            }

            const task = await safeJsonParse(response);
            
            const newTitle = prompt('Jauns nosaukums:', task.title);
            if (newTitle === null) return; // User cancelled
            
            const newDescription = prompt('Jauns apraksts:', task.description || '');
            if (newDescription === null) return; // User cancelled

            if (!newTitle.trim()) {
                alert('Nosaukums nevar būt tukšs!');
                return;
            }

            const updateResponse = await fetch(`/tasks/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    title: newTitle.trim(),
                    description: newDescription.trim()
                }),
            });

            if (!updateResponse.ok) {
                if (updateResponse.status === 401) {
                    logout();
                    return;
                }
                const errorData = await safeJsonParse(updateResponse);
                throw new Error(errorData.message || 'Kļūda atjaunināt uzdevumu');
            }

            await loadTasks();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    // Delete task
    window.deleteTask = async (id) => {
        if (!confirm('Vai tiešām vēlaties dzēst šo uzdevumu?')) return;
        
        try {
            const response = await fetch(`/tasks/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                if (response.status === 401) {
                    alert('Sesija beigusies. Lūdzu pieslēdzieties no jauna.');
                    logout();
                    return;
                }
                const errorData = await safeJsonParse(response);
                throw new Error(errorData.message || 'Kļūda dzēšot uzdevumu');
            }
            
            await loadTasks();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    // Show connection status
    function showConnectionStatus() {
        checkServerHealth().then(isHealthy => {
            if (!isHealthy) {
                const statusDiv = document.createElement('div');
                statusDiv.innerHTML = `
                    <div style="background: #ff4444; color: white; padding: 10px; text-align: center; position: fixed; top: 0; left: 0; right: 0; z-index: 1000;">
                        ⚠️ Serveris nav pieejams. Pārliecinieties, ka tas darbojas uz porta 3000.
                    </div>
                `;
                document.body.prepend(statusDiv);
            }
        });
    }

    // Check server status on load
    showConnectionStatus();
});