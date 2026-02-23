const DB_KEY = "servicePortalData";
const SESSION_KEY = "servicePortalSession";

const initialData = {
  users: [{ id: 1, name: "Admin", email: "admin@site.com", messenger: "admin-page", password: "admin123", role: "admin" }],
  orders: [],
  notifications: [],
  emailLogs: []
};

const readDB = () => JSON.parse(localStorage.getItem(DB_KEY) || JSON.stringify(initialData));
const writeDB = (db) => localStorage.setItem(DB_KEY, JSON.stringify(db));
const setSession = (session) => localStorage.setItem(SESSION_KEY, JSON.stringify(session));
const getSession = () => JSON.parse(localStorage.getItem(SESSION_KEY) || "null");

if (!localStorage.getItem(DB_KEY)) writeDB(initialData);

const ui = {
  authCard: document.getElementById("authCard"),
  orderCard: document.getElementById("orderCard"),
  ordersCard: document.getElementById("ordersCard"),
  adminCard: document.getElementById("adminCard"),
  userBadge: document.getElementById("userBadge"),
  ordersList: document.getElementById("ordersList"),
  notifications: document.getElementById("notifications"),
  adminOrders: document.getElementById("adminOrders"),
  emailsLog: document.getElementById("emailsLog")
};

function statusLabel(status) {
  if (status === "in_progress") return { text: "قيد التطوير", className: "progress" };
  if (status === "completed") return { text: "مكتمل", className: "completed" };
  return { text: "قيد المراجعة", className: "pending" };
}

function refresh() {
  const session = getSession();
  const db = readDB();
  ui.authCard.classList.toggle("hidden", !!session);
  ui.orderCard.classList.toggle("hidden", !(session && session.role === "client"));
  ui.ordersCard.classList.toggle("hidden", !(session && session.role === "client"));
  ui.adminCard.classList.toggle("hidden", !(session && session.role === "admin"));
  ui.userBadge.textContent = session ? `${session.name} (${session.role === "admin" ? "أدمن" : "عميل"})` : "غير مسجل";

  if (session?.role === "client") {
    const orders = db.orders.filter((o) => o.userId === session.id).sort((a, b) => b.id - a.id);
    ui.ordersList.innerHTML = orders.length ? orders.map((o) => {
      const s = statusLabel(o.status);
      return `<article class="order-item"><strong>${o.serviceName}</strong> - السعر: $${o.price.toFixed(2)} - الكمية: ${o.quantity}<br/><small>${o.details}</small><br/><span class="status ${s.className}">${s.text}</span></article>`;
    }).join("") : "<p>لا يوجد طلبات حتى الآن.</p>";

    const notifications = db.notifications.filter((n) => n.userId === session.id).slice().reverse();
    ui.notifications.innerHTML = notifications.length ? notifications.map((n) => `<li>${n.message}</li>`).join("") : "<li>لا توجد إشعارات.</li>";
  }

  if (session?.role === "admin") {
    ui.adminOrders.innerHTML = db.orders.length ? db.orders.slice().reverse().map((o) => {
      const user = db.users.find((u) => u.id === o.userId);
      const s = statusLabel(o.status);
      return `<article class="order-item">
      <strong>الخدمة:</strong> ${o.serviceName}<br/>
      <strong>العميل:</strong> ${user?.name || "-"} (${user?.messenger || "-"})<br/>
      <strong>السعر:</strong> $${o.price.toFixed(2)} | <strong>الكمية:</strong> ${o.quantity}<br/>
      <strong>التفاصيل:</strong> ${o.details}<br/>
      <span class="status ${s.className}">${s.text}</span>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="updateOrderStatus(${o.id},'pending')">قيد المراجعة</button>
        <button onclick="updateOrderStatus(${o.id},'in_progress')">قيد التطوير</button>
        <button onclick="updateOrderStatus(${o.id},'completed')">مكتمل</button>
      </div></article>`;
    }).join("") : "<p>لا توجد طلبات واردة.</p>";

    ui.emailsLog.innerHTML = db.emailLogs.length ? db.emailLogs.slice().reverse().map((mail) => `<li><strong>${mail.to}</strong>: ${mail.subject}</li>`).join("") : "<li>لا يوجد إيميلات مسجلة.</li>";
  }
}

function addEmailLog(to, subject) {
  const db = readDB();
  db.emailLogs.push({ to, subject, at: new Date().toISOString() });
  writeDB(db);
}

window.updateOrderStatus = (orderId, status) => {
  const db = readDB();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return;
  order.status = status;
  const user = db.users.find((u) => u.id === order.userId);
  const s = statusLabel(status);
  db.notifications.push({ id: Date.now(), userId: order.userId, message: `تم تحديث طلب ${order.serviceName} إلى: ${s.text}` });
  addEmailLog(user?.email || "unknown", `حالة الطلب ${order.serviceName}: ${s.text}`);
  writeDB(db);
  refresh();
};

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    document.getElementById("registerForm").classList.toggle("active", target === "register");
    document.getElementById("loginForm").classList.toggle("active", target === "login");
  });
});

document.getElementById("registerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const db = readDB();
  const email = fd.get("email").trim().toLowerCase();
  if (db.users.some((u) => u.email === email)) return alert("البريد مستخدم بالفعل");
  const user = {
    id: Date.now(),
    name: fd.get("name").trim(),
    email,
    messenger: fd.get("messenger").trim(),
    password: fd.get("password"),
    role: "client"
  };
  db.users.push(user);
  writeDB(db);
  setSession({ id: user.id, name: user.name, role: user.role, email: user.email });
  e.target.reset();
  refresh();
});

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const db = readDB();
  const email = fd.get("email").trim().toLowerCase();
  const user = db.users.find((u) => u.email === email && u.password === fd.get("password"));
  if (!user) return alert("بيانات الدخول غير صحيحة");
  setSession({ id: user.id, name: user.name, role: user.role, email: user.email });
  e.target.reset();
  refresh();
});

document.getElementById("orderForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const session = getSession();
  if (!session) return;
  const fd = new FormData(e.target);
  const db = readDB();
  const order = {
    id: Date.now(),
    userId: session.id,
    serviceName: fd.get("serviceName").trim(),
    quantity: Number(fd.get("quantity")),
    price: Number(fd.get("price")),
    details: fd.get("details").trim(),
    status: "pending"
  };
  db.orders.push(order);
  db.notifications.push({ id: Date.now() + 1, userId: session.id, message: `تم استلام طلبك للخدمة: ${order.serviceName}` });
  writeDB(db);
  addEmailLog("owner@business.com", `طلب جديد من ${session.name} للخدمة: ${order.serviceName}`);
  e.target.reset();
  refresh();
  alert("تم إرسال الطلب بنجاح");
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  refresh();
});

document.getElementById("adminLogoutBtn").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  refresh();
});

refresh();
