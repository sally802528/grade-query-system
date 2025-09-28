// --- 常量設定 (保持不變) ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin";
const STORAGE_KEY = 'gradeQueryStudents';
const STATUS_OPTIONS = ["已認證", "認證失敗", "審核中", "未完成"];

let currentTaskAccount = null;
let currentTaskItem = null;

// --- 輔助函數：資料持久化 (保持不變) ---
const DEFAULT_STUDENTS = {
    'A123456789': { 
        name: '林書恩',
        tasks: [
            { item: "國文期中考", status: "已認證", teacherComment: "表現優異，無須修改。", studentComments: [], pendingReview: false },
            { item: "數學作業繳交", status: "未完成", teacherComment: "", studentComments: [], pendingReview: false },
            { item: "社團點名出席", status: "審核中", teacherComment: "待確認出席記錄", studentComments: [{ time: new Date().toLocaleString(), role: "學生", text: "已補交假單" }], pendingReview: true },
            { item: "期末專題報告", status: "認證失敗", teacherComment: "報告格式錯誤，請修改後重新提交。", studentComments: [], pendingReview: false },
        ]
    },
    'B987654321': { 
        name: '陳美玲',
        tasks: [
            { item: "國文期中考", status: "已認證", teacherComment: "", studentComments: [], pendingReview: false },
            { item: "專題報告繳交", status: "未完成", teacherComment: "", studentComments: [] }
        ]
    }
};

function loadStudentData() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    try {
        const data = JSON.parse(storedData);
        if (data && Object.keys(data).length > 0) {
            return data;
        }
    } catch (e) { /* ... */ }
    saveStudentData(DEFAULT_STUDENTS);
    return DEFAULT_STUDENTS;
}
function saveStudentData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
let students = loadStudentData();


// --- 學生查詢介面邏輯 (略) ---
document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const account = document.getElementById('account').value.trim();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const studentInfo = students[account];
    
    if (password !== STUDENT_PASSWORD) {
        errorMessage.textContent = '登入失敗：密碼錯誤，請檢查。';
        return;
    }
    if (!studentInfo) {
        errorMessage.textContent = '登入失敗：帳號不存在，請檢查。';
        return;
    }
    
    errorMessage.textContent = '';
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').classList.add('hidden');
    document.getElementById('result-container').classList.remove('hidden');
    
    // 顯示基本資料
    document.getElementById('display-student-id').textContent = account.slice(0, 4) + '****';
    document.getElementById('display-name').textContent = studentInfo.name.charAt(0) + '**' + studentInfo.name.charAt(studentInfo.name.length - 1);
    document.getElementById('display-school').textContent = document.getElementById('school').value.trim();
    document.getElementById('display-class').textContent = document.getElementById('class').value.trim();
    
    renderTasks(studentInfo.tasks, account);
});

/** 顯示學生查詢頁面的表格 */
function renderTasks(tasks, account) {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    
    tasks.forEach((data, index) => {
        const row = taskList.insertRow();
        
        row.insertCell().textContent = data.item;

        const statusCell = row.insertCell();
        const statusSpan = document.createElement('span');
        statusSpan.textContent = data.status;
        statusSpan.className = 'status-' + data.status.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
        statusCell.appendChild(statusSpan);

        const actionCell = row.insertCell();
        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.style.padding = '5px 10px';
        actionBtn.style.width = 'auto';
        actionBtn.style.marginLeft = '0';
        actionBtn.style.marginTop = '0';
        
        if (data.status === '未完成' || data.status === '認證失敗') {
             actionBtn.textContent = '提交審核 / 查看留言';
             actionBtn.className = 'primary-btn';
        } else if (data.status === '審核中') {
             actionBtn.textContent = '審核中 / 查看留言';
             actionBtn.className = 'primary-btn';
             actionBtn.style.backgroundColor = 'blue';
        } else {
            actionBtn.textContent = '查看留言';
            actionBtn.className = 'secondary-btn';
        }
        
        actionBtn.onclick = () => showCommentModal(account, data.item);
        actionCell.appendChild(actionBtn);
    });
}

// ... (logout 函數略) ...

function logout() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('login-form').reset();
}

// --- 整合式留言/審核彈窗邏輯 (略，與上次一致) ---

/** 打開彈窗並載入特定項目的留言和狀態 */
function showCommentModal(account, itemName) {
    currentTaskAccount = account;
    currentTaskItem = itemName;
    
    const task = students[account].tasks.find(t => t.item === itemName);
    if (!task) return;

    document.getElementById('modal-task-name').textContent = itemName;
    
    // 1. 載入留言歷史
    const listDiv = document.getElementById('modal-comments-list');
    listDiv.innerHTML = '';
    task.studentComments.forEach(c => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>[${c.role} @ ${c.time}]</strong>: ${c.text}`;
        listDiv.appendChild(p);
    });
    if (task.teacherComment) {
        const p = document.createElement('p');
        p.innerHTML = `<strong>[教師當前留言]</strong>: ${task.teacherComment}`;
        listDiv.appendChild(p);
    }
    
    // 2. 設置審核區域
    const submissionArea = document.getElementById('modal-submission-area');
    const submissionBtn = submissionArea.querySelector('.submission-btn');
    const submissionMsg = document.getElementById('modal-submission-message');
    
    if (task.status === '未完成' || task.status === '認證失敗') {
        submissionBtn.textContent = '提交完成給教師審核';
        submissionBtn.style.display = 'inline-block';
        submissionMsg.textContent = `當前狀態為 ${task.status}。點擊下方按鈕將提交審核。`;
        submissionMsg.style.color = 'orange';
    } else {
        submissionBtn.style.display = 'none';
        submissionMsg.textContent = `當前狀態為 ${task.status}。無法再次提交。`;
        submissionMsg.style.color = 'gray';
    }
    
    // 3. 顯示彈窗
    document.getElementById('modal-new-student-comment').value = '';
    document.getElementById('comment-history-modal').classList.remove('hidden');
}

/** 學生提交留言 (從彈窗) */
window.submitStudentCommentFromModal = function() {
    const commentText = document.getElementById('modal-new-student-comment').value.trim();

    if (!commentText || !currentTaskAccount || !currentTaskItem) {
        alert("請輸入留言內容。");
        return;
    }

    const task = students[currentTaskAccount].tasks.find(t => t.item === currentTaskItem);
    if (task) {
        task.studentComments.push({
            time: new Date().toLocaleString(),
            role: "學生",
            text: commentText,
        });
        saveStudentData(students);
        alert(`對 [${currentTaskItem}] 的留言已提交。`);
        
        document.getElementById('modal-new-student-comment').value = '';
        showCommentModal(currentTaskAccount, currentTaskItem);
        renderTasks(students[currentTaskAccount].tasks, currentTaskAccount);
    }
}

/** 學生提交審核 (從彈窗) */
window.confirmSubmissionFromModal = function() {
    if (!currentTaskAccount || !currentTaskItem) return;
    
    const task = students[currentTaskAccount].tasks.find(t => t.item === currentTaskItem);
    if (!task) return;

    if (confirm(`確定要將 [${currentTaskItem}] 狀態改為「審核中」嗎？`)) {
        task.status = "審核中";
        task.pendingReview = true;
        task.studentComments.push({
            time: new Date().toLocaleString(),
            role: "系統",
            text: "學生已提交項目等待審核。",
        });
        saveStudentData(students);
        alert(`[${currentTaskItem}] 已成功提交審核！`);
        
        closeModal();
        renderTasks(students[currentTaskAccount].tasks, currentTaskAccount);
    }
}

window.closeModal = function() {
    document.getElementById('comment-history-modal').classList.add('hidden');
    currentTaskAccount = null;
    currentTaskItem = null;
}

// --- 教師介面切換與登入 (略) ---
document.getElementById('teacher-login-btn').addEventListener('click', function() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.remove('hidden');
    document.getElementById('teacher-error-message').textContent = ''; 
});

function hideTeacherLogin() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('teacher-login-form').reset();
}

function teacherLogout() {
    document.getElementById('admin-container').classList.add('hidden');
    hideTeacherLogin(); 
}

document.getElementById('teacher-login-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const password = document.getElementById('teacher-password').value;
    const errorMessage = document.getElementById('teacher-error-message');

    if (password === TEACHER_PASSWORD) {
        errorMessage.textContent = '';
        document.getElementById('teacher-login-container').classList.add('hidden');
        document.getElementById('admin-container').classList.remove('hidden');
        displayStudentList();
        resetForm();
    } else {
        errorMessage.textContent = '管理密碼錯誤，請重試。';
    }
});


// --- 學生資料 CRUD 邏輯 (教師管理) ---

/** 編輯學生 (將資料載入表單) */
function editStudent(account) {
    const student = students[account];
    if (!student) return;

    document.getElementById('student-original-account').value = account; 
    document.getElementById('new-account').value = account;
    document.getElementById('new-name').value = student.name;
    document.getElementById('form-submit-btn').textContent = '更新學生資料';
    
    // 載入成績/活動到表格
    loadTasksToAdminTable(student.tasks);
    
    document.getElementById('student-form').scrollIntoView({ behavior: 'smooth' });
}

/** 將成績/活動載入到教師管理表格 */
function loadTasksToAdminTable(tasks) {
    const tbody = document.getElementById('admin-tasks-tbody');
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        addTaskRow(task);
    });
}

/** 新增一行成績/活動表格列 */
function addTaskRow(task = { item: '', status: '未完成', teacherComment: '', studentComments: [], pendingReview: false }) {
    const tbody = document.getElementById('admin-tasks-tbody');
    const row = tbody.insertRow();
    
    // 1. 項目名稱
    const itemCell = row.insertCell();
    const itemInput = document.createElement('input');
    itemInput.type = 'text';
    itemInput.value = task.item;
    itemInput.className = 'task-item-input';
    itemCell.appendChild(itemInput);

    // 2. 狀態選擇
    const statusCell = row.insertCell();
    const statusSelect = document.createElement('select');
    statusSelect.className = 'task-status-select';
    STATUS_OPTIONS.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (option === task.status) {
            opt.selected = true;
        }
        statusSelect.appendChild(opt);
    });
    statusCell.appendChild(statusSelect);

    // 3. 教師留言
    const commentCell = row.insertCell();
    const commentInput = document.createElement('input');
    commentInput.type = 'text';
    commentInput.value = task.teacherComment;
    commentInput.className = 'task-comment-input';
    commentCell.appendChild(commentInput);

    // 4. 操作 (移除和清空留言)
    const actionCell = row.insertCell();
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '移除';
    removeBtn.type = 'button'; 
    removeBtn.onclick = () => row.remove();
    actionCell.appendChild(removeBtn);

    const clearCommentBtn = document.createElement('button');
    clearCommentBtn.textContent = '清空學生留言';
    clearCommentBtn.type = 'button'; 
    clearCommentBtn.style.marginTop = '5px';
    clearCommentBtn.onclick = () => {
        if (confirm(`確定清空 [${itemInput.value}] 的所有學生留言嗎？此操作將在儲存後生效。`)) {
            row.setAttribute('data-clear-comments', 'true');
            clearCommentBtn.textContent = '已標記清空';
            clearCommentBtn.disabled = true;
            clearCommentBtn.style.backgroundColor = 'lightgray';
        }
    };
    actionCell.appendChild(clearCommentBtn);
    
    row.setAttribute('data-original-comments', JSON.stringify(task.studentComments));
    row.setAttribute('data-pending-review', task.pendingReview.toString());
}

document.getElementById('add-task-btn').addEventListener('click', () => addTaskRow());

function resetForm() {
    document.getElementById('admin-tasks-tbody').innerHTML = ''; // 清空表格
    document.getElementById('student-original-account').value = '';
    document.getElementById('student-form').reset();
    document.getElementById('form-submit-btn').textContent = '新增學生';
}

/** 處理新增/修改表單提交 - 從表格收集資料 */
document.getElementById('student-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const originalAccount = document.getElementById('student-original-account').value;
    const newAccount = document.getElementById('new-account').value.trim();
    const newName = document.getElementById('new-name').value.trim();

    if (!newAccount) { alert("帳號不能為空！"); return; }

    const taskRows = document.querySelectorAll('#admin-tasks-tbody tr');
    const newTasks = [];

    taskRows.forEach(row => {
        const itemInput = row.querySelector('.task-item-input');
        const statusSelect = row.querySelector('.task-status-select');
        const commentInput = row.querySelector('.task-comment-input');
        const originalComments = JSON.parse(row.getAttribute('data-original-comments') || '[]');
        const pendingReview = row.getAttribute('data-pending-review') === 'true';
        const shouldClearComments = row.getAttribute('data-clear-comments') === 'true';

        if (itemInput.value.trim()) {
            newTasks.push({
                item: itemInput.value.trim(),
                status: statusSelect.value,
                teacherComment: commentInput.value.trim(),
                studentComments: shouldClearComments ? [] : originalComments,
                pendingReview: pendingReview
            });
        }
    });

    if ((!originalAccount || originalAccount !== newAccount) && students[newAccount]) {
        alert(`帳號 ${newAccount} 已存在，請使用其他帳號或先編輯現有資料。`);
        return;
    }
    
    if (originalAccount && originalAccount !== newAccount) {
        delete students[originalAccount];
    }
    
    students[newAccount] = {
        name: newName,
        tasks: newTasks
    };
    
    saveStudentData(students);
    alert(`學生 ${newName} (帳號: ${newAccount}) 資料已成功 ${originalAccount ? '更新' : '新增'}！`);

    resetForm(); 
    displayStudentList();
});


/** 顯示學生列表 */
function displayStudentList() {
    const tbody = document.querySelector('#student-list-table tbody');
    tbody.innerHTML = ''; 

    for (const account in students) {
        const student = students[account];
        const row = tbody.insertRow();
        
        row.insertCell().textContent = account;
        row.insertCell().textContent = student.name;
        
        const actionCell = row.insertCell();
        
        const editBtn = document.createElement('button');
        editBtn.textContent = '編輯';
        editBtn.onclick = () => editStudent(account);
        actionCell.appendChild(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '移除';
        removeBtn.onclick = () => removeStudent(account, student.name);
        actionCell.appendChild(removeBtn);
    }
}

/** 移除學生 */
function removeStudent(account, name) {
    if (confirm(`確定要移除學生 ${name} (帳號: ${account}) 嗎？`)) {
        delete students[account];
        saveStudentData(students);
        displayStudentList(); 
    }
}


// --- 初始化頁面狀態 ---
window.onload = function() {
    students = loadStudentData(); 

    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('admin-container').classList.add('hidden');
    document.getElementById('comment-history-modal').classList.add('hidden');
};
