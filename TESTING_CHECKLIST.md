# Testing Checklist - Hadir.AI

## 🔐 Authentication

- [ ] **Login**
  - [ ] Login with username
  - [ ] Login with email
  - [ ] Invalid credentials show error
  - [ ] Session persists after app restart

- [ ] **Biometric Authentication**
  - [ ] Face ID/Fingerprint works on check-in
  - [ ] Falls back to password if biometric fails
  - [ ] Biometric preference saves correctly

- [ ] **Signup**
  - [ ] Signup request submits successfully
  - [ ] Admin can approve/reject signup requests

---

## 👤 Employee Dashboard

- [ ] **Check-In/Check-Out**
  - [ ] Check-in records location and timestamp
  - [ ] Check-out records location and timestamp
  - [ ] Biometric authentication works
  - [ ] Cannot check-in twice without checkout

- [ ] **Attendance History**
  - [ ] Displays personal attendance records
  - [ ] Filters by date range work
  - [ ] Records show correct location

- [ ] **Leave Requests**
  - [ ] Create leave request (Annual/Sick/Casual)
  - [ ] Half-day leave option works
  - [ ] Leave balance updates after approval
  - [ ] View leave request status

- [ ] **Tickets**
  - [ ] Create ticket with category and priority
  - [ ] View own tickets
  - [ ] Filter tickets by status
  - [ ] Ticket routing to correct department

---

## 👔 Manager Dashboard

- [ ] **HR Dashboard Access**
  - [ ] Can view department employees
  - [ ] Can view department tickets
  - [ ] Can view department leave requests

- [ ] **Leave Management**
  - [ ] Can approve/reject leave requests from department
  - [ ] Notification sent to employee on approval/rejection
  - [ ] Leave balance updates correctly

- [ ] **Ticket Management**
  - [ ] Can view tickets assigned to department
  - [ ] Can close tickets
  - [ ] Can view ticket details

- [ ] **Employee Management**
  - [ ] Can view department employees
  - [ ] Can change employee work mode
  - [ ] Can manage employee leave balances
  - [ ] Work mode distribution shows correctly

- [ ] **Manual Attendance**
  - [ ] Can add manual attendance entry
  - [ ] Manual entry shows in attendance history

---

## 🏢 HR Dashboard (HR Managers)

- [ ] **Employee Access**
  - [ ] Can view ALL employees (not just HR department)
  - [ ] Employee count shows all employees

- [ ] **Ticket Access**
  - [ ] Can view ALL tickets from all employees
  - [ ] Can close any ticket
  - [ ] Ticket filters work correctly

- [ ] **Leave Request Access**
  - [ ] Can view ALL leave requests from all employees
  - [ ] Can approve/reject any leave request
  - [ ] Leave request status updates correctly

- [ ] **Reports**
  - [ ] Can generate attendance reports
  - [ ] Can generate leave reports
  - [ ] Reports export correctly

---

## 👑 Super Admin Dashboard

- [ ] **User Management**
  - [ ] Can create new users
  - [ ] Can view all employees
  - [ ] Can update employee roles
  - [ ] Can approve signup requests

- [ ] **Full Access**
  - [ ] Can view all tickets
  - [ ] Can view all leave requests
  - [ ] Can manage all employees
  - [ ] Can access all departments

- [ ] **Reports**
  - [ ] Can generate system-wide reports
  - [ ] Report generation works for all date ranges

---

## 🎨 UI/UX Features

- [ ] **Drawer Menu**
  - [ ] Hamburger menu opens/closes
  - [ ] Navigation items work correctly
  - [ ] Help & Support opens email app
  - [ ] Menu shows correct items per role

- [ ] **Theme**
  - [ ] Dark mode toggle works
  - [ ] Theme persists after app restart
  - [ ] All screens respect theme

- [ ] **Notifications**
  - [ ] Notifications display correctly
  - [ ] Unread count badge works
  - [ ] Mark as read/unread works

---

## 📊 Reports & Analytics

- [ ] **Report Generation**
  - [ ] Attendance report generates successfully
  - [ ] Leave report generates successfully
  - [ ] Reports include correct data
  - [ ] Date range selection works

- [ ] **Analytics**
  - [ ] Attendance statistics display correctly
  - [ ] Department statistics accurate
  - [ ] Work mode distribution correct

---

## 🔄 Data & Sync

- [ ] **Data Persistence**
  - [ ] Data saves to Supabase
  - [ ] Offline data syncs when online
  - [ ] No data loss on app restart

- [ ] **Permissions**
  - [ ] Role-based access works correctly
  - [ ] HR managers see all data
  - [ ] Regular managers see only department data
  - [ ] Employees see only own data

---

## ✅ Critical Paths

- [ ] **Complete Employee Flow**
  1. Employee logs in
  2. Checks in for attendance
  3. Creates leave request
  4. Manager approves leave
  5. Employee views updated leave balance

- [ ] **Complete Manager Flow**
  1. Manager logs in
  2. Views department employees
  3. Approves leave request
  4. Closes ticket
  5. Generates report

- [ ] **Complete HR Flow**
  1. HR manager logs in
  2. Views all employees
  3. Views all tickets
  4. Approves leave from any department
  5. Generates system report

---

## 🐛 Common Issues to Verify

- [ ] No "Emily Davis" showing for HR if not in database
- [ ] Navigation works from drawer menu
- [ ] No crashes on invalid data
- [ ] Error messages are user-friendly
- [ ] Loading states display correctly

