import { useState, useEffect } from 'react';
import { AsistenciaSubject } from '../patterns/AsistenciaObserver';

export default function AsistenciasCRUD({ docentes = [], clases = [], matriculas = [] }) {
  const [docenteId, setDocenteId] = useState('');
  const [claseId, setClaseId] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [asistencias, setAsistencias] = useState([]);
  const [alerta, setAlerta] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const cargarAsistencias = async () => {
    if (!claseActual) {
      setAsistencias([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/asistencias?curso=${encodeURIComponent(claseActual.curso)}&grado=${encodeURIComponent(claseActual.grado)}&fecha=${fecha}`
      );
      if (res.ok) setAsistencias(await res.json());
    } catch {
      setError('Error al consultar asistencias');
    }
  };

  useEffect(() => {
    cargarAsistencias();
  }, [claseActual?.id, fecha]);

  const alumnosActivos = claseActual
    ? matriculas.filter(
        (m) =>
          m.estado === 'Activa' &&
          m.curso.toLowerCase() === claseActual.curso.toLowerCase() &&
          m.grado.toLowerCase() === claseActual.grado.toLowerCase()
      )
    : [];

  const handleMarcar = async (estudiante, nuevoEstado) => {
    if (!claseActual) return;
    setError('');
    setSuccess('');
    setAlerta('');

    try {
      const res = await fetch('/api/asistencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante,
          curso: claseActual.curso,
          grado: claseActual.grado,
          fecha,
          estado: nuevoEstado
        })
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      const data = await res.json();
      setSuccess(`${estudiante}: ${nuevoEstado}`);

      const subj = new AsistenciaSubject();
      const alertasFront = subj.emitir({
        estudiante,
        curso: claseActual.curso,
        grado: claseActual.grado,
        fecha,
        estado: nuevoEstado
      });

      const todasAlertas = [...(data.alertas || []), ...alertasFront];
      if (todasAlertas.length > 0) {
        setAlerta(todasAlertas[0]);
      }

      cargarAsistencias();
    } catch {
      setError('Error al registrar');
    }
  };

  const handleDesmarcar = async (estudiante) => {
    const reg = asistencias.find((a) => a.estudiante.toLowerCase() === estudiante.toLowerCase());
    if (!reg) return;

    try {
      const res = await fetch(`/api/asistencias/${reg.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess(`Asistencia de ${estudiante} desmarcada.`);
        cargarAsistencias();
      }
    } catch {
      setError('Error al desmarcar');
    }
  };

  const getEstado = (estudiante) => {
    const reg = asistencias.find((a) => a.estudiante.toLowerCase() === estudiante.toLowerCase());
    return reg ? reg.estado : null;
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm">
      <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🕒</span> 4. Control de Asistencias Diarias
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Toma y edita la asistencia diaria por curso y grado con alertas automáticas.
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

      {/* Alerta de Inasistencia / Tardanza */}
      {alerta && (
        <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs">
          <span>📢</span> {alerta}
        </div>
      )}

      {/* Selectores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 mb-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            1. Docente:
          </label>
          <select
            value={docenteId}
            onChange={(e) => handleDocenteChange(e.target.value)}
            disabled={docentes.length === 0}
            className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          >
            {docentes.length === 0 ? (
              <option value="">(Sin docentes)</option>
            ) : (
              docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre} ({d.especialidad})</option>)
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            2. Curso y Grado Asignados:
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

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            3. Fecha:
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
        </div>
      </div>

      {docentes.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          No hay docentes registrados. Regístralos en la pestaña "2. Docentes".
        </div>
      ) : asignacionesDocente.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          Este docente no tiene cursos ni grados asignados. Ve a la pestaña "3. Clases" para asignarle sus grados.
        </div>
      ) : (
        /* Tabla de Alumnos */
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Estudiante</th>
                <th className="py-3 px-4">Estado ({fecha})</th>
                <th className="py-3 px-4">Marcar / Editar Asistencia</th>
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
                  const estado = getEstado(alumno.estudiante);

                  return (
                    <tr key={alumno.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{alumno.estudiante}</td>
                      <td className="py-3.5 px-4">
                        {estado ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ring-1 ${
                              estado === 'Presente'
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                : estado === 'Tardanza'
                                ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                            }`}
                          >
                            {estado}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Sin registrar</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleMarcar(alumno.estudiante, 'Presente')}
                          className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer shadow-2xs ${
                            estado === 'Presente'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80'
                          }`}
                        >
                          ✓ Presente
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMarcar(alumno.estudiante, 'Tardanza')}
                          className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer shadow-2xs ${
                            estado === 'Tardanza'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80'
                          }`}
                        >
                          🕒 Tardanza
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMarcar(alumno.estudiante, 'Falta')}
                          className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer shadow-2xs ${
                            estado === 'Falta'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80'
                          }`}
                        >
                          ✕ Falta
                        </button>

                        {estado && (
                          <button
                            type="button"
                            onClick={() => handleDesmarcar(alumno.estudiante)}
                            className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer font-medium"
                          >
                            Desmarcar
                          </button>
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
  );
}
