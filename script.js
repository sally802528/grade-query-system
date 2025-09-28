// 預設的密碼要求
const CORRECT_PASSWORD = "Qimei@admin";

// 模擬的成績與活動數據
const studentData = {
    'A123456789': { // 假設這是一個帳號
        tasks: [
            { item: "國文期中考", completed: true },
            { item: "數學作業繳交", completed: true },
            { item: "社團點名出席", completed: false },
            { item: "服務學習時數", completed: true },
            { item: "校內英文競賽", completed: false }
        ]
    }
    // 這裡可以放更多學生的模擬資料
};

document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault(); // 阻止表單預設提交

    const school = document.getElementById('school').value.trim();
    const studentClass = document.getElementById('class').value.trim();
    const account = document.getElementById('account').value.trim();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    // 1. 密碼驗證
    if (password !== CORRECT_PASSWORD) {
        errorMessage.textContent = '登入失敗：密碼錯誤，請檢查。';
        return;
    }

    // 2. 帳號/資料驗證 (在靜態網站上，我們只能檢查帳號是否存在於模擬資料中)
    if (!studentData[account]) {
        errorMessage.textContent = '登入失敗：帳號不存在，請檢查。';
        return;
    }

    // 3. 登入成功
    errorMessage.textContent = '';
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('result-container').classList.remove('hidden');

    // 4. 顯示基本資料
    document.getElementById('display-school').textContent = school;
    document.getElementById('display-class').textContent = studentClass;

    // 5. 顯示成績與項目
    renderTasks(studentData[account].tasks);
});

function renderTasks(tasks) {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = ''; // 清空舊資料

    tasks.forEach(data => {
        const row = taskList.insertRow();
        
        // 左欄：項目名稱
        const itemCell = row.insertCell();
        itemCell.textContent = data.item;

        // 右欄：完成狀態
        const statusCell = row.insertCell();
        const statusText = data.completed ? '已完成' : '待完成';
        statusCell.textContent = statusText;
        statusCell.className = data.completed ? 'status-completed' : 'status-pending';
    });
}

function logout() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('login-form').reset(); // 清空表單
}
