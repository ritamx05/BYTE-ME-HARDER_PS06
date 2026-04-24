# 🏥 ER Priority Engine v4.1.0

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.x-61DAFB.svg?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933.svg?logo=nodedotjs)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101.svg?logo=socketdotio)

The **ER Priority Engine** is a state-of-the-art, real-time triage and bed management system designed for Emergency Departments (ED). It leverages a robust Max-Heap priority queue on the backend, continuously recalculating patient priorities based on severity, wait times (Vitals Decay Engine), and systemic load.

---

## ✨ Key Features

- ⚡ **Real-Time Synchronization**: Instantaneous state updates across all connected clients using Socket.io. No manual refreshing needed.
- 🩺 **Intelligent Symptom-Based Triage**:
  - Enter symptoms during patient intake (e.g., "heart attack", "bone fracture").
  - The system automatically detects keywords and assigns the appropriate specialist (Cardiologist, Orthopedic, etc.).
- 🚨 **Accident Auto-Escalation**: Accidental cases are initially routed to General Doctors. If severity is high (≥7), an immediate "CALL SURGEON" escalation path is unlocked.
- 🛏️ **Dynamic Bed Management**: Complete oversight of ER and OPD beds. Includes preemptive ghost reservations for incoming ambulances.
- 📉 **Vitals Decay Engine**: Patients waiting in the queue automatically have their priority scores re-evaluated over time, ensuring nobody is left behind.
- ⚠️ **MCI Mode (Mass Casualty Incident)**: A single toggle that recalibrates the entire triage algorithm to focus on survivability probability over standard wait-time fairness.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Lucide React (Icons)
- **Animation**: Motion (Framer Motion)
- **Real-time**: Socket.io-client

### Backend
- **Runtime**: Node.js
- **Server**: Express.js
- **Real-time**: Socket.io
- **Data Structure**: Custom Max-Heap Priority Queue (No external DB required for demo)

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation & Execution

The project is split into a `frontend` and a `backend`. You will need to run both simultaneously.

#### 1. Start the Backend Server

```bash
cd backend
npm install
npm run dev
```
*The backend will run on http://localhost:5000 and initialize the socket connections.*

#### 2. Start the Frontend Application

Open a **new terminal window/tab**:

```bash
cd frontend
npm install
npm run dev
```
*The frontend will run on http://localhost:5173.*

---

## 💻 Usage Guide

1. **System Protocol (Configuration)**
   - Upon initial load, navigate to the **Protocol Page**.
   - Review or adjust the Bed layouts (default is 10 ER beds).
   - Review the default seeded doctors (Dr. Heart, Dr. Bone, Dr. General, Dr. Surgeon).
   - Click **Initialize Dashboard**.

2. **Patient Intake**
   - Use the **Intake New Patient** form on the left sidebar.
   - Enter a name, select severity, and type a brief description in the **Symptoms** box.
   - Observe the system intelligently suggesting a specialist based on the symptoms.

3. **Queue Management**
   - The central table displays the live queue.
   - Watch the **Escalation** progress bars ticking down.
   - Use the **Bed Management** panel to Assign the next available bed to the highest-priority patient.

4. **Escalations**
   - For severe accident cases (Severity ≥ 7), locate the flashing **CALL SURGEON** button in the patient row to immediately escalate care.

---

## 📁 Project Structure

```text
devwrap2.0/
├── backend/
│   ├── controllers/      # Express route controllers
│   ├── routes/           # REST API endpoint definitions
│   ├── services/         # Core logic (Bed, Doctor, Queue, Priority, Decay)
│   ├── socket/           # Real-time event handlers
│   └── server.js         # Entry point
└── frontend/
    ├── src/
    │   ├── components/   # Reusable UI components (PatientTable, AddPatientForm)
    │   ├── context/      # React Context for global state (ERContext)
    │   ├── hooks/        # Custom React hooks
    │   ├── pages/        # Main views (Dashboard, Protocol, Landing)
    │   ├── services/     # API & Socket communication logic
    │   └── types/        # TypeScript interfaces
    └── package.json
```

---
*Developed for advanced agentic coding and medical automation demonstrations.*
