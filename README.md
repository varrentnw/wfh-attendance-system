# wfh-attendance-system
A fullstack attendance system for WFH employees, build using JavaScript/TypeScript, React, and MySQL

# Design
## Services
3 services: authenticaion, employee master data, and attendance records, each connecting to its own and only its own database. While login credentials and employee master data changes in similar situations with similar frequency, I opted to separate the two data primarily to limit security exposure of sensitive information, and secondarily due to the independence of the operations related to the two data. See flowchart below.

React frontend (employee screens + HRD screens)
          │
     API Gateway  ── checks the login token, routes requests
     ┌────┼─────────────┐
   Auth   Employee     Attendance
   (credentials)  (master data)  (records + photos)
     │      │            │
   auth_db employee_db  attendance_db   ← separate databases, one MySQL container
