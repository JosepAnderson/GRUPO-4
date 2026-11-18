import { useState, useEffect } from 'react';
import { Estados, puedeCambiar } from '../patterns/MatriculaState';

const GRADOS = ['1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria'];

export default function MatriculasCRUD({ onMatriculasChange }) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ estudiante: '', curso: '', grado: GRADOS[0] });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/matriculas');
      if (res.ok) {
        const data = await res.json();
        setList(data);
        if (onMatriculasChange) onMatriculasChange(data);
      }
    } catch {
      setError('Error al cargar matrículas');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const crear = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/matriculas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      setSuccess(`Matrícula creada en estado Pendiente para ${form.estudiante}.`);
      setForm({ estudiante: '', curso: '', grado: GRADOS[0] });
      load();
    } catch {
      setError('Error al registrar matrícula');
    }
  };

  const cambiar = async (id, act, n) => {
    if (!puedeCambiar(act, n)) {
      setError(`Transición no permitida de ${act} a ${n}`);
      return;
    }
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/matriculas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: n })
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      setSuccess(`Estado cambiado a ${n}.`);
      load();
    } catch {
      setError('Error al cambiar estado');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta matrícula?')) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/matriculas/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      setSuccess('Matrícula eliminada correctamente.');
      load();
    } catch {
      setError('Error al eliminar');
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm">
      <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📋</span> 1. Matrículas de Estudiantes
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registra nuevos alumnos y gestiona sus estados de matrícula.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs">
          <span>⚠️</span> {error}
        </div>
      )}
      {success && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs">
          <span>✓</span> {success}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={crear} className="flex gap-3 flex-wrap mb-7 items-end bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Estudiante:
          </label>
          <input
            type="text"
            placeholder="Nombre completo del alumno"
            value={form.estudiante}
            onChange={(e) => setForm({ ...form, estudiante: e.target.value })}
            required
            className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Curso / Asignatura:
          </label>
          <input
            type="text"
            placeholder="Ej. Matemáticas"
            value={form.curso}
            onChange={(e) => setForm({ ...form, curso: e.target.value })}
            required
            className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
        </div>

        <div className="w-48 min-w-[150px]">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Grado:
          </label>
          <select
            value={form.grado}
            onChange={(e) => setForm({ ...form, grado: e.target.value })}
            className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          >
            {GRADOS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <button
          type="submit"
          className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-[0.99]"
        >
          + Matricular
        </button>
      </form>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Estudiante</th>
              <th className="py-3 px-4">Curso</th>
              <th className="py-3 px-4">Grado</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {list.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-400 text-xs">
                  No hay matrículas registradas aún.
                </td>
              </tr>
            ) : (
              list.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{m.estudiante}</td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">{m.curso}</td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">{m.grado}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ring-1 ${
                        m.estado === 'Activa'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : m.estado === 'Pendiente'
                          ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                          : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                      }`}
                    >
                      {m.estado}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 flex gap-1.5 flex-wrap">
                    {Estados[m.estado]?.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => cambiar(m.id, m.estado, e)}
                        className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer font-bold ${
                          e === 'Activa'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        → {e}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => eliminar(m.id)}
                      className="px-2.5 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-lg transition-colors cursor-pointer font-semibold"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
