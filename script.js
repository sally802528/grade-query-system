// script.js

// ----------------------------------------------------------------------
// 【重要配置】請替換為您的 Worker 部署網址！
// ----------------------------------------------------------------------
// 🚨 請將這裡的 URL 替換成您自己的 Worker 部署網址 + /api 🚨
// 範例：const API_BASE_URL = 'https://grade-query-worker.workers.dev/api'; 
const API_BASE_URL = '/api'; // <--- 修正為 Pages Functions 的相對路徑
const TEACHER_PASSWORD = 'Teacher@admin'; // 教師密碼
// ----------------------------------------------------------------------

let students = {}; 
let currentMode = 'student'; 
let editingStudentId = null;
let currentTaskAccountId = null; 
let currentTaskId = null; 
let nextTaskId = 1; 

// ----------------------------------------------------------------------
// A. 資料載入與儲存 (API 互動)
// ----------------------------------------------------------------------

/** 從 API 載入所有學生資料 */
async function loadStudentsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/students`); 

        if (!response.ok) {
            // Worker 啟動但返回 404/500 時的錯誤處理
            const errorData = await response.text(); 
            throw new Error(`API 載入失敗, 狀態碼: ${response.status}. 錯誤訊息: ${errorData.substring(0, 100)}...`);
        }
        
        const data = await response.json();
        students = data;
        
        // 更新 nextTaskId
        let maxId = 0;
        Object.values(students).forEach(student => {
            student.tasks.forEach(task => {
                if (task.id > maxId) maxId = task.id;
            });
        });
        nextTaskId = maxId + 1;
        
    } catch (error) {
        console.error("載入學生資料失敗 (Worker/D1 連線失敗):", error);
        // 如果連線成功 (Status 200) 但 D1 為空，則不報錯，只顯示空數據
        if (!error.message.includes('API 載入失敗')) {
             alert("資料載入失敗，請檢查 Worker 服務是否正常。");
        }
        students = {}; // 確保資料為空對象
    }
}

/** 啟動時呼叫 */
document.addEventListener('DOMContentLoaded', async () => {
    // 首次載入資料
    await loadStudentsFromAPI(); 
    showPanel('login');
});


// ----------------------------------------------------------------------
// B. 介面切換與渲染
// ----------------------------------------------------------------------

function showPanel(panel) {
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('teacher-panel').style.display = 'none';
    document.getElementById('result-panel').style.display = 'none';

    if (panel === 'login') {
        document.getElementById('login-panel').style.display = 'block';
        currentMode = 'student';
    } else if (panel === 'teacher') {
        document.getElementById('teacher-panel').style.display = 'block';
        currentMode = 'teacher';
        renderStudentList();
        resetStudentForm();
    } else if (panel === 'student_result') {
        document.getElementById('result-panel').style.display = 'block';
        currentMode = 'student';
    }
}

function renderStudentList() {
    const tableBody = document.querySelector('#student-list-table tbody');
    tableBody.innerHTML = '';

    Object.values(students).forEach(student => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = student.account;
        // 姓名使用部分遮擋，保護隱私
        const maskedName = student.name.length > 1 ? student.name.charAt(0) + 'X' : student.name;
        row.insertCell().textContent = maskedName; 
        
        const actionCell = row.insertCell();
        actionCell.innerHTML = `
            <button class="btn btn-info btn-sm me-2" onclick="editStudent('${student.account}')">編輯</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStudent('${student.account}')">移除</button>
        `;
    });
}

function resetStudentForm() {
    document.getElementById('student-form').reset();
    document.getElementById('form-title').textContent = '新增學生';
    document.getElementById('save-student-button').textContent = '新增學生 (切換)';
    document.getElementById('account').disabled = false;
    document.querySelector('#tasks-table-admin tbody').innerHTML = '';
    editingStudentId = null;
    
    // 初始化一個空任務 
    addTaskRow(document.querySelector('#tasks-table-admin tbody'), { id: nextTaskId, name: '', status: '未完成', teacherComment: '', comments: [] });
}

function editStudent(account) {
    const student = students[account];
    if (!student) return;

    editingStudentId = account;
    document.getElementById('form-title').textContent = `編輯學生: ${student.name}`;
    document.getElementById('save-student-button').textContent = '更新學生資料';
    document.getElementById('account').value = student.account;
    document.getElementById('account').disabled = true; // 編輯時不能改學號
    document.getElementById('name').value = student.name;
    document.getElementById('school').value = student.school || '永靖高工';
    document.getElementById('class').value = student.class || '資訊二';
    document.getElementById('email').value = student.email || '';

    const tasksBody = document.querySelector('#tasks-table-admin tbody');
    tasksBody.innerHTML = '';
    
    student.tasks.forEach(task => {
        const taskWithComments = students[account].tasks.find(t => t.id === task.id);
        addTaskRow(tasksBody, taskWithComments);
    });
    
    // 如果沒有任務，新增一個空的
    if (student.tasks.length === 0) {
        addTaskRow(tasksBody, { id: nextTaskId, name: '', status: '未完成', teacherComment: '', comments: [] });
    }
}


function addTaskRow(tableBody, task) {
    const row = tableBody.insertRow();
    // 如果是新任務，給一個臨時 ID；如果是舊任務，用真實 ID
    const taskId = task.id || nextTaskId++;
    row.dataset.taskId = taskId; 
    
    // 項目名稱
    row.insertCell().innerHTML = `<input type="text" class="form-control form-control-sm" value="${task.name}" required>`;
    
    // 狀態
    const statusCell = row.insertCell();
    statusCell.innerHTML = `
        <select class="form-select form-select-sm">
            <option value="已認證" ${task.status === '已認證' ? 'selected' : ''}>已認證</option>
            <option value="未完成" ${task.status === '未完成' ? 'selected' : ''}>未完成</option>
        </select>
    `;
    
    // 教師留言狀態
    row.insertCell().innerHTML = `<input type="text" class="form-control form-control-sm" value="${task.teacherComment || ''}">`;

    // 留言記錄
    const commentCount = (task.comments || []).filter(c => !c.isRecalled && !c.isBlocked).length;
    // 只有在編輯模式下才允許進入留言 (確保有學號綁定)
    const currentAccount = editingStudentId || document.getElementById('account').value;
    const isDisabled = !currentAccount || !taskId;
    
    row.insertCell().innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="showCommentModal('${currentAccount}', ${taskId})" 
                ${isDisabled ? 'disabled' : ''}>
            留言 (${commentCount})
        </button>
    `;
    
    // 操作 (移除按鈕)
    row.insertCell().innerHTML = `<button class="btn btn-danger btn-sm" onclick="removeTaskRow(this)">移除</button>`;
    
    // 確保 nextTaskId 更新
    if (taskId >= nextTaskId) {
        nextTaskId = taskId + 1;
    }
}

function removeTaskRow(button) {
    const row = button.closest('tr');
    row.remove();
}

// ----------------------------------------------------------------------
// C. 登入與登出 (修正教師密碼邏輯)
// ----------------------------------------------------------------------

// 教師登入 (本地驗證)
document.getElementById('teacher-login-button').addEventListener('click', () => {
    // 確保這裡讀取的是密碼欄位
    const password = document.getElementById('student-password').value.trim(); 
    if (password === TEACHER_PASSWORD) {
        showPanel('teacher');
    } else {
        alert('教師密碼錯誤！請輸入 Qimei@admin 欄位。');
    }
});

document.getElementById('teacher-logout-button').addEventListener('click', () => {
    showPanel('login');
});

document.getElementById('student-logout-button').addEventListener('click', () => {
    showPanel('login');
});

// ----------------------------------------------------------------------
// D. 學生資料儲存/刪除 (API 互動)
// ----------------------------------------------------------------------

// 學生表單提交 (新增/更新)
document.getElementById('student-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const account = document.getElementById('account').value.trim();
    // ... (讀取其他欄位)
    const name = document.getElementById('name').value.trim();
    const school = document.getElementById('school').value.trim();
    const cls = document.getElementById('class').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!account || !name) {
        alert("學號和姓名為必填欄位。");
        return;
    }

    // 1. 整理 tasks 數據
    const tasks = [];
    document.querySelectorAll('#tasks-table-admin tbody tr').forEach(row => {
        const taskId = parseInt(row.dataset.taskId); // 使用行中綁定的 ID
        const taskName = row.cells[0].querySelector('input').value.trim();
        const status = row.cells[1].querySelector('select').value;
        const teacherComment = row.cells[2].querySelector('input').value.trim();

        if (taskName && taskId) { // 確保有名稱和有效的 ID
            tasks.push({
                id: taskId,
                name: taskName,
                status: status,
                teacherComment: teacherComment
            });
        }
    });

    const studentData = { account, name, school, class: cls, email, tasks };
    
    try {
        const method = editingStudentId ? 'PUT' : 'POST';
        
        const response = await fetch(`${API_BASE_URL}/students`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API 儲存失敗, 狀態碼: ${response.status}`);
        }

        alert('學生資料儲存成功！');
        
        // 重新載入並刷新介面
        await loadStudentsFromAPI(); 
        showPanel('teacher'); 

    } catch (error) {
        console.error("儲存學生資料失敗:", error);
        alert(`資料儲存失敗：${error.message}`);
    }
});

// 刪除學生 (DELETE API 互動)
window.deleteStudent = async function(account) {
    // ... (刪除邏輯保持不變)
    if (!confirm(`確定要刪除學號 ${account} 的所有資料嗎？此操作無法復原。`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/students`, {
            method: 'DELETE', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account: account })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API 刪除失敗, 狀態碼: ${response.status}`);
        }
        
        alert(`學號 ${account} 的資料已成功移除。`);

        await loadStudentsFromAPI();
        renderStudentList();

    } catch (error) {
        console.error("刪除學生資料失敗:", error);
        alert(`資料刪除失敗：${error.message}`);
    }
}


// ----------------------------------------------------------------------
// E. 學生登入查詢 (POST API 互動)
// ----------------------------------------------------------------------

document.getElementById('student-login-button').addEventListener('click', handleStudentLogin);

async function handleStudentLogin() {
    // ... (登入邏輯保持不變)
    const school = document.getElementById('student-school').value.trim();
    const cls = document.getElementById('student-class').value.trim();
    const account = document.getElementById('student-account').value.trim();
    const password = document.getElementById('student-password').value.trim(); 

    if (!school || !cls || !account || !password) {
        alert('請輸入完整的學校、班級、學號和密碼！');
        return;
    }
    
    // 密碼驗證 (簡化為學號等於密碼)
    if (password !== account) {
        alert('密碼錯誤！請輸入學號作為密碼。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/student-login`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ school, class: cls, account })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '查無此學生資料，請確認輸入資訊是否正確。');
        }
        
        const studentData = await response.json();
        
        if (studentData && studentData.account) {
            displayStudentResult(studentData); 
        } else {
             throw new Error('查無此學生資料。');
        }

    } catch (error) {
        console.error("學生登入查詢失敗:", error);
        alert(error.message);
    }
}

function displayStudentResult(student) {
    // 渲染基本資訊
    document.getElementById('result-name').textContent = student.name;
    document.getElementById('result-account').textContent = student.account;
    document.getElementById('result-school').textContent = student.school;
    document.getElementById('result-class').textContent = student.class;
    
    // 渲染 Email (遮蔽處理)
    const [local, domain] = (student.email || '無@email.com').split('@');
    const maskedLocal = local.length > 3 ? local.substring(0, 3) + '***' : local;
    document.getElementById('result-email').textContent = student.email ? `${maskedLocal}@${domain}` : '無';

    // 渲染任務列表
    const tasksBody = document.querySelector('#tasks-table-student tbody');
    tasksBody.innerHTML = '';

    // 確保 tasks 存在且為數組
    (student.tasks || []).forEach(task => { 
        const row = tasksBody.insertRow();
        row.insertCell().textContent = task.name;
        row.insertCell().textContent = task.status;
        row.insertCell().textContent = task.teacherComment || '無';
        
        const commentCell = row.insertCell();
        const commentCount = (task.comments || []).filter(c => !c.isRecalled && !c.isBlocked).length;
        commentCell.innerHTML = `
            <button class="btn btn-secondary btn-sm" onclick="showCommentModal('${student.account}', ${task.id})">
                留言 (${commentCount})
            </button>
        `;
    });

    showPanel('student_result');
}


// ----------------------------------------------------------------------
// F. 留言操作 (API 互動)
// ----------------------------------------------------------------------

/** 處理留言的新增、撤回、屏蔽等操作 */
async function sendCommentAction(action, data) {
    // ... (保持不變)
    try {
        const payload = { action, ...data };
        
        const response = await fetch(`${API_BASE_URL}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API 留言操作失敗, 狀態碼: ${response.status}`);
        }
        
        await loadStudentsFromAPI(); 
        
        if (window.currentTaskAccountId && window.currentTaskId) {
            // 刷新留言面板 (無需重新開啟 modal，只需刷新內容)
            refreshCommentModalContent(window.currentTaskAccountId, window.currentTaskId); 
        }

    } catch (error) {
        console.error(`留言操作 (${action}) 失敗:`, error);
        alert(`留言操作失敗：${error.message}`);
    }
}

// 刷新留言彈窗內容 (新增的函數)
function refreshCommentModalContent(account, taskId) {
    const student = students[account];
    const task = student.tasks.find(t => t.id === taskId);
    if (!task) return;

    const historyDiv = document.getElementById('comment-history');
    historyDiv.innerHTML = ''; // 清空舊內容

    // 重新渲染留言邏輯 (與 showCommentModal 相同)
    (task.comments || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).forEach(comment => {
        let className = 'comment-box';
        let textContent = comment.content;
        let actionButton = '';

        if (comment.isBlocked) {
            className += ' comment-blocked';
            textContent = '此留言已被管理員屏蔽。';
        } else if (comment.isRecalled) {
            className += ' comment-recalled';
            textContent = `**${comment.sender === 'teacher' ? '教師' : '學生'}** 撤回了此留言。`;
        } else {
            className += comment.sender === 'teacher' ? ' comment-teacher' : ' comment-student';
            
            if (currentMode === 'teacher') {
                 actionButton = `<button class="btn btn-danger btn-sm float-end" onclick="blockComment(${comment.id})">屏蔽</button>`;
            }
            if (currentMode === 'student' && comment.sender === 'student') { 
                 actionButton = `<button class="btn btn-warning btn-sm float-end" onclick="recallComment(${comment.id})">撤回</button>`;
            }
        }

        historyDiv.innerHTML += `
            <div class="${className}">
                ${actionButton}
                <strong>${comment.sender === 'teacher' ? '教師' : '學生'}</strong> (${comment.timestamp}): 
                <p class="mb-0">${textContent}</p>
            </div>
        `;
    });
}


// 提交新增留言
window.submitComment = function() {
    // ... (保持不變)
    const inputElement = document.getElementById('new-comment-content');
    const content = inputElement.value.trim();
    if (!content || !currentTaskId) return alert('請輸入留言內容或任務 ID 無效。');
    
    const sender = currentMode === 'teacher' ? 'teacher' : 'student'; 

    sendCommentAction('ADD', {
        task_id: currentTaskId,
        sender: sender,
        content: content,
        timestamp: new Date().toLocaleString('zh-TW', { hour12: false }) 
    });
    inputElement.value = ''; // 清空輸入框
}

// 屏蔽留言 (教師專用)
window.blockComment = function(commentId) {
    // ... (保持不變)
    if (currentMode !== 'teacher') return;
    sendCommentAction('BLOCK', { comment_id: commentId });
}

// 撤回留言 (學生/教師皆可)
window.recallComment = function(commentId) {
     // ... (保持不變)
     sendCommentAction('RECALL', { comment_id: commentId });
}

// 彈窗顯示邏輯
window.showCommentModal = function(account, taskId) {
    const student = students[account];
    const task = student.tasks.find(t => t.id === taskId);
    if (!task) return;

    window.currentTaskAccountId = account; 
    window.currentTaskId = taskId;

    document.getElementById('modal-task-name').textContent = task.name;
    
    // 呼叫新的刷新函數
    refreshCommentModalContent(account, taskId);

    // 綁定提交按鈕
    document.getElementById('submit-comment-button').onclick = submitComment;

    // 顯示 Modal
    const modal = new bootstrap.Modal(document.getElementById('commentModal'));
    modal.show();
}

// 初始化綁定 (其他按鈕)
document.getElementById('add-task-admin-button').addEventListener('click', () => {
    const tasksBody = document.querySelector('#tasks-table-admin tbody');
    addTaskRow(tasksBody, { id: nextTaskId, name: '', status: '未完成', teacherComment: '', comments: [] });
});

document.getElementById('cancel-edit-button').addEventListener('click', () => {
    showPanel('teacher');
});
