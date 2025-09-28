// --- 常量設定 ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin";
const STORAGE_KEY = 'gradeQueryStudents';
const STATUS_OPTIONS = ["已認證", "認證失敗", "審核中", "未完成"];

// --- 輔助函數：資料持久化 ---

// (保留 loadStudentData 和 saveStudentData，但請確保 DEFAULT_STUDENTS 的結構是新的)

const DEFAULT_STUDENTS = {
    'A123456789': { 
        name: '林書恩',
        tasks: [
            // 【新的資料結構】
            { item: "國文期中考", status: "已認證", teacherComment: "表現優異", studentComments: [], pendingReview: false },
            { item: "數學作業繳交", status: "未完成", teacherComment: "", studentComments: [], pendingReview: false },
            { item: "社團點名出席", status: "審核中", teacherComment: "待確認出席記錄", studentComments: [{ time: new Date().toLocaleString(), role: "學生", text: "已補交假單" }], pendingReview: true },
        ]
    },
    // ... (其他學生資料也應使用新結構) ...
};

function loadStudentData() {
    // ... (此函數保留，確保會載入或初始化 DEFAULT_STUDENTS) ...
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

let students = loadStudentData();


// --- 學生查詢介面邏輯 (重大調整：狀態互動與留言顯示) ---

// ... (login-form 事件監聽器保留) ...

/** 顯示學生查詢頁面的表格 */
function renderTasks(tasks, account) {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    const commentSelect = document.getElementById('comment-task-select');
    commentSelect.innerHTML = '<option value="">請選擇要留言的項目</option>';
    
    tasks.forEach((data, index) => {
        const row = taskList.insertRow();
        
        // 1. 項目名稱 (並添加到留言選擇器)
        row.insertCell().textContent = data.item;
        commentSelect.innerHTML += `<option value="${data.item}">${data.item}</option>`;

        // 2. 狀態 (可點擊互動)
        const statusCell = row.insertCell();
        const statusSpan = document.createElement('span');
        statusSpan.textContent = data.status;
        statusSpan.className = 'status-' + data.status.replace(/[^a-zA-Z0-9]/g, '');

        if (data.status === '未完成' || data.status === '認證失敗') {
            // 啟用互動點擊
            statusSpan.style.cursor = 'pointer';
            statusSpan.style.textDecoration = 'underline';
            statusSpan.onclick = () => confirmSubmission(account, data.item);
        }
        statusCell.appendChild(statusSpan);

        // 3. 教師留言
        const teacherCommentCell = row.insertCell();
        teacherCommentCell.textContent = data.teacherComment || '無';

        // 4. 學生留言 (顯示數量和點擊查看歷史)
        const studentCommentCell = row.insertCell();
        const commentCount = data.studentComments.length;
        if (commentCount > 0) {
            const historyLink = document.createElement('a');
            historyLink.href = '#';
            historyLink.textContent = `${commentCount} 則留言 (查看)`;
            historyLink.onclick = (e) => {
                e.preventDefault();
                showCommentHistory(data.item, data.studentComments);
            };
            studentCommentCell.appendChild(historyLink);
        } else {
            studentCommentCell.textContent = '無';
        }
    });
}

/** 學生點擊未完成/認證失敗時的彈窗邏輯 */
function confirmSubmission(account, itemName) {
    if (confirm(`您已確定完成 [${itemName}] 項目了嗎？點擊「確定」將提交給教師審核。`)) {
        const studentInfo = students[account];
        const task = studentInfo.tasks.find(t => t.item === itemName);

        if (task) {
            task.status = "審核中";
            task.pendingReview = true;
            task.studentComments.push({
                time: new Date().toLocaleString(),
                role: "系統",
                text: "學生已提交項目等待審核。",
            });
            saveStudentData(students);
            alert(`[${itemName}] 已成功提交審核！`);
            renderTasks(studentInfo.tasks, account); // 重新渲染表格
        }
    }
}

// ... (logout 函數保留) ...

// --- 學生留言提交邏輯 (新) ---
window.submitStudentComment = function() {
    const account = document.getElementById('account').value.trim(); // 從登入欄位獲取當前帳號
    const selectedItem = document.getElementById('comment-task-select').value;
    const commentText = document.getElementById('new-student-comment').value.trim();

    if (!selectedItem || !commentText) {
        alert("請選擇項目並輸入留言內容！");
        return;
    }

    const task = students[account].tasks.find(t => t.item === selectedItem);
    if (task) {
        task.studentComments.push({
            time: new Date().toLocaleString(),
            role: "學生",
            text: commentText,
        });
        saveStudentData(students);
        alert(`對 [${selectedItem}] 的留言已提交。`);
        document.getElementById('new-student-comment').value = '';
        renderTasks(students[account].tasks, account); // 重新渲染列表
    }
}


// --- 留言歷史彈窗邏輯 (新) ---
function showCommentHistory(taskName, comments) {
    document.getElementById('modal-task-name').textContent = taskName;
    const listDiv = document.getElementById('modal-comments-list');
    listDiv.innerHTML = '';

    comments.forEach(c => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>[${c.role} @ ${c.time}]</strong>: ${c.text}`;
        listDiv.appendChild(p);
    });

    document.getElementById('comment-history-modal').classList.remove('hidden');
}

window.closeModal = function() {
    document.getElementById('comment-history-modal').classList.add('hidden');
}

// --- 教師管理介面邏輯 (重大調整：表格載入與編輯) ---

// ... (teacher-login-form 事件監聽器保留) ...

/** 編輯學生 (將資料載入表單) - 核心變動 */
function editStudent(account) {
    // ... (保留基本資料載入) ...

    const student = students[account];
    // ... (保留基本資料載入) ...

    document.getElementById('student-original-account').value = account; 
    document.getElementById('new-account').value = account;
    document.getElementById('new-name').value = student.name;
    document.getElementById('form-submit-btn').textContent = '更新學生資料';
    
    // 【新】載入成績/活動到表格
    loadTasksToAdminTable(student.tasks);
    
    // 滾動到表單以便編輯
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

/** 新增一行成績/活動表格列 (供新增和編輯使用) */
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
    removeBtn.onclick = () => row.remove();
    actionCell.appendChild(removeBtn);

    const clearCommentBtn = document.createElement('button');
    clearCommentBtn.textContent = '清空學生留言';
    clearCommentBtn.style.marginTop = '5px';
    clearCommentBtn.onclick = () => {
        if (confirm(`確定清空 [${itemInput.value}] 的所有學生留言嗎？`)) {
            // 這個操作只在提交表單時才真正生效，這裡只是做個標記
            row.setAttribute('data-clear-comments', 'true');
            clearCommentBtn.textContent = '已標記清空';
            clearCommentBtn.disabled = true;
        }
    };
    actionCell.appendChild(clearCommentBtn);
    
    // 隱藏原始的 studentComments 數據
    row.setAttribute('data-original-comments', JSON.stringify(task.studentComments));
    row.setAttribute('data-pending-review', task.pendingReview.toString());
}

/** 點擊新增項目按鈕 */
document.getElementById('add-task-btn').addEventListener('click', () => addTaskRow());

/** 重設表單 - 新增清除表格邏輯 */
function resetForm() {
    // ... (保留原有的 reset 邏輯) ...
    document.getElementById('admin-tasks-tbody').innerHTML = ''; // 清空表格
    document.getElementById('student-original-account').value = '';
    document.getElementById('student-form').reset();
    document.getElementById('form-submit-btn').textContent = '新增學生';
}

/** 處理新增/修改表單提交 - 核心變動：從表格收集資料 */
document.getElementById('student-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    // ... (保留頂部欄位收集與檢查邏輯) ...

    const originalAccount = document.getElementById('student-original-account').value;
    const newAccount = document.getElementById('new-account').value.trim();
    const newName = document.getElementById('new-name').value.trim();

    // 1. 收集表格中的成績/活動資料
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
                studentComments: shouldClearComments ? [] : originalComments, // 應用清空標記
                pendingReview: pendingReview
            });
        }
    });

    // ... (保留帳號檢查和儲存邏輯) ...

    if ((!originalAccount || originalAccount !== newAccount) && students[newAccount]) {
        alert(`帳號 ${newAccount} 已存在，請使用其他帳號或先編輯現有資料。`);
        return;
    }
    
    if (originalAccount && originalAccount !== newAccount) {
        delete students[originalAccount];
    }
    
    // 儲存新資料
    students[newAccount] = {
        name: newName,
        tasks: newTasks
    };
    
    saveStudentData(students);
    alert(`學生 ${newName} (帳號: ${newAccount}) 資料已成功 ${originalAccount ? '更新' : '新增'}！`);

    resetForm(); 
    displayStudentList();
});

// ... (displayStudentList, removeStudent 函數保留) ...

// ... (window.onload 保留) ...
