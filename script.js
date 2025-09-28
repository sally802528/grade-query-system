// --- 常量設定 ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin"; // 新增教師密碼
const STORAGE_KEY = 'gradeQueryStudents';

// --- 輔助函數：資料持久化 ---

/** * 從 localStorage 載入資料。如果沒有，則使用預設模擬資料。
 * @returns {Object} 學生資料物件
 */
function loadStudentData() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        return JSON.parse(storedData);
    }
    // 預設模擬資料 (如果 localStorage 裡沒有任何資料)
    return {
        'A123456789': { 
            name: '林書恩', // 增加姓名欄位
            tasks: [
                { item: "國文期中考", completed: true },
                { item: "數學作業繳交", completed: true },
                { item: "社團點名出席", completed: false },
                { item: "服務學習時數", completed: true },
                { item: "校內英文競賽", completed: false }
            ]
        },
        'B987654321': { 
            name: '陳美玲',
            tasks: [
                { item: "國文期中考", completed: true },
                { item: "專題報告繳交", completed: false }
            ]
        }
    };
}

/** * 將學生資料存入 localStorage 
 * @param {Object} data - 學生資料物件
 */
function saveStudentData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 初始化時載入資料
let students = loadStudentData();


// --- 學生查詢介面邏輯 (原有的基礎上微調) ---

document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const school = document.getElementById('school').value.trim();
    const studentClass = document.getElementById('class').value.trim();
    const account = document.getElementById('account').value.trim();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const studentInfo = students[account];

    // 1. 密碼驗證
    if (password !== STUDENT_PASSWORD) {
        errorMessage.textContent = '登入失敗：密碼錯誤，請檢查。';
        return;
    }

    // 2. 帳號/資料驗證
    if (!studentInfo) {
        errorMessage.textContent = '登入失敗：帳號不存在，請檢查。';
        return;
    }

    // 3. 登入成功
    errorMessage.textContent = '';
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').classList.add('hidden'); // 登入學生介面時隱藏教師入口
    document.getElementById('result-container').classList.remove('hidden');

    // 4. 顯示基本資料 (加入個資遮擋處理)
    const fullName = studentInfo.name;
    const maskedName = fullName.charAt(0) + '**' + fullName.charAt(fullName.length - 1);
    const maskedAccount = account.slice(0, 4) + '****';

    document.getElementById('display-student-id').textContent = maskedAccount;
    document.getElementById('display-name').textContent = maskedName;
    document.getElementById('display-school').textContent = school;
    document.getElementById('display-class').textContent = studentClass;
    // 預設 Email 不變
    
    // 5. 顯示成績與項目
    renderTasks(studentInfo.tasks);
});

function renderTasks(tasks) {
    // (此函數內容與原始版本相同，用於生成表格列)
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    tasks.forEach(data => {
        const row = taskList.insertRow();
        const itemCell = row.insertCell();
        itemCell.textContent = data.item;

        const statusCell = row.insertCell();
        const statusText = data.completed ? '已完成' : '待完成';
        statusCell.textContent = statusText;
        statusCell.className = data.completed ? 'status-completed' : 'status-pending';
    });
}

function logout() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('login-form').reset();
}


// --- 教師介面切換邏輯 ---

document.getElementById('teacher-login-btn').addEventListener('click', function() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.remove('hidden');
});

function hideTeacherLogin() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('teacher-login-form').reset();
}

function teacherLogout() {
    document.getElementById('admin-container').classList.add('hidden');
    hideTeacherLogin(); // 回到初始學生登入畫面
}

// --- 教師登入與管理邏輯 ---

document.getElementById('teacher-login-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const password = document.getElementById('teacher-password').value;
    const errorMessage = document.getElementById('teacher-error-message');

    if (password === TEACHER_PASSWORD) {
        errorMessage.textContent = '';
        document.getElementById('teacher-login-container').classList.add('hidden');
        document.getElementById('admin-container').classList.remove('hidden');
        displayStudentList(); // 登入成功後顯示學生列表
    } else {
        errorMessage.textContent = '管理密碼錯誤，請重試。';
    }
});


// --- 學生資料 CRUD (新增/修改/移除) 邏輯 ---

/** 顯示學生列表 */
function displayStudentList() {
    const tbody = document.querySelector('#student-list-table tbody');
    tbody.innerHTML = ''; // 清空列表

    for (const account in students) {
        const student = students[account];
        const row = tbody.insertRow();
        
        row.insertCell().textContent = account;
        row.insertCell().textContent = student.name;
        
        const actionCell = row.insertCell();
        // 編輯按鈕
        const editBtn = document.createElement('button');
        editBtn.textContent = '編輯';
        editBtn.onclick = () => editStudent(account);
        actionCell.appendChild(editBtn);

        // 移除按鈕
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '移除';
        removeBtn.style.marginLeft = '10px';
        removeBtn.onclick = () => removeStudent(account, student.name);
        actionCell.appendChild(removeBtn);
    }
}

/** 移除學生 */
function removeStudent(account, name) {
    if (confirm(`確定要移除學生 ${name} (帳號: ${account}) 嗎？`)) {
        delete students[account];
        saveStudentData(students);
        displayStudentList(); // 重新整理列表
        alert(`學生 ${name} 已移除。`);
    }
}

/** 編輯學生 (將資料載入表單) */
function editStudent(account) {
    const student = students[account];
    if (!student) return;

    // 載入基本資料
    document.getElementById('student-original-account').value = account; // 儲存原始帳號
    document.getElementById('new-account').value = account;
    document.getElementById('new-name').value = student.name;
    document.getElementById('form-submit-btn').textContent = '更新學生資料';

    // 載入成績/活動
    const taskString = student.tasks.map(t => 
        `${t.item}(${t.completed ? '完成' : '待完成'})`
    ).join(', ');
    document.getElementById('new-tasks').value = taskString;
    
    // 滾動到表單以便編輯
    document.getElementById('student-form').scrollIntoView({ behavior: 'smooth' });
}

/** 重設表單 */
function resetForm() {
    document.getElementById('student-original-account').value = '';
    document.getElementById('student-form').reset();
    document.getElementById('form-submit-btn').textContent = '新增學生';
}

/** 處理新增/修改表單提交 */
document.getElementById('student-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const originalAccount = document.getElementById('student-original-account').value;
    const newAccount = document.getElementById('new-account').value.trim();
    const newName = document.getElementById('new-name').value.trim();
    const tasksString = document.getElementById('new-tasks').value.trim();

    // 1. 處理成績/活動字串
    const tasks = tasksString.split(',').map(item => {
        item = item.trim();
        let completed = item.includes('(完成)');
        let taskName = item.replace(/\((完成|待完成)\)/, '').trim();
        return { item: taskName, completed: completed };
    }).filter(t => t.item); // 過濾掉空項目

    // 2. 處理修改時帳號變更
    if (originalAccount && originalAccount !== newAccount) {
        // 如果是修改且帳號有變，需要先刪除舊帳號資料
        delete students[originalAccount];
    }
    
    // 3. 儲存或更新資料
    students[newAccount] = {
        name: newName,
        tasks: tasks
    };
    
    saveStudentData(students);
    alert(`學生 ${newName} (帳號: ${newAccount}) 資料已成功 ${originalAccount ? '更新' : '新增'}！`);

    resetForm(); // 清空表單
    displayStudentList(); // 重新整理列表
});


// --- 讓頁面在載入時始終載入資料並在需要時顯示列表 ---
window.onload = function() {
    // 讓 students 變數始終保持最新
    students = loadStudentData();
    // 確保頁面初始狀態是學生登入頁面
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('admin-container').classList.add('hidden');
};
