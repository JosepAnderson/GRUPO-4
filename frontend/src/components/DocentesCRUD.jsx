import { useState, useEffect } from 'react';
import { DocenteBuilder } from '../patterns/DocenteBuilder';

export default function DocentesCRUD({ onDocentesChange }) {
  const [docentes, setDocentes] = useState([]);
  const [form, setForm] = useState({ nombre: '', dni: '', especialidad: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cargarDocentes = async () => {
    try {
      const res = await fetch('/api/docentes');
      if (res.ok) {
        const data = await res.json();
        setDocentes(data);
        if (onDocentesChange) onDocentesChange(data);
      }
    } catch {
      setError('Error al conectar con la API');
    }
  };

  useEffect(() => {
    cargarDocentes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const docentePayload = new DocenteBuilder()
        .conNombre(form.nombre)
        .conDNI(form.dni)
        .conEspecialidad(form.especialidad)
        .build();

      const url = editingId ? `/api/docentes/${editingId}` : '/api/docentes';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docentePayload)
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      setSuccess(editingId ? 'Docente actualizado correctamente.' : 'Docente registrado con éxito.');
      setForm({ nombre: '', dni: '', especialidad: '' });
      setEditingId(null);
      cargarDocentes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (d) => {
    setEditingId(d.id);
    setForm({ nombre: d.nombre, dni: d.dni, especialidad: d.especialidad });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este docente?')) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/docentes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      setSuccess('Docente eliminado.');
      cargarDocentes();
    } catch {
      setError('Error al eliminar');
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm">
      <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>👨‍🏫</span> 2. Gestión de Docentes
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registra y administra los profesores del plantel escolar.
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
      <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap mb-7 items-end bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Nombre del Docente:
          </label>
          <input
            type="text"
            placeholder="Ej. Prof. Carlos Ramos"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
            className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
        </div>

        <div className="w-48 min-w-[150px]">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            DNI (8 dígitos):
          </label>
          <input
            type="text"
            placeholder="Ej. 45892011"
            value={form.dni}
            onChange={(e) => setForm({ ...form, dni: e.target.value })}
            required
            className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Especialidad / Materia:
          </label>
          <input
            type="text"
            placeholder="Ej. Matemáticas"
            value={form.especialidad}
            onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
            required
            className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-[0.99]"
          >
            {editingId ? 'Actualizar' : '+ Registrar'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setForm({ nombre: '', dni: '', especialidad: '' }); }}
              className="h-11 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Docente</th>
              <th className="py-3 px-4">DNI</th>
              <th className="py-3 px-4">Especialidad</th>
              <th className="py-3 px-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {docentes.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-slate-400 text-xs">
                  No hay docentes registrados aún.
                </td>
              </tr>
            ) : (
              docentes.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{d.nombre}</td>
                  <td className="py-3.5 px-4">
                    <code className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-xs border border-slate-200">
                      {d.dni}
                    </code>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">{d.especialidad}</td>
                  <td className="py-3.5 px-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(d)}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d.id)}
                      className="px-3 py-1.5 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 font-semibold rounded-lg transition-colors cursor-pointer"
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
