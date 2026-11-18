import { useState, useEffect } from 'react';

export default function NotasCRUD({ docentes = [], clases = [], matriculas = [] }) {
  const [docenteId, setDocenteId] = useState('');
  const [claseId, setClaseId] = useState('');
  const [notas, setNotas] = useState([]);
  const [inputNota, setInputNota] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historialModal, setHistorialModal] = useState({ open: false, estudiante: '', mementos: [] });

  useEffect(() => {
    if (docentes.length > 0 && !docenteId) {
      const primerDocenteId = String(docentes[0].id);
      setDocenteId(primerDocenteId);
      const asignadas = clases.filter((c) => String(c.docente_id) === primerDocenteId);
      if (asignadas.length > 0) {
        setClaseId(String(asignadas[0].id));
      } else {
        setClaseId('');
      }
    }
  }, [docentes]);

  const handleDocenteChange = (nuevoDocenteId) => {
    setDocenteId(nuevoDocenteId);
    const asignadas = clases.filter((c) => String(c.docente_id) === String(nuevoDocenteId));
    if (asignadas.length > 0) {
      setClaseId(String(asignadas[0].id));
    } else {
      setClaseId('');
    }
  };

  const asignacionesDocente = clases.filter((c) => String(c.docente_id) === String(docenteId));
  const claseActual = asignacionesDocente.find((c) => String(c.id) === String(claseId)) || null;

  // Cargar notas de la clase actual
  const cargarDatos = async () => {
    if (!claseActual) {
      setNotas([]);
      return;
    }
    try {
      const resNotas = await fetch(
        `/api/notas?curso=${encodeURIComponent(claseActual.curso)}&grado=${encodeURIComponent(claseActual.grado)}`
      );

      if (resNotas.ok) setNotas(await resNotas.json());
    } catch {
      setError('Error al consultar datos');
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [claseActual?.id]);

  const alumnosActivos = claseActual
    ? matriculas.filter(
        (m) =>
          m.estado === 'Activa' &&
          m.curso.toLowerCase() === claseActual.curso.toLowerCase() &&
          m.grado.toLowerCase() === claseActual.grado.toLowerCase()
      )
    : [];

  const handleGuardar = async (estudiante) => {
    if (!claseActual) return;
    setError('');
    setSuccess('');

    const val = parseFloat(inputNota[estudiante]);
    if (isNaN(val) || val < 0 || val > 20) {
      setError(`Nota inválida (debe ser de 0 a 20) para ${estudiante}.`);
      return;
    }

    try {
      const res = await fetch('/api/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante,
          curso: claseActual.curso,
          grado: claseActual.grado,
          calificacion: val
        })
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      setSuccess(`Calificación guardada para ${estudiante}.`);
      setInputNota({ ...inputNota, [estudiante]: '' });
      cargarDatos();
    } catch {
      setError('Error al registrar nota');
    }
  };

  const handleEditar = async (n) => {
    const valStr = prompt(`Nueva calificación para ${n.estudiante} (0.0 - 20.0):`, n.calificacion);
    if (valStr === null) return;

    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0 || val > 20) {
      alert('La nota debe ser entre 0 y 20');
      return;
    }

    try {
      const res = await fetch(`/api/notas/${n.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calificacion: val })
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      setSuccess(`Nota de ${n.estudiante} modificada. Se guardó la versión previa en el historial.`);
      cargarDatos();
    } catch {
      setError('Error al editar');
    }
  };

  const handleUndo = async (notaId, estudianteNombre) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/notas/${notaId}/undo`, { method: 'POST' });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      setSuccess(`↩ Se restauró la calificación previa de ${estudianteNombre || 'estudiante'}.`);
      cargarDatos();
    } catch {
      setError('Error al deshacer');
    }
  };

  const handleVerHistorialModal = async (n) => {
    try {
      const res = await fetch(`/api/notas/${n.id}/historial`);
      if (res.ok) {
        setHistorialModal({ open: true, estudiante: n.estudiante, mementos: await res.json() });
      }
    } catch {
      setError('Error al consultar historial');
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta calificación?')) return;
    try {
      const res = await fetch(`/api/notas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Nota eliminada.');
        cargarDatos();
      }
    } catch {
      setError('Error al eliminar');
    }
  };

  const getNota = (estudiante) => {
    return notas.find((n) => n.estudiante.toLowerCase() === estudiante.toLowerCase()) || null;
  };

  return (
    <div className="space-y-6 rounded-3xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/90 via-white to-cyan-50/80 p-3 sm:p-5 shadow-[0_18px_50px_-25px_rgba(79,70,229,0.35)]">
      {/* Panel Principal de Evaluación */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>⭐</span> 5. Registro y Evaluación de Notas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evalúa a los estudiantes de tus clases con respaldo histórico de versiones.
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

        {/* Selectores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              1. Docente Evaluador:
            </label>
            <select
              value={docenteId}
              onChange={(e) => handleDocenteChange(e.target.value)}
              disabled={docentes.length === 0}
              className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
            >
              {docentes.length === 0 ? (
                <option value="">(Sin docentes registrados)</option>
              ) : (
                docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre} ({d.especialidad})</option>)
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              2. Asignatura y Grado (Asignados a este Docente):
            </label>
            <select
              value={claseId}
              onChange={(e) => setClaseId(e.target.value)}
              disabled={asignacionesDocente.length === 0}
              className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
            >
              {asignacionesDocente.length === 0 ? (
                <option value="">(Este docente no tiene materias asignadas)</option>
              ) : (
                asignacionesDocente.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.curso} — {c.grado}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {docentes.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">Registra docentes en la pestaña "2. Docentes".</div>
        ) : asignacionesDocente.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">Este docente no tiene materias asignadas. Ve a la pestaña "3. Clases".</div>
        ) : (
          /* Tabla de Notas Tailwind */
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs mb-2">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Estudiante</th>
                  <th className="py-3 px-4">Calificación</th>
                  <th className="py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {alumnosActivos.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-8 text-center text-slate-400 text-xs">
                      No hay alumnos con matrícula <strong className="text-slate-600">Activa</strong> en {claseActual?.curso} ({claseActual?.grado}).
                    </td>
                  </tr>
                ) : (
                  alumnosActivos.map((alumno) => {
                    const notaReg = getNota(alumno.estudiante);

                    return (
                      <tr key={alumno.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{alumno.estudiante}</td>
                        <td className="py-3.5 px-4">
                          {notaReg ? (
                            <span
                              className={`text-lg font-black tracking-tight ${
                                notaReg.calificacion >= 11 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {notaReg.calificacion.toFixed(1)}
                            </span>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="20"
                                placeholder="0-20"
                                value={inputNota[alumno.estudiante] || ''}
                                onChange={(e) => setInputNota({ ...inputNota, [alumno.estudiante]: e.target.value })}
                                className="w-20 h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleGuardar(alumno.estudiante)}
                                className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                              >
                                + Guardar
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 flex gap-2 flex-wrap">
                          {notaReg ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditar(notaReg)}
                                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUndo(notaReg.id, notaReg.estudiante)}
                                className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors cursor-pointer font-bold"
                                title="Restaura la calificación anterior"
                              >
                                ↩ Deshacer
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVerHistorialModal(notaReg)}
                                className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors cursor-pointer font-medium"
                              >
                                📜 Historial
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminar(notaReg.id)}
                                className="px-3 py-1.5 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-lg transition-colors cursor-pointer font-semibold"
                              >
                                Eliminar
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Sin calificar</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Historial Detallado */}
      {historialModal.open && (
        <div
          onClick={() => setHistorialModal({ ...historialModal, open: false })}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">
                Historial: {historialModal.estudiante}
              </h3>
              <button
                type="button"
                onClick={() => setHistorialModal({ ...historialModal, open: false })}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Instantáneas previas guardadas cronológicamente:
            </p>

            {historialModal.mementos.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Sin calificaciones previas para este alumno.
              </div>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {historialModal.mementos.map((m, idx) => (
                  <li
                    key={m.id || idx}
                    className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">
                        Versión #{historialModal.mementos.length - idx}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {m.fecha || 'Fecha registrada'}
                      </span>
                    </div>
                    <strong className="text-base font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      {m.calificacion.toFixed(1)}
                    </strong>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setHistorialModal({ ...historialModal, open: false })}
              className="mt-5 w-full h-10 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
