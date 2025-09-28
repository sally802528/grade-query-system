// --- 常量設定 (保持不變) ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin";
const STORAGE_KEY = 'gradeQueryStudents';
const STATUS_OPTIONS = ["已認證", "認證失敗", "審核中", "未完成"];
const COMMENT_CHAR_LIMIT = 300; 

let currentTaskAccount = null;
let currentTaskItem = null;
let isAdminMode = false;
let students = {};
let originalStudentData = null; // 儲存編輯前的快照

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
                  { id: 1, time: new Date(Date.now() - 3600000).toLocaleString(), role: "教師", text: "作業完成得不錯！", isTeacher: true, isBlocked: false, isRecalled: false, recalledBy: null, blockedBy: null },
                  { id: 2, time: new Date(Date.now() - 1800000).toLocaleString(), role: "學生", text: "謝謝老師！我下次會更好。", isTeacher: false, isBlocked: false, isRecalled: false, recalledBy: null, blockedBy: null },
              ]
            },
            { item: "數學作業繳交", status: "未完成", teacherComment: "", pendingReview: false,
              studentComments: [
                  { id: 3, time: new Date(Date.now() - 7200000).toLocaleString(), role: "學生", text: "我還在努力寫，請問截止日是什麼時候？", isTeacher: false, isBlocked: false, isRecalled: false, recalledBy: null, blockedBy: null }
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
                  { id: 4, time: new Date(Date.now() - 1200000).toLocaleString(), role: "教師", text: "報告格式錯誤，請修改後重新提交。", isTeacher: true, isBlocked: false, isRecalled: false, recalledBy: null, blockedBy: null }
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
                s.tasks.forEach(t => {
                     t.studentComments = t.studentComments || []; 
                     t.studentComments.forEach(c => {
                         c.id = c.id || Date.now() + Math.random();
                         c.recalledBy = c.recalledBy || null; 
                         c.blockedBy = c.blockedBy || null; 
                     });
                });
            });
            return data;
        }
    } catch (e) { console.error("Failed to parse stored data, using default.", e); }
    if (!storedData) {
        saveStudentData(DEFAULT_STUDENTS);
        return DEFAULT_STUDENTS;
    }
    return {}; 
}
students = loadStudentData();

function saveStudentData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadOriginalStudentData(account) {
    const student = students[account];
    if (student) {
        // 深層複製學生資料，作為取消編輯的快照
        originalStudentData = JSON.parse(JSON.stringify(student));
    } else {
        originalStudentData = null;
    }
}

function isFormModified() {
    // 檢查表單是否被修改的邏輯（保持不變）
    const originalAccount = document.getElementById('student-original-account').value;
    
    if (!originalStudentData || originalStudentData.account !== originalAccount) {
        return false; 
    }

    if (originalStudentData.account !== document.getElementById('admin-account').value.trim() ||
        originalStudentData.name !== document.getElementById('admin-name').value.trim() ||
        originalStudentData.school !== document.getElementById('admin-school').value.trim() ||
        originalStudentData.class !== document.getElementById('admin-class').value.trim() ||
        (document.getElementById('admin-email') && originalStudentData.email !== document.getElementById('admin-email').value.trim())) {
        return true;
    }
    
    const taskRows = document.querySelectorAll('#admin-tasks-tbody tr');
    if (taskRows.length !== originalStudentData.tasks.length) {
        return true;
    }

    for (let i = 0; i < taskRows.length; i++) {
        const row = taskRows[i];
        const itemInput = row.querySelector('.task-item-input');
        const statusSelect = row.querySelector('.task-status-select');
        
        if (!itemInput || !statusSelect || !originalStudentData.tasks[i]) {
            continue; 
        }

        if (itemInput.value.trim() !== originalStudentData.tasks[i].item || 
            statusSelect.value !== originalStudentData.tasks[i].status) {
            return true;
        }
        
        const currentCommentsLength = JSON.parse(row.getAttribute('data-original-comments') || '[]').length;
        if (currentCommentsLength !== originalStudentData.tasks[i].studentComments.length) {
             return true;
        }
    }

    return false; 
}


/**
 * 處理「新增學生（切換）」按鈕的點擊。
 */
window.switchToNewStudentMode = function() {
    const formSubmitBtn = document.getElementById('form-submit-btn');
    const originalAccountInput = document.getElementById('student-original-account');
    
    const isEditingMode = formSubmitBtn.textContent === '更新學生資料' && originalAccountInput.value;
    
    if (isEditingMode && isFormModified()) {
        if (!confirm("您目前正在編輯中，資料尚未儲存。確定要放棄更改並切換到新增學生介面嗎？\n\n**您對舊學生資料的更改將被丟棄。**")) {
            return; 
        }
    }
    
    // 執行徹底清空和模式切換 (不顯示 alert)
    resetForm(false); 
    
    alert("已切換到新增學生介面，請開始填寫新資料。");
}


// --- 學生查詢介面邏輯 (保持不變) ---
// ... (所有與學生查詢、登入、任務渲染相關的函數保持不變)
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
        errorMessage.textContent = '登入失敗：學號不存在，請檢查。';
        return;
    }
    
    errorMessage.textContent = '';
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').style.display = 'none'; 
    document.getElementById('result-container').classList.remove('hidden');
    
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
        
        // 學生介面點擊留言按鈕
        actionBtn.onclick = () => showCommentModal(account, data.item, false); 
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
// ... (所有與教師登入、登出相關的函數保持不變)

function handleTeacherLoginClick() {
    isAdminMode = false;
    document.getElementById('login-container').classList.add('hidden'); 
    document.getElementById('teacher-login-btn').style.display = 'none';
    document.getElementById('teacher-login-container').classList.remove('hidden');
    document.getElementById('teacher-login-form').reset();
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
        
        // 進入管理介面時，執行一次重設，確保是新增模式
        resetForm(false); 
    } else {
        errorMessage.textContent = '管理密碼錯誤，請重試。';
    }
}


// --- 學生資料 CRUD 邏輯 (教師管理) ---

function editStudent(account) {
    const student = students[account];
    if (!student) return;

    loadOriginalStudentData(account); 
    
    document.getElementById('student-original-account').value = account; 
    
    document.getElementById('admin-account').value = student.account || account; 
    document.getElementById('admin-name').value = student.name || '';
    document.getElementById('admin-school').value = student.school || '';
    document.getElementById('admin-class').value = student.class || '';
    document.getElementById('admin-email').value = student.email || '';
    
    document.getElementById('form-submit-btn').textContent = '更新學生資料';
    
    document.getElementById('switch-to-new-student-btn').classList.remove('hidden');
    
    loadTasksToAdminTable(student.tasks, account); 
    
    document.getElementById('student-form').scrollIntoView({ behavior: 'smooth' });
}

function loadTasksToAdminTable(tasks, account = '') {
    const tbody = document.getElementById('admin-tasks-tbody');
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        // 在編輯模式下，確保傳遞正確的 account
        addTaskRow(task, account);
    });
    
    // 如果是編輯模式，但沒有任何項目，則新增一個空白行
    if (tasks.length === 0 && account !== '') {
        addTaskRow({}, account);
    }
}

/** * 修正 2: 留言按鈕邏輯強化。
 * @param {object} task - 任務資料
 * @param {string} account - 當前編輯的學號。如果是新增模式，則為空字串。
 */
function addTaskRow(task = { item: '', status: '未完成', teacherComment: '', studentComments: [], pendingReview: false }, account = '') {
    const tbody = document.getElementById('admin-tasks-tbody');
    const row = tbody.insertRow();
    
    // 儲存原始項目名稱作為識別 
    row.setAttribute('data-original-item-name', task.item);

    // 1. 項目名稱
    const itemCell = row.insertCell();
    const itemInput = document.createElement('input');
    itemInput.type = 'text';
    itemInput.value = task.item;
    itemInput.className = 'task-item-input';
    itemCell.appendChild(itemInput);

    // 2. 狀態選擇 (保持不變)
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

    // 3. 教師留言狀態 (提示) (保持不變) 
    const commentCell = row.insertCell();
    const latestTeacherComment = task.studentComments.slice().reverse().find(c => c.isTeacher && !c.isRecalled && !c.isBlocked);
    if (latestTeacherComment) {
        commentCell.textContent = latestTeacherComment.text.substring(0, 15) + '...';
        commentCell.title = latestTeacherComment.text;
    } else {
        commentCell.textContent = '無教師留言';
        commentCell.style.color = '#888'; 
    }

    // 4. 留言紀錄按鈕 
    const historyCell = row.insertCell();
    const historyBtn = document.createElement('button');
    const activeComments = task.studentComments.filter(c => !c.isRecalled && !c.isBlocked).length;
    historyBtn.textContent = `留言 (${activeComments})`;
    historyBtn.type = 'button';
    historyBtn.className = 'comment-history-btn secondary-btn';
    historyBtn.style.marginTop = '0';
    historyBtn.style.padding = '5px 10px';
    
    
    // 判斷是否為「新增模式下的未儲存狀態」
    // 如果 account 為空 AND 項目沒有留言 (即為新增模式下的空行)
    const isNewUnsavedRow = (account === '' && activeComments === 0);
    
    if (isNewUnsavedRow) {
        // 新增學生模式且還沒儲存
        historyBtn.textContent = '留言 (0)';
        historyBtn.style.backgroundColor = '#ccc';
        historyBtn.onclick = () => {
             alert('請先填寫學號與項目名稱，並點擊「新增學生」儲存後，才能針對項目進行留言操作。');
        };
    } else {
        // 編輯模式 或 新增模式下已儲存的項目 (有 account)
        historyBtn.onclick = () => {
             const currentAccount = document.getElementById('admin-account').value.trim();
             const currentItemName = itemInput.value.trim();
             
             if (!currentAccount) {
                 alert('學號不能為空！');
                 return;
             }
             if (!currentItemName) {
                 alert('項目名稱不能為空，請先填寫項目名稱！');
                 return;
             }
             
             // 再次檢查學生資料中是否存在該項目，如果不存在，則發出警告
             // 這是為了處理「編輯模式下修改了項目名稱但還沒按更新」的情況
             const taskCheck = getTask(currentAccount, currentItemName);
             if (!taskCheck) {
                 alert('項目資料尚未儲存，請先點擊「更新學生資料」後再開啟留言區！');
                 return;
             }
             
             // 嘗試使用當前表單中的學號和項目名稱開啟留言區
             showCommentModal(currentAccount, currentItemName, true); 
        };
    }
    
    historyCell.appendChild(historyBtn);

    // 5. 操作 (移除) (保持不變)
    const actionCell = row.insertCell();
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '移除';
    removeBtn.type = 'button'; 
    removeBtn.className = 'secondary-btn';
    removeBtn.style.marginTop = '0';
    
    removeBtn.onclick = () => {
        const itemName = itemInput.value.trim();
        const hasComments = task.studentComments.length > 0;
        
        if (itemName === '' && !hasComments) {
            row.remove();
        } else {
             const confirmMsg = "你確定要移除此項目嗎？更新資料後將無法復原。你可以點擊[重設/取消編輯]，將更新前資料恢復。";
             if (confirm(confirmMsg)) {
                  row.remove();
             }
        }
    };
    actionCell.appendChild(removeBtn);
    
    row.setAttribute('data-original-comments', JSON.stringify(task.studentComments));
    row.setAttribute('data-pending-review', task.pendingReview.toString());
}

function handleAddTaksClick() {
    const currentAccount = document.getElementById('admin-account').value.trim();
    // 即使在新增模式，也傳遞當前欄位的 account
    addTaskRow(undefined, currentAccount); 
}

/** * 修正 1: 重設/取消編輯邏輯 (確保徹底清空或恢復)
 * @param {boolean} showAlert - 是否彈出提示 (主要由 switchToNewStudentMode 內部呼叫時為 false)
 */
window.resetForm = function(showAlert = true) {
    const originalAccount = document.getElementById('student-original-account').value;
    const isEditingMode = document.getElementById('form-submit-btn').textContent === '更新學生資料' && originalAccount && originalStudentData;

    if (isEditingMode) {
         // **編輯模式**：恢復為編輯前的資料
         if (originalStudentData) {
              document.getElementById('student-original-account').value = originalStudentData.account; 
              document.getElementById('admin-account').value = originalStudentData.account; 
              document.getElementById('admin-name').value = originalStudentData.name; 
              document.getElementById('admin-school').value = originalStudentData.school;
              document.getElementById('admin-class').value = originalStudentData.class;
              document.getElementById('admin-email').value = originalStudentData.email;
              loadTasksToAdminTable(originalStudentData.tasks, originalStudentData.account);
              
              if (showAlert) alert("已取消編輯，恢復為上次儲存的資料。");
              return; 
         }
    }
    
    // **新增模式** 或 **編輯模式下沒有原始資料**：執行徹底清空 (重設)
    document.getElementById('admin-tasks-tbody').innerHTML = ''; 
    document.getElementById('student-original-account').value = ''; 
    document.getElementById('admin-account').value = ''; 
    document.getElementById('admin-name').value = ''; 
    document.getElementById('admin-school').value = '';
    document.getElementById('admin-class').value = '';
    document.getElementById('admin-email').value = '';
    
    // 立即切換為新增模式 UI
    document.getElementById('form-submit-btn').textContent = '新增學生';
    document.getElementById('switch-to-new-student-btn').classList.add('hidden');
    originalStudentData = null; // 清除快照

    // 確保清空後有一個空行可供輸入
    addTaskRow(); 
    
    if (showAlert) alert("設定項已清空，已切換回新增學生模式。");
}

// ... (handleStudentFormSubmit 邏輯保持不變)

// ... (displayStudentList, removeStudent 邏輯保持不變)

// --- 整合式留言/審核彈窗邏輯 (保持不變) ---

function getTask(account, itemName) {
    const student = students[account];
    if (!student) return null;
    return student.tasks.find(t => t.item === itemName);
}

window.showCommentModal = function(account, itemName, isModalAdminMode) {
    currentTaskAccount = account;
    currentTaskItem = itemName;
    const task = getTask(account, itemName);

    if (!task) {
        // 只有在找不到任務時才應該彈出此警告
        alert(`找不到學生 ${account} 的項目 ${itemName}！請確保學號和項目名稱已儲存。`);
        return;
    }
    
    // 確保 Modal 元素存在且可見
    const modal = document.getElementById('comment-history-modal');
    if (!modal) {
        console.error("Comment history modal element not found!");
        return;
    }
    
    document.getElementById('modal-task-name').textContent = itemName;
    const commentsList = document.getElementById('modal-comments-list');
    commentsList.innerHTML = '';
    
    // 渲染留言
    if (task.studentComments && task.studentComments.length > 0) {
        task.studentComments.slice().reverse().forEach(comment => {
            commentsList.appendChild(renderComment(comment, isModalAdminMode));
        });
    } else {
        commentsList.innerHTML = '<p style="text-align: center; color: #888;">目前沒有留言紀錄。</p>';
    }

    // 顯示留言輸入區和提交審核區 (保持不變)
    const studentCommentArea = document.getElementById('modal-student-comment-area');
    const submissionArea = document.getElementById('modal-submission-area');
    const newCommentTextarea = document.getElementById('modal-new-student-comment');
    
    newCommentTextarea.placeholder = isModalAdminMode ? "輸入給學生的留言..." : "輸入您的留言...";
    newCommentTextarea.value = ''; 
    
    if (isModalAdminMode) {
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

    // 呼叫 Modal 顯示
    modal.classList.remove('hidden');
}

// ... (renderComment, submitCommentFromModal, recallComment, blockComment, confirmSubmissionFromModal, closeModal 邏輯保持不變)


// --- 初始化與事件監聽 ---

document.addEventListener('DOMContentLoaded', function() {
    isAdminMode = false;
    
    // 確保所有容器初始狀態正確
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').style.display = 'block'; 
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('admin-container').classList.add('hidden');
    
    // 假設您在 HTML 中為 Modal 添加了 id="comment-history-modal"
    const modal = document.getElementById('comment-history-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    document.getElementById('switch-to-new-student-btn').classList.add('hidden'); 
    
    document.getElementById('login-form').addEventListener('submit', handleStudentLogin);
    document.getElementById('teacher-login-btn').addEventListener('click', handleTeacherLoginClick);
    document.getElementById('teacher-login-form').addEventListener('submit', handleTeacherLoginFormSubmit);
    
    document.getElementById('student-form').addEventListener('submit', handleStudentFormSubmit);
    
    document.getElementById('add-task-btn').addEventListener('click', handleAddTaksClick);
    
    // **注意：** 由於「重設/取消編輯」按鈕是使用 onclick="resetForm()"，
    // 所以我們不需要在這裡用 ID 或 Class 進行額外綁定。
});
