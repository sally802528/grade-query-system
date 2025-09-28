// --- 常量設定 ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin";
const STORAGE_KEY = 'gradeQueryStudents';
const STATUS_OPTIONS = ["已認證", "認證失敗", "審核中", "未完成"];

let currentTaskAccount = null;
let currentTaskItem = null;
let isAdminMode = false;
let students = {};

// --- 輔助函數：資料持久化 ---
const DEFAULT_STUDENTS = {
    'A123456789': { 
        account: 'A123456789', // 新增基本資料欄位
        name: '林書恩',
        school: '奇美高中',
        class: '二年甲班',
        email: 'li***g@qimei.edu.tw',
        tasks: [
            // 留言結構調整：包含 id, time, role, text, isTeacher, isBlocked, isRecalled
            { item: "國文期中考", status: "已認證", teacherComment: "", pendingReview: false,
              studentComments: [
                  { id: 1, time: new Date(Date.now() - 3600000).toLocaleString(), role: "教師", text: "作業完成得不錯！", isTeacher: true, isBlocked: false, isRecalled: false },
                  { id: 2, time: new Date(Date.now() - 1800000).toLocaleString(), role: "學生", text: "謝謝老師！我下次會更好。", isTeacher: false, isBlocked: false, isRecalled: false },
              ]
            },
            { item: "數學作業繳交", status: "未完成", teacherComment: "", pendingReview: false,
              studentComments: [
                  { id: 3, time: new Date(Date.now() - 7200000).toLocaleString(), role: "學生", text: "我還在努力寫，請問截止日是什麼時候？", isTeacher: false, isBlocked: false, isRecalled: false }
              ] 
            },
        ]
    },
};

function loadStudentData() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    try {
        const data = JSON.parse(storedData);
        if (data && Object.keys(data).length > 0) {
            // 確保舊資料有新的基本欄位
            Object.values(data).forEach(s => {
                s.account = s.account || '';
                s.school = s.school || '奇美高中';
                s.class = s.class || '二年甲班';
                s.email = s.email || 'li***g@qimei.edu.tw';
                s.tasks.forEach(t => {
                     // 處理舊的 teacherComment，將其整合為新留言結構
                     if (t.teacherComment && !t.studentComments.some(c => c.text === t.teacherComment && c.isTeacher)) {
                         t.studentComments.push({
                              id: Date.now(),
                              time: new Date().toLocaleString(),
                              role: "教師",
                              text: t.teacherComment,
                              isTeacher: true,
                              isBlocked: false,
                              isRecalled: false
                         });
                         t.teacherComment = ""; // 清空舊欄位
                     }
                     // 確保每個留言都有 id 欄位 (用於收回/封鎖)
                     t.studentComments.forEach(c => c.id = c.id || Date.now() + Math.random());
                });
            });
            return data;
        }
    } catch (e) { console.error("Failed to parse stored data, using default.", e); }
    saveStudentData(DEFAULT_STUDENTS);
    return DEFAULT_STUDENTS;
}
function saveStudentData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
// 初始化時載入資料
students = loadStudentData();


// --- 學生查詢介面邏輯 (修正基本資料顯示) ---

function handleStudentLogin(event) {
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
    
    // 【變更 9】更新基本資料顯示
    document.getElementById('display-student-id').textContent = studentInfo.account;
    document.getElementById('display-name').textContent = studentInfo.name.charAt(0) + '**' + studentInfo.name.charAt(studentInfo.name.length - 1);
    document.getElementById('display-school').textContent = studentInfo.school;
    document.getElementById('display-class').textContent = studentInfo.class;
    document.getElementById('display-email').textContent = studentInfo.email;
    
    renderTasks(studentInfo.tasks, account);
}

// ... renderTasks 和 logout 保持不變 ...


// --- 整合式留言/審核彈窗邏輯 (重構留言顯示/操作) ---

function renderComment(comment, task, isTeacherMode) {
    const p = document.createElement('p');
    p.classList.add('comment-item');
    p.setAttribute('data-comment-id', comment.id);

    // 【變更 2】區分教師留言顏色
    if (comment.isTeacher) {
        p.style.backgroundColor = '#eaf7ff'; // 淺藍色背景
        p.style.borderLeft = '4px solid #007bff';
    } else if (comment.role === '系統') {
        p.style.backgroundColor = '#f0f0f0';
        p.style.fontStyle = 'italic';
        p.style.color = '#888';
    }
    
    // 檢查是否收回或封鎖
    if (comment.isRecalled) {
        p.innerHTML = `[${comment.role}] 已收回此訊息`;
        p.style.color = 'red';
        p.style.fontStyle = 'italic';
        return p;
    }
    
    if (comment.isBlocked) {
        // 【變更 4】封鎖留言
        p.innerHTML = `<strong>[${comment.role} @ ${comment.time}]</strong>: <span style="font-size: 1.5em;">&#9608;&#9608;&#9608;&#9608;</span> (此留言已被老師封鎖)`;
        p.style.color = 'red';
        return p;
    }

    p.innerHTML = `<strong>[${comment.role} @ ${comment.time}]</strong>: ${comment.text}`;

    const actionDiv = document.createElement('div');
    actionDiv.style.float = 'right';

    // 封鎖按鈕 (僅教師模式)
    if (isTeacherMode && comment.role !== '系統') {
        const blockBtn = document.createElement('button');
        blockBtn.textContent = '封鎖';
        blockBtn.className = 'secondary-btn';
        blockBtn.style.marginLeft = '10px';
        blockBtn.style.padding = '2px 5px';
        blockBtn.onclick = () => blockComment(task.account, task.item, comment.id);
        actionDiv.appendChild(blockBtn);
    }

    // 收回按鈕
    // 學生只能收回自己的，教師可以收回所有非系統留言
    const canRecall = (isTeacherMode && comment.role !== '系統') || (!isTeacherMode && comment.role === '學生' && !comment.isTeacher);

    if (canRecall) {
        const recallBtn = document.createElement('button');
        recallBtn.textContent = '收回';
        recallBtn.className = 'secondary-btn';
        recallBtn.style.marginLeft = '10px';
        recallBtn.style.padding = '2px 5px';
        recallBtn.onclick = () => recallComment(task.account, task.item, comment.id);
        actionDiv.appendChild(recallBtn);
    }
    
    p.appendChild(actionDiv);
    return p;
}


function showCommentModal(account, itemName) {
    currentTaskAccount = account;
    currentTaskItem = itemName;
    
    const student = students[account];
    const task = student.tasks.find(t => t.item === itemName);
    if (!task) return;

    document.getElementById('modal-task-name').textContent = itemName;
    
    const listDiv = document.getElementById('modal-comments-list');
    listDiv.innerHTML = '';
    
    // 【變更 2 & 6】直接渲染所有留言，無需置頂教師留言
    task.studentComments
        .sort((a, b) => new Date(a.time) - new Date(b.time)) // 依時間升序排列
        .forEach(comment => {
            const commentElement = renderComment(comment, { account, item: itemName }, isAdminMode);
            listDiv.appendChild(commentElement);
        });

    // 學生留言區塊 (教師模式下隱藏)
    const isStudent = !isAdminMode;
    document.getElementById('modal-student-comment-area').style.display = isStudent ? 'block' : 'none';
    document.getElementById('modal-submission-area').style.display = isStudent ? 'block' : 'none';

    // ... (設定學生提交按鈕狀態邏輯保持不變) ...
    if (isStudent) {
         const submissionBtn = document.querySelector('#modal-submission-area .submission-btn');
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
    
    document.getElementById('modal-new-student-comment').value = '';
    document.getElementById('comment-history-modal').classList.remove('hidden');
    
    // 確保捲動到最底部 (聊天室效果)
    listDiv.scrollTop = listDiv.scrollHeight;
}


window.submitStudentCommentFromModal = function() {
    const commentText = document.getElementById('modal-new-student-comment').value.trim();
    if (!commentText || !currentTaskAccount || !currentTaskItem) {
        alert("請輸入留言內容。");
        return;
    }
    
    const isTeacher = isAdminMode; // 教師提交的留言
    const role = isTeacher ? '教師' : '學生';

    const task = students[currentTaskAccount].tasks.find(t => t.item === currentTaskItem);
    if (task) {
        // 【變更 6】教師留言也直接推入 studentComments 陣列
        task.studentComments.push({
            id: Date.now() + Math.random(), // 確保 ID 唯一
            time: new Date().toLocaleString(),
            role: role,
            text: commentText,
            isTeacher: isTeacher,
            isBlocked: false,
            isRecalled: false
        });
        saveStudentData(students);
        alert(`對 [${currentTaskItem}] 的留言已提交。`);
        
        document.getElementById('modal-new-student-comment').value = '';
        showCommentModal(currentTaskAccount, currentTaskItem);
        if (!isAdminMode) {
             renderTasks(students[currentTaskAccount].tasks, currentTaskAccount);
        }
    }
}

// 【變更 3】收回留言功能
function recallComment(account, itemName, commentId) {
    // 【變更 3】跳出警告
    if (!confirm("你確定要收回？收回後訊息將會刪除並顯示 [收回的人] 已收回此訊息。")) {
        return;
    }
    
    const task = students[account].tasks.find(t => t.item === itemName);
    if (!task) return;

    const comment = task.studentComments.find(c => c.id === commentId);
    if (comment) {
        // 學生只能收回自己的留言
        if (!isAdminMode && comment.role !== '學生') {
             alert('您只能收回自己發送的留言！');
             return;
        }

        comment.isRecalled = true;
        comment.text = ""; // 清空內容
        
        // 【變更 3】模擬系統顯示收回訊息
        task.studentComments.push({
            id: Date.now() + Math.random(),
            time: new Date().toLocaleString(),
            role: "系統",
            text: `[${comment.isTeacher ? '教師' : '學生'}] 已收回此訊息`,
            isTeacher: false,
            isBlocked: false,
            isRecalled: false
        });
        
        saveStudentData(students);
        showCommentModal(account, itemName);
    }
}

// 【變更 4】封鎖留言功能 (僅教師可用)
function blockComment(account, itemName, commentId) {
    if (!isAdminMode) return;
    
    const task = students[account].tasks.find(t => t.item === itemName);
    if (!task) return;

    const comment = task.studentComments.find(c => c.id === commentId);
    if (comment) {
        comment.isBlocked = true;
        saveStudentData(students);
        showCommentModal(account, itemName);
    }
}

// ... confirmSubmissionFromModal 和 closeModal 保持不變 ...


// --- 教師介面切換與登入 ---

// ... handleTeacherLoginClick, hideTeacherLogin, handleTeacherLoginFormSubmit 保持不變 ...

// --- 學生資料 CRUD 邏輯 (教師管理) ---

/** 載入學生資料到編輯表單 (【變更 9】載入所有基本資料) */
function editStudent(account) {
    const student = students[account];
    if (!student) return;

    document.getElementById('student-original-account').value = account; 
    document.getElementById('admin-account').value = student.account || account; // 帳號
    document.getElementById('admin-name').value = student.name; // 姓名
    document.getElementById('admin-school').value = student.school || ''; // 學校
    document.getElementById('admin-class').value = student.class || ''; // 班級
    document.getElementById('admin-email').value = student.email || ''; // E-mail
    
    document.getElementById('form-submit-btn').textContent = '更新學生資料';
    
    loadTasksToAdminTable(student.tasks, account); 
    
    document.getElementById('student-form').scrollIntoView({ behavior: 'smooth' });
}

// ... loadTasksToAdminTable 保持不變 ...

/** 新增一行成績/活動表格列 */
function addTaskRow(task = { item: '', status: '未完成', teacherComment: '', studentComments: [], pendingReview: false }, account = '') {
    const tbody = document.getElementById('admin-tasks-tbody');
    const row = tbody.insertRow();
    
    // ... (1-3 項目名稱、狀態、教師留言輸入框 保持不變) ...
    const itemCell = row.insertCell();
    const itemInput = document.createElement('input');
    itemInput.type = 'text';
    itemInput.value = task.item;
    itemInput.className = 'task-item-input';
    itemCell.appendChild(itemInput);

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

    const commentCell = row.insertCell();
    // 移除單獨的教師留言輸入框，因為【變更 6】已整合到留言區中
    commentCell.textContent = '請點擊留言紀錄新增/修改留言';
    commentCell.style.color = '#888'; 

    // 4. 留言紀錄按鈕 (略)
    const historyCell = row.insertCell();
    const historyBtn = document.createElement('button');
    historyBtn.textContent = `留言 (${task.studentComments.filter(c => !c.isRecalled).length})`;
    historyBtn.type = 'button';
    historyBtn.className = 'comment-history-btn';
    
    if (account) { 
        historyBtn.onclick = () => showCommentModal(account, itemInput.value.trim()); 
    } else {
        historyBtn.disabled = true; 
    }
    historyCell.appendChild(historyBtn);

    // 5. 操作 (移除)
    const actionCell = row.insertCell();
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '移除';
    removeBtn.type = 'button'; 
    // 【變更 7】移除項目跳出警告
    removeBtn.onclick = () => {
        if (confirm("你確定要移除此項目嗎？此操作將無法復原。")) {
             row.remove();
        }
    };
    actionCell.appendChild(removeBtn);
    
    // 存儲原始數據 (保留原始的 studentComments 結構)
    row.setAttribute('data-original-comments', JSON.stringify(task.studentComments));
    row.setAttribute('data-pending-review', task.pendingReview.toString());
}

// ... handleAddTaksClick 和 resetForm 保持不變 ...

/** 處理新增/修改表單提交 - (【變更 8】新增警告，【變更 9】儲存所有基本資料) */
function handleStudentFormSubmit(event) {
    event.preventDefault();
    
    // 【變更 8】更新資料應跳出警告
    if (!confirm("按下確定後將更新學生資料，移除/變更的操作將無法復原。請再次確認。")) {
        return;
    }
    
    const originalAccount = document.getElementById('student-original-account').value;
    const newAccount = document.getElementById('admin-account').value.trim(); // 抓取新的 ID
    
    // 【變更 9】抓取所有基本資料
    const newName = document.getElementById('admin-name').value.trim();
    const newSchool = document.getElementById('admin-school').value.trim();
    const newClass = document.getElementById('admin-class').value.trim();
    const newEmail = document.getElementById('admin-email').value.trim();


    if (!newAccount) { alert("帳號不能為空！"); return; }
    
    const taskRows = document.querySelectorAll('#admin-tasks-tbody tr');
    const newTasks = [];

    taskRows.forEach(row => {
        const itemInput = row.querySelector('.task-item-input');
        const statusSelect = row.querySelector('.task-status-select');
        // const commentInput = row.querySelector('.task-comment-input'); // 已移除

        const originalComments = JSON.parse(row.getAttribute('data-original-comments') || '[]');
        const pendingReview = row.getAttribute('data-pending-review') === 'true';
        const shouldClearComments = row.getAttribute('data-clear-comments') === 'true';

        if (itemInput.value.trim()) {
            newTasks.push({
                item: itemInput.value.trim(),
                status: statusSelect.value,
                // teacherComment: commentInput.value.trim(), // 已移除
                teacherComment: "", // 保持為空，所有留言在 studentComments 中
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
    
    // 【變更 9】儲存所有欄位
    students[newAccount] = {
        account: newAccount,
        name: newName,
        school: newSchool,
        class: newClass,
        email: newEmail,
        tasks: newTasks
    };
    
    saveStudentData(students);
    alert(`學生 ${newName} (帳號: ${newAccount}) 資料已成功 ${originalAccount ? '更新' : '新增'}！`);

    displayStudentList();
    
    if (originalAccount || document.getElementById('form-submit-btn').textContent === '更新學生資料') {
         editStudent(newAccount);
    } else {
        resetForm(); 
    }
}


/** 顯示學生列表 - (【變更 1】編輯改名成開啟) */
function displayStudentList() {
    const tbody = document.querySelector('#student-list-table tbody');
    if (!tbody) return; 

    tbody.innerHTML = ''; 

    for (const account in students) {
        const student = students[account];
        const row = tbody.insertRow();
        
        row.insertCell().textContent = account;
        row.insertCell().textContent = student.name;
        
        const actionCell = row.insertCell();
        
        const editBtn = document.createElement('button');
        editBtn.textContent = '開啟'; // 【變更 1】編輯改名成開啟
        editBtn.onclick = () => editStudent(account);
        actionCell.appendChild(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '移除';
        removeBtn.onclick = () => removeStudent(account, student.name);
        actionCell.appendChild(removeBtn);
    }
}

/** 移除學生 (【變更 7】新增警告) */
function removeStudent(account, name) {
    if (confirm(`你確定要移除學生 ${name} (帳號: ${account}) 嗎？此操作將無法復原。`)) {
        delete students[account];
        saveStudentData(students);
        displayStudentList(); 
        resetForm(); 
    }
}


// --- 初始化與事件監聽 ---

document.addEventListener('DOMContentLoaded', function() {
    students = loadStudentData(); 
    isAdminMode = false;
    
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('admin-container').classList.add('hidden');
    document.getElementById('comment-history-modal').classList.add('hidden');
    
    document.getElementById('login-form').addEventListener('submit', handleStudentLogin);
    document.getElementById('teacher-login-btn').addEventListener('click', handleTeacherLoginClick);
    document.getElementById('teacher-login-form').addEventListener('submit', handleTeacherLoginFormSubmit);
    document.getElementById('student-form').addEventListener('submit', handleStudentFormSubmit);
    document.getElementById('add-task-btn').addEventListener('click', handleAddTaksClick);
});
