import React, { useState, useMemo } from 'react';
import { useER } from '../context/ERContext';
import { Stethoscope } from 'lucide-react';

export default function AddPatientForm() {
  const { addPatient, doctors } = useER();
  const [formData, setFormData] = useState({
    name: '',
    severity: 5,
    arrivalType: 'Walk-in' as 'Walk-in' | 'Ambulance',
    department: 'ER' as 'ER' | 'OPD',
    symptoms: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keyword-based doctor matching
  const matchedDoctor = useMemo(() => {
    const sym = formData.symptoms.toLowerCase();
    if (sym.includes('heart') || sym.includes('cardio') || sym.includes('chest pain')) {
      return doctors.find(d => d.specialization === 'Cardiology');
    }
    if (sym.includes('bone') || sym.includes('break') || sym.includes('fracture') || sym.includes('joint')) {
      return doctors.find(d => d.specialization === 'Orthopedic');
    }
    if (sym.includes('accident') || sym.includes('crash') || sym.includes('emergency')) {
      return doctors.find(d => d.specialization === 'General');
    }
    return null;
  }, [formData.symptoms, doctors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setIsSubmitting(true);
    await addPatient(
      formData.name.toUpperCase(), 
      formData.severity, 
      formData.arrivalType, 
      formData.department,
      formData.symptoms,
      matchedDoctor?.id || null
    );
    setFormData({ name: '', severity: 5, arrivalType: 'Walk-in', department: 'ER', symptoms: '' });
    setIsSubmitting(false);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Intake New Patient</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name */}
        <div>
          <label className="text-[10px] uppercase text-zinc-500 block mb-1">Patient Name</label>
          <input
            type="text"
            placeholder="ENTER FULL NAME"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="tech-input w-full uppercase"
            required
          />
        </div>

        {/* Symptoms */}
        <div>
          <label className="text-[10px] uppercase text-zinc-500 block mb-1">What happened? (Symptoms)</label>
          <textarea
            placeholder="DESCRIBE SYMPTOMS OR INCIDENT..."
            value={formData.symptoms}
            onChange={(e) => setFormData(prev => ({ ...prev, symptoms: e.target.value }))}
            className="tech-input w-full min-h-[60px] text-[11px] uppercase resize-none"
            rows={2}
          />
          {matchedDoctor && (
            <div className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-emerald-400 uppercase bg-emerald-400/5 p-1.5 border border-emerald-400/20 rounded">
              <Stethoscope size={10} />
              Calling Specialist: {matchedDoctor.name} ({matchedDoctor.specialization})
            </div>
          )}
        </div>

        {/* Department */}
        <div>
          <label className="text-[10px] uppercase text-zinc-500 block mb-1">Department</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, department: 'ER' }))}
              className={`tech-button border ${formData.department === 'ER' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-zinc-800 bg-zinc-900 text-zinc-500'}`}
            >
              🚨 ER
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, department: 'OPD' }))}
              className={`tech-button border ${formData.department === 'OPD' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-800 bg-zinc-900 text-zinc-500'}`}
            >
              🏥 OPD
            </button>
          </div>
        </div>

        {/* Severity */}
        <div>
          <label className="text-[10px] uppercase text-zinc-500 block mb-1">Severity (1-10)</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={formData.severity}
              onChange={(e) => setFormData(prev => ({ ...prev, severity: parseInt(e.target.value) }))}
              className="flex-1 accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            <span className={`text-xs font-mono w-4 font-bold ${formData.severity >= 6 ? 'text-red-400' : formData.severity >= 3 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {formData.severity}
            </span>
          </div>
        </div>

        {/* Arrival Type */}
        <div>
          <label className="text-[10px] uppercase text-zinc-500 block mb-1">Arrival Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, arrivalType: 'Walk-in' }))}
              className={`tech-button border ${formData.arrivalType === 'Walk-in' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-zinc-800 bg-zinc-900 text-zinc-500'}`}
            >
              Walk-in
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, arrivalType: 'Ambulance' }))}
              className={`tech-button border ${formData.arrivalType === 'Ambulance' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-zinc-800 bg-zinc-900 text-zinc-500'}`}
            >
              Ambulance
            </button>
          </div>
        </div>

        <button
          id="add-patient-btn"
          type="submit"
          disabled={!formData.name || isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 text-xs uppercase tracking-widest transition-all mt-2 active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? 'Processing...' : `Register & Triage → ${formData.department}`}
        </button>
      </form>
    </section>
  );
}

