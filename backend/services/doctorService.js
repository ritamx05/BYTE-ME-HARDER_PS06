/**
 * doctorService.js
 * Manages doctor registry and availability.
 */

const { v4: uuidv4 } = require('uuid');

let doctors = [];

function getAllDoctors() {
  return [...doctors];
}

function addDoctor(data) {
  const { name, specialization, department } = data;
  const newDoctor = {
    id: `DOC-${uuidv4().slice(0, 8).toUpperCase()}`,
    name,
    specialization,
    department,
    isAvailable: true,
    currentPatientId: null,
  };
  doctors.push(newDoctor);
  console.log(`[DOCTOR] Added: ${newDoctor.name} (${newDoctor.specialization}) to ${newDoctor.department}`);
  return newDoctor;
}

function removeDoctor(id) {
  const idx = doctors.findIndex(d => d.id === id);
  if (idx === -1) return false;
  const removed = doctors.splice(idx, 1);
  console.log(`[DOCTOR] Removed: ${removed[0].name}`);
  return true;
}

function setDoctorAvailability(id, isAvailable) {
  const doc = doctors.find(d => d.id === id);
  if (doc) doc.isAvailable = isAvailable;
  return doc;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
function seedDoctors() {
  if (doctors.length > 0) return;
  
  const seeds = [
    { name: 'DR. HEART', specialization: 'Cardiology', department: 'ER' },
    { name: 'DR. BONE', specialization: 'Orthopedic', department: 'ER' },
    { name: 'DR. GENERAL', specialization: 'General', department: 'ER' },
    { name: 'DR. SURGEON', specialization: 'Surgeon', department: 'ER' },
  ];

  seeds.forEach(s => addDoctor(s));
}

// Run seed on load
seedDoctors();

module.exports = {
  getAllDoctors,
  addDoctor,
  removeDoctor,
  setDoctorAvailability,
  seedDoctors,
};

