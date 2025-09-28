// --- 常量設定 (保持不變) ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin";
const STORAGE_KEY = 'gradeQueryStudents';
const STATUS_OPTIONS = ["已認證", "認證失敗", "審核中", "未完成"];

let currentTaskAccount = null;
let currentTaskItem = null;
let isAdminMode = false; // 【新增】追蹤是否為教師模式

// --- 輔助函數：資料持久化 (保持不變) ---
// ... (loadStudentData, saveStudentData, DEFAULT_STUDENTS 保持不變) ...
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
    } catch (e) { console.error("Failed to parse stored data, using default.", e); }
    saveStudentData(DEFAULT_STUDENTS);
    return DEFAULT_STUDENTS;
}
function saveStudentData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
let students = loadStudentData();


// --- 學生查詢與留言邏輯 (略，與上次一致) ---

// ... (document.getElementById('login-form').addEventListener, renderTasks, logout 保持不變) ...

// --- 整合式留言/審核彈窗邏輯 (修正：適應教師模式) ---

/** 打開彈窗並載入特定項目的留言和狀態 */
function showCommentModal(account, itemName) {
    currentTaskAccount = account;
    currentTaskItem = itemName;
    
    const task = students[account].tasks.find(t => t.item === itemName);
    if (!task) return;

    document.getElementById('modal-task-name').textContent = itemName;
    
    // 1. 載入留言歷史 (包含教師留言)
    const listDiv = document.getElementById('modal-comments-list');
    listDiv.innerHTML = '';
    
    if (task.teacherComment) {
        const p = document.createElement('p');
        p.innerHTML = `<strong>[教師當前留言]</strong>: ${task.teacherComment}`;
        p.style.backgroundColor = '#eaf7ff'; // 淺藍色背景標記
        listDiv.appendChild(p);
    }
    
    task.studentComments.forEach(c => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>[${c.role} @ ${c.time}]</strong>: ${c.text}`;
        listDiv.appendChild(p);
    });
    
    // 2. 設置介面可見性
    const isStudent = !isAdminMode; // 如果不是教師模式，則為學生模式

    // 學生留言區
    const studentCommentArea = document.getElementById('modal-student-comment-area');
    studentCommentArea.style.display = isStudent ? 'block' : 'none';

    // 審核提交區域
    const submissionArea = document.getElementById('modal-submission-area');
    submissionArea.style.display = isStudent ? 'block' : 'none';

    // 學生模式下，設置審核按鈕狀態
    if (isStudent) {
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
    }
    
    // 3. 顯示彈窗
    document.getElementById('modal-new-student-comment').value = '';
    document.getElementById('comment-history-modal').classList.remove('hidden');
}
// ... (submitStudentCommentFromModal, confirmSubmissionFromModal, closeModal 保持不變) ...

// --- 教師介面切換與登入 (修正：設定 isAdminMode 旗標) ---

document.getElementById('teacher-login-btn').addEventListener('click', function() {
    isAdminMode = false; // 確保點擊時是返回登入前的狀態
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.remove('hidden');
    document.getElementById('teacher-error-message').textContent = ''; 
});

function teacherLogout() {
    isAdminMode = false; // 登出時重設
    document.getElementById('admin-container').classList.add('hidden');
    hideTeacherLogin(); 
}

document.getElementById('teacher-login-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const password = document.getElementById('teacher-password').value;
    const errorMessage = document.getElementById('teacher-error-message');

    if (password === TEACHER_PASSWORD) {
        errorMessage.textContent = '';
        isAdminMode = true; // 【修正】登入成功，設定為教師模式
        document.getElementById('teacher-login-container').classList.add('hidden');
        document.getElementById('admin-container').classList.remove('hidden');
        displayStudentList();
        resetForm();
    } else {
        errorMessage.textContent = '管理密碼錯誤，請重試。';
    }
});


// --- 學生資料 CRUD 邏輯 (教師管理) ---

/** 編輯學生 (將資料載入表單) - 確保功能正常 */
function editStudent(account) {
    const student = students[account];
    if (!student) return;

    document.getElementById('student-original-account').value = account; 
    document.getElementById('new-account').value = account;
    document.getElementById('new-name').value = student.name;
    document.getElementById('form-submit-btn').textContent = '更新學生資料';
    
    loadTasksToAdminTable(student.tasks, account); // 傳入帳號用於留言按鈕
    
    document.getElementById('student-form').scrollIntoView({ behavior: 'smooth' });
}

/** 將成績/活動載入到教師管理表格 (【修正】新增帳號參數，用於留言按鈕) */
function loadTasksToAdminTable(tasks, account = '') {
    const tbody = document.getElementById('admin-tasks-tbody');
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        addTaskRow(task, account);
    });
}

/** 新增一行成績/活動表格列 (【修正】新增帳號參數，用於留言按鈕) */
function addTaskRow(task = { item: '', status: '未完成', teacherComment: '', studentComments: [], pendingReview: false }, account = '') {
    const tbody = document.getElementById('admin-tasks-tbody');
    const row = tbody.insertRow();
    
    // 1. 項目名稱
    const itemCell = row.insertCell();
    const itemInput = document.createElement('input');
    itemInput.type = 'text';
    itemInput.value = task.item;
    itemInput.className = 'task-item-input';
    itemCell.appendChild(itemInput);

    // 2. 狀態選擇 (略，保持不變)
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

    // 3. 教師留言 (略，保持不變)
    const commentCell = row.insertCell();
    const commentInput = document.createElement('input');
    commentInput.type = 'text';
    commentInput.value = task.teacherComment;
    commentInput.className = 'task-comment-input';
    commentCell.appendChild(commentInput);

    // 4. 【新增】留言紀錄按鈕
    const historyCell = row.insertCell();
    const historyBtn = document.createElement('button');
    historyBtn.textContent = `留言 (${task.studentComments.length})`;
    historyBtn.type = 'button';
    historyBtn.className = 'comment-history-btn';
    
    if (account) { // 只有在編輯模式下才有帳號
        historyBtn.onclick = () => showCommentModal(account, task.item);
    } else {
        historyBtn.disabled = true; // 新增項目時不可點擊
    }
    historyCell.appendChild(historyBtn);

    // 5. 操作 (移除和清空留言)
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

/** 處理新增/修改表單提交 - 修正：儲存後保持在管理介面 */
document.getElementById('student-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    // ... (數據收集邏輯保持不變) ...
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

    // 【修正】確保儲存後保持在管理介面，並重新載入列表和表單
    resetForm(); 
    displayStudentList();
    
    // 如果是更新，則重新載入編輯模式
    if (originalAccount) {
         editStudent(newAccount);
    }
});
// ... (displayStudentList, removeStudent 保持不變) ...

// --- 初始化頁面狀態 ---
window.onload = function() {
    students = loadStudentData(); 
    isAdminMode = false; // 初始化時為非教師模式
    
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('admin-container').classList.add('hidden');
    document.getElementById('comment-history-modal').classList.add('hidden');
};
