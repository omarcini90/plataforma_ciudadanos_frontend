import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { surveysApi } from '../api/index.js';
import { useAuth } from '../hooks/useAuth.jsx';

export default function SurveysPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('surveys.write');
  const { data } = useQuery({ queryKey: ['surveys'], queryFn: surveysApi.list });
  const [form, setForm] = useState({ title: '', description: '' });

  const create = useMutation({
    mutationFn: () =>
      surveysApi.create({
        title: form.title,
        description: form.description,
        is_active: true,
        questions: [
          { question: '¿Cómo calificas el servicio?', qtype: 'RATING', position: 1 },
          { question: 'Comentarios', qtype: 'TEXT', position: 2 },
          { question: '¿Recomendarías el servicio?', qtype: 'BOOLEAN', position: 3 },
        ],
      }),
    onSuccess: () => {
      toast.success('Encuesta creada');
      setForm({ title: '', description: '' });
      qc.invalidateQueries({ queryKey: ['surveys'] });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Encuestas</h2>
        <p className="text-sm text-slate-500">Encuestas de satisfacción al cierre de servicios.</p>
      </header>

      <div className="card">
        <h3 className="font-semibold mb-3">Nueva encuesta</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input" placeholder="Título"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" placeholder="Descripción"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button className="btn-primary" disabled={!canWrite} onClick={() => create.mutate()}>
            Crear con preguntas estándar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.map((s) => (
          <div key={s.id} className="card">
            <h3 className="font-semibold">{s.title}</h3>
            <p className="text-sm text-slate-500 mb-3">{s.description}</p>
            <ol className="text-sm list-decimal pl-5 space-y-1">
              {s.questions?.map((q) => (
                <li key={q.id}>
                  {q.question}
                  <span className="text-xs text-slate-400 ml-2">({q.qtype})</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
