document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('taskForm');
    const taskList = document.getElementById('taskList');
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');

    loadTasks();

    // form check
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!titleInput.value.trim()) {
            alert('Nosaukums ir obligāts lauks!');
            return;
        }

        try {
            const response = await fetch('/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: titleInput.value,
                    description: descriptionInput.value
                }),
            });

            if (!response.ok) throw new Error('Kļūda pievienojot uzdevumu');
            
            taskForm.reset();
            await loadTasks();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    // loadtask function
    async function loadTasks() {
        try {
            const response = await fetch('/tasks');
            if (!response.ok) throw new Error('Kļūda ielādējot uzdevumus');
            
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    //rendertask
    function renderTasks(tasks) {
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task ${task.status === 'complete' ? 'completed' : ''}`;
            taskElement.innerHTML = `
                <div class="task-header">
                    <h3>${task.title}</h3>
                    <div class="task-actions">
                        <img 
                            src="src/img/edit.png" 
                            class="edit-icon" 
                            onclick="editTask('${task._id}')"
                            alt="Edit"
                        >
                        <input 
                            type="checkbox" 
                            class="status-checkbox" 
                            ${task.status === 'complete' ? 'checked' : ''} 
                            onchange="toggleStatus('${task._id}')"
                        >
                        <img 
                            src="src/img/trash.png" 
                            class="delete-icon" 
                            onclick="deleteTask('${task._id}')"
                            alt="Delete"
                        >
                    </div>
                </div>
                ${task.description ? `<p>${task.description}</p>` : ''}
                <div class="task-meta">
                    <small>Izveidots: ${new Date(task.createdAt).toLocaleString()}</small>
                    ${task.updatedAt !== task.createdAt 
                        ? `<small>Labots: ${new Date(task.updatedAt).toLocaleString()}</small>` 
                        : ''}
                </div>
            `;
            taskList.appendChild(taskElement);
        });
    }

    // change status
    window.toggleStatus = async (id) => {
        try {
            const taskElement = document.querySelector(`[onclick*="${id}"]`).closest('.task');
            const currentStatus = taskElement.classList.contains('completed') ? 'complete' : 'incomplete';
            
            const response = await fetch(`/tasks/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: currentStatus === 'complete' ? 'incomplete' : 'complete'
                }),
            });

            if (!response.ok) throw new Error('Kļūda mainot statusu');
            
            await loadTasks();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };
    
    // edit task
    window.editTask = async (id) => {
        try {
             alert("Sorry x_x")
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    // delete task
    window.deleteTask = async (id) => {
        if (!confirm('Vai tiešām vēlaties dzēst šo uzdevumu?')) return;
        
        try {
            const response = await fetch(`/tasks/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Kļūda dzēšot uzdevumu');
            
            await loadTasks();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };
});