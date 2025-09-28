// --- 常量設定 ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin";
const STORAGE_KEY = 'gradeQueryStudents';
const STATUS_OPTIONS = ["已認證", "認證失敗", "審核中", "未完成"];
const COMMENT_CHAR_LIMIT = 300; // 修正 2: 留言字數限制

let currentTaskAccount = null;
let currentTaskItem = null;
let isAdminMode = false;
let students = {};

// --- 輔助函數：資料持久化與預設資料 (保持不變) ---
const DEFAULT_STUDENTS = {
    'A123456789': { 
        account: 'A123456789', 
        name: '林書恩',
        school: '奇美高中',
        class: '二年甲班',
        email: 'li***g@qimei.edu.tw',
        tasks: [
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
    'B987654321': { 
        account: 'B987654321', 
        name: '陳美玲',
        school: '奇美高中',
        class: '二年甲班',
        email: 'ch***n@qimei.edu.tw',
        tasks: [
            { item: "期末專題報告", status: "認證失敗", teacherComment: "", pendingReview: false,
              studentComments: [
                  { id: 4, time: new Date(Date.now() - 1200000).toLocaleString(), role: "教師", text: "報告格式錯誤，請修改後重新提交。", isTeacher: true, isBlocked: false, isRecalled: false }
              ] 
            },
        ]
    }
};

function loadStudentData() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    try {
        const data = JSON.parse(storedData);
        if (data && Object.keys(data).length > 0) {
            Object.values(data).forEach(s => {
                s.account = s.account || s.newAccount || ''; 
                s.school = s.school || '奇美高中';
                s.class = s.class || '二年甲班';
                s.email = s.email || 'li***g@qimei.edu.tw';
                s.tasks.forEach(t => {
                     t.studentComments = t.studentComments || []; 
                     t.studentComments.forEach(c => c.id = c.id || Date.now() + Math.random());
                });
            });
            return data;
        }
    } catch (e) { console.error("Failed to parse stored data, using default.", e); }
    saveStudentData(DEFAULT_STUDENTS);
    return DEFAULT_STUDENTS;
}
students = loadStudentData();

function saveStudentData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// --- 學生查詢介面邏輯 (保持不變) ---

function handleStudentLogin(event) {
    event.preventDefault();
    // 取得學號 (account)
    const account = document.getElementById('account').value.trim();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const studentInfo = students[account];
    
    if (password !== STUDENT_PASSWORD) {
        errorMessage.textContent = '登入失敗：密碼錯誤，請檢查。';
        return;
    }
    if (!studentInfo) {
        errorMessage.textContent = '登入失敗：學號不存在，請檢查。';
        return;
    }
    
    errorMessage.textContent = '';
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').style.display = 'none'; 
    document.getElementById('result-container').classList.remove('hidden');
    
    // 顯示基本資料
    document.getElementById('display-student-id').textContent = studentInfo.account;
    document.getElementById('display-name').textContent = studentInfo.name.charAt(0) + '**' + studentInfo.name.charAt(studentInfo.name.length - 1);
    document.getElementById('display-school').textContent = studentInfo.school;
    document.getElementById('display-class').textContent = studentInfo.class;
    document.getElementById('display-email').textContent = studentInfo.email;

    renderTasks(studentInfo.tasks, account);
}

function renderTasks(tasks, account) {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    
    tasks.forEach((data) => {
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
             actionBtn.style.backgroundColor = '#2980b9';
        } else {
            actionBtn.textContent = '查看留言';
            actionBtn.className = 'secondary-btn';
        }
        
        actionBtn.onclick = () => showCommentModal(account, data.item);
        actionCell.appendChild(actionBtn);
    });
}

window.logout = function() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').style.display = 'block'; 
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('login-form').reset();
}


// --- 教師介面切換與登入 (保持不變) ---

function handleTeacherLoginClick() {
    isAdminMode = false;
    document.getElementById('login-container').classList.add('hidden'); 
    document.getElementById('teacher-login-btn').style.display = 'none';
    document.getElementById('teacher-login-container').classList.remove('hidden');
    document.getElementById('teacher-error-message').textContent = ''; 
}

window.hideTeacherLogin = function() {
    isAdminMode = false; 
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').style.display = 'block';
    document.getElementById('teacher-login-form').reset();
}

window.teacherLogout = function() {
    isAdminMode = false;
    document.getElementById('admin-container').classList.add('hidden');
    hideTeacherLogin(); 
}

function handleTeacherLoginFormSubmit(event) {
    event.preventDefault();
    const password = document.getElementById('teacher-password').value;
    const errorMessage = document.getElementById('teacher-error-message');

    if (password === TEACHER_PASSWORD) {
        errorMessage.textContent = '';
        isAdminMode = true; 
        document.getElementById('teacher-login-container').classList.add('hidden');
        document.getElementById('admin-container').classList.remove('hidden');
        displayStudentList();
        resetForm();
    } else {
        errorMessage.textContent = '管理密碼錯誤，請重試。';
    }
}


// --- 學生資料 CRUD 邏輯 (教師管理) ---

function editStudent(account) {
    const student = students[account];
    if (!student) return;

    document.getElementById('student-original-account').value = account; 
    
    // 載入學號/帳號
    document.getElementById('admin-account').value = student.account || account; 
    document.getElementById('admin-name').value = student.name || '';
    document.getElementById('admin-school').value = student.school || '';
    document.getElementById('admin-class').value = student.class || '';
    document.getElementById('admin-email').value = student.email || '';
    
    document.getElementById('form-submit-btn').textContent = '更新學生資料';
    
    loadTasksToAdminTable(student.tasks, account); 
    
    document.getElementById('student-form').scrollIntoView({ behavior: 'smooth' });
}

function loadTasksToAdminTable(tasks, account = '') {
    const tbody = document.getElementById('admin-tasks-tbody');
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        addTaskRow(task, account);
    });
}

/** 教師介面渲染：確保五欄渲染正確，特別是留言按鈕的綁定 */
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

    // 3. 教師留言狀態 (提示) 
    const commentCell = row.insertCell();
    const latestTeacherComment = task.studentComments.find(c => c.isTeacher && !c.isRecalled && !c.isBlocked);
    if (latestTeacherComment) {
        commentCell.textContent = latestTeacherComment.text.substring(0, 15) + '...';
        commentCell.title = latestTeacherComment.text;
    } else {
        commentCell.textContent = '無教師留言';
        commentCell.style.color = '#888'; 
    }

    // 4. 留言紀錄按鈕 (修正 3: 新增項目後留言按鈕提示)
    const historyCell = row.insertCell();
    const historyBtn = document.createElement('button');
    const activeComments = task.studentComments.filter(c => !c.isRecalled && !c.isBlocked).length;
    historyBtn.textContent = `留言 (${activeComments})`;
    historyBtn.type = 'button';
    historyBtn.className = 'comment-history-btn secondary-btn';
    historyBtn.style.marginTop = '0';
    historyBtn.style.padding = '5px 10px';
    
    // 檢查是否為新項目 (itemInput.value 是空的) 或新學生 (account 是空的)
    if (!task.item) {
        historyBtn.textContent = '留言 (0)';
        historyBtn.style.backgroundColor = '#ccc';
        historyBtn.onclick = () => {
             alert('新增項目後，請先點擊「新增學生」或「更新學生資料」儲存，才可建立留言功能。');
        };
    } else {
        // 如果是舊項目，正常綁定開啟彈窗
        historyBtn.onclick = () => {
             const currentAccount = document.getElementById('admin-account').value.trim();
             const currentItemName = itemInput.value.trim();
             if (currentAccount && currentItemName) {
                 showCommentModal(currentAccount, currentItemName); 
             } else {
                 alert('請先填寫學號和項目名稱！');
             }
        };
    }
    
    historyCell.appendChild(historyBtn);

    // 5. 操作 (移除) 
    const actionCell = row.insertCell();
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '移除';
    removeBtn.type = 'button'; 
    removeBtn.className = 'secondary-btn';
    removeBtn.style.marginTop = '0';
    // 修正 5: 移除項目的警告文字
    removeBtn.onclick = () => {
        const confirmMsg = "你確定要移除此項目嗎？更新資料後將無法復原。你可以點擊[重設/取消編輯]，將更新前資料恢復。";
        if (confirm(confirmMsg)) {
             row.remove();
        }
    };
    actionCell.appendChild(removeBtn);
    
    row.setAttribute('data-original-comments', JSON.stringify(task.studentComments));
    row.setAttribute('data-pending-review', task.pendingReview.toString());
}

function handleAddTaksClick() {
    const currentAccount = document.getElementById('admin-account').value.trim();
    addTaskRow(undefined, currentAccount);
}

window.resetForm = function() {
    document.getElementById('admin-tasks-tbody').innerHTML = '';
    document.getElementById('student-original-account').value = '';
    
    document.getElementById('admin-account').value = ''; 
    document.getElementById('admin-name').value = ''; 
    document.getElementById('admin-school').value = '';
    document.getElementById('admin-class').value = '';
    document.getElementById('admin-email').value = '';
    
    document.getElementById('form-submit-btn').textContent = '新增學生';
}

function handleStudentFormSubmit(event) {
    event.preventDefault();
    
    if (!confirm("按下確定後將更新學生資料，移除/變更的操作將無法復原。請再次確認。")) {
        return;
    }
    
    const originalAccount = document.getElementById('student-original-account').value;
    const newAccount = document.getElementById('admin-account').value.trim(); // 這是學號
    
    const newName = document.getElementById('admin-name').value.trim();
    const newSchool = document.getElementById('admin-school').value.trim();
    const newClass = document.getElementById('admin-class').value.trim();
    const newEmail = document.getElementById('admin-email').value.trim();

    if (!newAccount) { alert("學號不能為空！"); return; }
    
    const taskRows = document.querySelectorAll('#admin-tasks-tbody tr');
    const newTasks = [];

    taskRows.forEach(row => {
        const itemInput = row.querySelector('.task-item-input');
        const statusSelect = row.querySelector('.task-status-select');

        const originalComments = JSON.parse(row.getAttribute('data-original-comments') || '[]');
        const pendingReview = row.getAttribute('data-pending-review') === 'true';
        
        if (itemInput && itemInput.value.trim() && statusSelect) {
            newTasks.push({
                item: itemInput.value.trim(),
                status: statusSelect.value,
                teacherComment: "", 
                studentComments: originalComments, 
                pendingReview: pendingReview
            });
        }
    });
    
    if ((!originalAccount || originalAccount !== newAccount) && students[newAccount]) {
        alert(`學號 ${newAccount} 已存在，請使用其他學號或先編輯現有資料。`);
        return;
    }
    
    if (originalAccount && originalAccount !== newAccount) {
        delete students[originalAccount];
    }
    
    students[newAccount] = {
        account: newAccount,
        name: newName,
        school: newSchool,
        class: newClass,
        email: newEmail,
        tasks: newTasks
    };
    
    saveStudentData(students);
    alert(`學生 ${newName} (學號: ${newAccount}) 資料已成功 ${originalAccount ? '更新' : '新增'}！`);

    displayStudentList();
    
    if (originalAccount || document.getElementById('form-submit-btn').textContent === '更新學生資料') {
         editStudent(newAccount);
    } else {
        resetForm(); 
    }
}


function displayStudentList() {
    const tbody = document.getElementById('student-list-tbody'); 
    if (!tbody) return; 

    tbody.innerHTML = ''; 

    for (const account in students) {
        const student = students[account];
        const row = tbody.insertRow();
        
        row.insertCell().textContent = account; // 顯示學號
        row.insertCell().textContent = student.name;
        
        const actionCell = row.insertCell();
        
        const editBtn = document.createElement('button');
        editBtn.textContent = '編輯'; 
        editBtn.className = 'primary-btn';
        editBtn.onclick = () => editStudent(account);
        actionCell.appendChild(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '移除';
        removeBtn.className = 'logout-btn';
        removeBtn.style.backgroundColor = '#e74c3c';
        removeBtn.onclick = () => removeStudent(account, student.name);
        actionCell.appendChild(removeBtn);
    }
}

function removeStudent(account, name) {
    if (confirm(`確定要移除學生 ${name} (學號: ${account}) 的所有資料嗎？此操作無法復原！`)) {
        delete students[account];
        saveStudentData(students);
        displayStudentList();
        resetForm();
        alert(`${name} 的資料已移除。`);
    }
}

// --- 整合式留言/審核彈窗邏輯 (修正 2: 留言字數限制) ---

function getTask(account, itemName) {
    const student = students[account];
    if (!student) return null;
    return student.tasks.find(t => t.item === itemName);
}

function renderComment(comment, isTask) {
    // 渲染函數保持不變
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment-item';
    commentDiv.style.backgroundColor = comment.isTeacher ? '#ecf0f1' : '#e8f6f3';

    if (comment.isBlocked) {
        commentDiv.innerHTML = `<em>此留言已被管理員屏蔽。</em>`;
        return commentDiv;
    }
    if (comment.isRecalled) {
        commentDiv.innerHTML = `<em>此留言已被發送者撤回。</em>`;
        return commentDiv;
    }
    
    let content = `
        <strong>${comment.role}</strong> (<small>${comment.time}</small>):<br>
        ${comment.text.replace(/\n/g, '<br>')}
    `;
    
    commentDiv.innerHTML = content;
    
    const isTeacherOfStudent = isAdminMode && (currentTaskAccount === document.getElementById('admin-account').value);
    
    if (isTeacherOfStudent || (!comment.isTeacher && !isAdminMode)) {
         const actionContainer = document.createElement('div');
         actionContainer.style.marginTop = '5px';

         if (!comment.isTeacher && !isAdminMode) {
            const recallBtn = document.createElement('button');
            recallBtn.textContent = '撤回';
            recallBtn.className = 'secondary-btn';
            recallBtn.style.padding = '3px 8px';
            recallBtn.style.fontSize = '0.8em';
            recallBtn.onclick = () => recallComment(comment.id, currentTaskAccount, currentTaskItem);
            actionContainer.appendChild(recallBtn);
         } else if (isTeacherOfStudent) {
             const blockBtn = document.createElement('button');
            blockBtn.textContent = comment.isTeacher ? '撤回' : '屏蔽';
            blockBtn.className = 'logout-btn';
            blockBtn.style.padding = '3px 8px';
            blockBtn.style.fontSize = '0.8em';
            blockBtn.style.backgroundColor = comment.isTeacher ? '#f1c40f' : '#e74c3c';
            blockBtn.onclick = () => comment.isTeacher ? recallComment(comment.id, currentTaskAccount, currentTaskItem) : blockComment(comment.id, currentTaskAccount, currentTaskItem);
            actionContainer.appendChild(blockBtn);
         }
         commentDiv.appendChild(actionContainer);
    }
    
    return commentDiv;
}

window.showCommentModal = function(account, itemName) {
    currentTaskAccount = account;
    currentTaskItem = itemName;
    const task = getTask(account, itemName);

    if (!task) {
        alert("找不到該項目或學生資料！");
        return;
    }
    
    document.getElementById('modal-task-name').textContent = itemName;
    const commentsList = document.getElementById('modal-comments-list');
    commentsList.innerHTML = '';
    
    if (task.studentComments && task.studentComments.length > 0) {
        task.studentComments.slice().reverse().forEach(comment => {
            commentsList.appendChild(renderComment(comment, task));
        });
    } else {
        commentsList.innerHTML = '<p style="text-align: center; color: #888;">目前沒有留言紀錄。</p>';
    }

    const studentCommentArea = document.getElementById('modal-student-comment-area');
    const submissionArea = document.getElementById('modal-submission-area');
    const newCommentTextarea = document.getElementById('modal-new-student-comment');
    
    newCommentTextarea.placeholder = isAdminMode ? "輸入給學生的留言..." : "輸入您的留言...";
    
    if (isAdminMode) {
        studentCommentArea.classList.remove('hidden');
        submissionArea.classList.add('hidden');
    } else {
        studentCommentArea.classList.remove('hidden');
        submissionArea.classList.remove('hidden');
        
        const submissionBtn = submissionArea.querySelector('.submission-btn');
        const submissionMsg = document.getElementById('modal-submission-message');
        
        if (task.status === '審核中') {
            submissionMsg.textContent = '此項目已提交審核，請耐心等待教師回覆。';
            submissionBtn.style.display = 'none';
        } else if (task.status === '已認證') {
            submissionMsg.textContent = '此項目已通過認證，若有疑問可留言聯繫教師。';
            submissionBtn.style.display = 'none';
        } else {
            submissionMsg.textContent = '完成後，請點擊下方按鈕提交審核。';
            submissionBtn.textContent = '提交完成/重新審核';
            submissionBtn.style.display = 'block';
        }
    }

    document.getElementById('comment-history-modal').classList.remove('hidden');
}

window.submitCommentFromModal = function() {
    const newCommentTextarea = document.getElementById('modal-new-student-comment');
    const commentText = newCommentTextarea.value.trim();
    
    // 修正 2: 留言字數限制檢查
    if (!commentText) {
        alert("留言內容不能為空。");
        return;
    }
    if (commentText.length > COMMENT_CHAR_LIMIT) {
         alert(`留言內容超出 ${COMMENT_CHAR_LIMIT} 字限制，請刪減後重新提交。`);
        return;
    }

    const task = getTask(currentTaskAccount, currentTaskItem);
    if (!task) return;

    const newComment = {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleString(),
        role: isAdminMode ? "教師" : "學生",
        text: commentText,
        isTeacher: isAdminMode,
        isBlocked: false,
        isRecalled: false
    };

    task.studentComments.push(newComment);
    
    if (isAdminMode && !task.teacherComment) {
         task.teacherComment = newComment.text; 
    }
    
    saveStudentData(students);
    newCommentTextarea.value = '';
    
    showCommentModal(currentTaskAccount, currentTaskItem);
    
    if (isAdminMode) {
        editStudent(currentTaskAccount); 
    }
}

window.recallComment = function(commentId, account, itemName) {
    if (!confirm("確定要撤回此留言嗎？")) return;
    const task = getTask(account, itemName);
    const comment = task.studentComments.find(c => c.id === commentId);

    if (comment && ((comment.isTeacher && isAdminMode) || (!comment.isTeacher && !isAdminMode))) {
        comment.isRecalled = true;
        saveStudentData(students);
        showCommentModal(account, itemName);
        if (isAdminMode) editStudent(account); 
    }
}

window.blockComment = function(commentId, account, itemName) {
    if (!isAdminMode || !confirm("確定要屏蔽此留言嗎？此動作將對所有使用者隱藏。")) return;
    const task = getTask(account, itemName);
    const comment = task.studentComments.find(c => c.id === commentId);
    
    if (comment) {
        comment.isBlocked = true;
        saveStudentData(students);
        showCommentModal(account, itemName);
        editStudent(account); 
    }
}

window.confirmSubmissionFromModal = function() {
    if (isAdminMode || !currentTaskAccount || !currentTaskItem) return;
    
    const task = getTask(currentTaskAccount, currentTaskItem);
    if (!task) return;
    
    if (task.status === '已認證') {
        alert("此項目已認證通過，無需重新提交。如需申訴請留言聯繫教師。");
        return;
    }
    
    if (confirm("確認要將此項目標記為「提交審核」嗎？")) {
        task.status = '審核中';
        task.pendingReview = true;
        
        task.studentComments.push({
            id: Date.now() + Math.random(),
            time: new Date().toLocaleString(),
            role: "系統/學生",
            text: "已提交審核，請老師查收。",
            isTeacher: false,
            isBlocked: false,
            isRecalled: false
        });
        
        saveStudentData(students);
        
        const studentInfo = students[currentTaskAccount];
        renderTasks(studentInfo.tasks, currentTaskAccount);
        showCommentModal(currentTaskAccount, currentTaskItem);
    }
}

window.closeModal = function() {
    document.getElementById('comment-history-modal').classList.add('hidden');
    currentTaskAccount = null;
    currentTaskItem = null;
}


// --- 初始化與事件監聽 (保持不變) ---

document.addEventListener('DOMContentLoaded', function() {
    isAdminMode = false;
    
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').style.display = 'block'; 
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
