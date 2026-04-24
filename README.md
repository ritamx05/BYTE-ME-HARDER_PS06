# 🏥 ER Priority Engine v4.1.0

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.x-61DAFB.svg?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933.svg?logo=nodedotjs)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101.svg?logo=socketdotio)

The **ER Priority Engine** is a state-of-the-art, real-time triage and bed management system designed for Emergency Departments (ED). It leverages a robust Max-Heap priority queue on the backend, continuously recalculating patient priorities based on severity, wait times (Vitals Decay Engine), and systemic load.

---

## 🏗️ System Architecture

The system is built on a decoupled architecture where the backend acts as a deterministic state machine, and the frontend provides a reactive interface.

```mermaid
graph LR
    subgraph "Frontend (React + Vite)"
        UI[React Components]
        Context[ER Context / State]
        SocketClient[Socket.io Client]
    end
    
    subgraph "Backend (Node.js + Express)"
        SocketHandler[Socket.io Server]
        QueueService[Queue Service / Max-Heap]
        BedService[Bed Service]
        DecayEngine[Vitals Decay Engine]
        EscalationEngine[Escalation Engine]
        PriorityService[Priority Service]
    end
    
    UI <--> Context
    Context <--> SocketClient
    SocketClient <--> SocketHandler
    SocketHandler <--> QueueService
    SocketHandler <--> BedService
    DecayEngine -- "Updates Priority" --> QueueService
    EscalationEngine -- "Auto-Assigns" --> BedService
    EscalationEngine -- "Updates Status" --> QueueService
    QueueService -- "Uses" --> PriorityService
```

---

## 🔄 Operational Workflow

The following flowchart outlines the lifecycle of a patient within the ER Priority Engine, from intake to discharge.

```mermaid
graph TD
    Start([Patient Arrival]) --> Intake[Intake Form: Name, Severity, Symptoms]
    Intake --> Mapping[Specialist Detection Logic]
    Mapping --> Calc[Priority Calculation]
    
    subgraph "Queue Management"
        Calc --> Heap[Insert into Max-Heap]
        Heap --> Waiting{Waiting in Queue}
        
        Waiting --> Decay[Vitals Decay Engine]
        Decay -- "Wait Time++" --> Calc
        
        Waiting --> Escalation[Escalation Engine]
        Escalation -- "Time Limit Reached" --> BedCheck{Beds Available?}
    end
    
    BedCheck -- "Yes" --> Assign[Auto-Assign Bed]
    BedCheck -- "No" --> DocRoute[Route to Doctor Queue]
    
    Waiting --> Manual[Manual Bed Assignment]
    
    Assign --> Treatment[Active Treatment]
    DocRoute --> Treatment
    Manual --> Treatment
    
    Treatment --> Discharge([Discharge])
    Discharge --> Free[Bed Marked Available]
```

---

## ✨ Key Features

- ⚡ **Real-Time Synchronization**: Instantaneous state updates across all connected clients using Socket.io.
- 🩺 **Intelligent Symptom-Based Triage**: Automatic specialist assignment (Cardiologist, Orthopedic, etc.) based on symptom keywords.
- 🚨 **Accident Auto-Escalation**: High-severity accident cases unlock immediate "CALL SURGEON" protocols.
- 🛏️ **Dynamic Bed Management**: ER and OPD bed oversight with **Preemptive Bed Reservation** for incoming ambulances.
- 📉 **Vitals Decay Engine**: Background process that increases patient priority scores the longer they wait, preventing "queue starvation."
- ⚠️ **MCI Mode (Mass Casualty Incident)**: A triage shift from "Wait-Time Fairness" to "Maximum Survivability" logic.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React (Vite)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Premium Custom Design)
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Real-time**: Socket.io-client

### Backend
- **Runtime**: Node.js
- **Server**: Express.js
- **Real-time**: Socket.io
- **Logic**: Custom Max-Heap Priority Queue (Manual implementation)
- **Engines**: Background Vitals Decay & Escalation Engines

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd devwrap2.0
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

---

## 💻 Usage Guide

1. **Initialization**: Navigate to the **Protocol Page** to configure your bed layout and seed doctors.
2. **Patient Intake**: Use the sidebar to add patients. Enter symptoms like "chest pain" or "broken leg" to see auto-specialist mapping.
3. **Monitoring**: Watch the live dashboard. The queue sorts automatically based on the priority score.
4. **Action**: Click "Assign Bed" to move the highest priority patient to an available bed, or use "Call Surgeon" for critical escalations.
5. **MCI Toggle**: In case of a mass casualty event, toggle MCI mode to see the priority algorithm shift in real-time.

---

## 📁 Project Structure

```text
devwrap2.0/
├── backend/
│   ├── services/         # Core logic (Heap, Decay, Escalation, Bed)
│   ├── socket/           # Real-time event handlers
│   └── server.js         # Entry point
└── frontend/
    ├── src/
    │   ├── context/      # ER Global State Management
    │   ├── pages/        # Dashboard, Protocol, Landing
    │   └── components/   # UI Modules
```

---
*Developed for advanced agentic coding and medical automation demonstrations.*
