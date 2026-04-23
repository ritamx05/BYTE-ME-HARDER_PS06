import React, { useState } from 'react';
import { useER } from '../context/ERContext';
import { UserPlus, Star, Ambulance, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export default function AddPatientForm() {
  const { addPatient } = useER();
  const [formData, setFormData] = useState({
    name: '',
    severity: 5,
    arrivalType: 'Walk-in' as 'Walk-in' | 'Ambulance'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setIsSubmitting(true);
    await addPatient(formData.name.toUpperCase(), formData.severity, formData.arrivalType);
    setFormData({ name: '', severity: 5, arrivalType: 'Walk-in' });
    setIsSubmitting(false);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Intake New Patient</h2>
      
      <form onSubmit={handleSubmit} className="space-y-3">
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
            <span className="text-xs font-mono w-4">{formData.severity}</span>
          </div>
        </div>

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
          {isSubmitting ? 'Processing...' : 'Register & Triage'}
        </button>
      </form>
    </section>
  );
}

