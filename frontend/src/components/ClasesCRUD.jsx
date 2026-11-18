import { useState, useEffect } from 'react';

const GRADOS = ['1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria'];

export default function ClasesCRUD({ docentes = [], onClasesChange }) {
  const [clases, setClases] = useState([]);
  const [docenteId, setDocenteId] = useState('');
  const [curso, setCurso] = useState('');
  const [gradosSeleccionados, setGradosSeleccionados] = useState(['1ro Secundaria']);
  const [filtroDocente, setFiltroDocente] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cargarClases = async () => {
    try {
      const res = await fetch('/api/clases');
      if (res.ok) {
        const data = await res.json();
        setClases(data);
        if (onClasesChange) onClasesChange(data);
      }
    } catch {
      setError('Error al cargar asignaciones');
    }
  };

  useEffect(() => {
    cargarClases();
  }, []);

  // Inicializar curso automáticamente con el primer docente si está disponible
  useEffect(() => {
    if (docentes.length > 0 && !docenteId) {
      setDocenteId(String(docentes[0].id));
      setCurso(docentes[0].especialidad);
    }
  }, [docentes]);

  // Al elegir docente, auto-completar inmediatamente su especialidad en Curso / Asignatura
  const handleDocenteChange = (e) => {
    const id = e.target.value;
    setDocenteId(id);
    const doc = docentes.find((d) => String(d.id) === String(id));
    if (doc) {
      setCurso(doc.especialidad);
    } else {
      setCurso('');
    }
  };

  const handleToggleGrado = (g) => {
    if (gradosSeleccionados.includes(g)) {
      setGradosSeleccionados(gradosSeleccionados.filter((item) => item !== g));
    } else {
      setGradosSeleccionados([...gradosSeleccionados, g]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!docenteId || !curso.trim()) {
      setError('Selecciona un docente e ingresa el curso.');
      return;
    }
    if (gradosSeleccionados.length === 0) {
      setError('Selecciona al menos un grado.');
      return;
    }

    try {
      let creados = 0;
      for (const grado of gradosSeleccionados) {
        const res = await fetch('/api/clases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docente_id: parseInt(docenteId, 10),
            curso: curso.trim(),
            grado
          })
        });
        if (res.ok) creados++;
      }

      if (creados > 0) {
        setSuccess(`Se asignaron ${creados} grado(s) correctamente a ${curso.trim()}.`);
        cargarClases();
      } else {
        setError('El docente ya tenía asignados estos grados en ese curso.');
      }
    } catch {
      setError('Error al procesar la asignación');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Desasignar esta materia?')) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/clases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Asignación eliminada correctamente.');
        cargarClases();
      }
    } catch {
      setError('Error al eliminar asignación');
    }
  };

  const clasesFiltradas = filtroDocente
    ? clases.filter((c) => String(c.docente_id) === String(filtroDocente))
    : clases;

  const docenteFiltroObj = docentes.find((d) => String(d.id) === String(filtroDocente));

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm">
      <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📚</span> 3. Asignación de Clases y Materias
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Asigna docentes a sus cursos y grados correspondientes.
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

      {/* Formulario con Tailwind Elegante */}
      <form onSubmit={handleSubmit} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 mb-7">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              1. Seleccionar Docente:
            </label>
            <select
              value={docenteId}
              onChange={handleDocenteChange}
              required
              className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
            >
              <option value="">-- Elige un Docente --</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} ({d.especialidad})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              2. Curso / Asignatura (Auto-completado):
            </label>
            <input
              type="text"
              placeholder="Ej. Matemáticas"
              value={curso}
              onChange={(e) => setCurso(e.target.value)}
              required
              className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Checkboxes de Grados */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            3. Grados a Asignar (puedes marcar varios):
          </label>
          <div className="flex gap-2 flex-wrap">
            {GRADOS.map((g) => {
              const checked = gradosSeleccionados.includes(g);
              return (
                <label
                  key={g}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all shadow-xs select-none ${
                    checked
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleGrado(g)}
                    className="hidden"
                  />
                  <span>{checked ? '✓' : '+'}</span>
                  <span>{g}</span>
                </label>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={docentes.length === 0}
          className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-[0.99]"
        >
          + Asignar Materia a los Grados Seleccionados
        </button>
      </form>

      {/* Selector Arriba de la Tabla para Filtrar */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            🔍 Filtrar por Docente:
          </span>
          <select
            value={filtroDocente}
            onChange={(e) => setFiltroDocente(e.target.value)}
            className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
          >
            <option value="">-- Todos los Docentes --</option>
            {docentes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre} ({d.especialidad})
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          {filtroDocente && docenteFiltroObj
            ? `Viendo asignaciones de ${docenteFiltroObj.nombre}`
            : `Total: ${clases.length} clases asignadas`}
        </span>
      </div>

      {/* Tabla Tailwind */}
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Docente</th>
              <th className="py-3 px-4">Curso / Asignatura</th>
              <th className="py-3 px-4">Grado</th>
              <th className="py-3 px-4">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {clasesFiltradas.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-slate-400 text-xs">
                  {filtroDocente
                    ? 'Este docente aún no tiene materias ni grados asignados.'
                    : 'No hay clases asignadas registradas.'}
                </td>
              </tr>
            ) : (
              clasesFiltradas.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{c.docente_nombre}</td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">{c.curso}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 ring-1 ring-blue-600/20">
                      {c.grado}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="px-3 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg transition-colors cursor-pointer border border-rose-200/60"
                    >
                      Desasignar
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
