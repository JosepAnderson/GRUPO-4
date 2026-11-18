import { useState, useEffect } from 'react';
import MatriculasCRUD from './components/MatriculasCRUD';
import DocentesCRUD from './components/DocentesCRUD';
import ClasesCRUD from './components/ClasesCRUD';
import AsistenciasCRUD from './components/AsistenciasCRUD';
import NotasCRUD from './components/NotasCRUD';

export default function App() {
  const [tab, setTab] = useState('matriculas');
  const [docentes, setDocentes] = useState([]);
  const [clases, setClases] = useState([]);
  const [matriculas, setMatriculas] = useState([]);

  // Sincronizar datos entre módulos
  const refrescarDatos = async () => {
    try {
      const [resDoc, resCla, resMat] = await Promise.all([
        fetch('/api/docentes'),
        fetch('/api/clases'),
        fetch('/api/matriculas')
      ]);

      if (resDoc.ok) setDocentes(await resDoc.json());
      if (resCla.ok) setClases(await resCla.json());
      if (resMat.ok) setMatriculas(await resMat.json());
    } catch (err) {
      console.error('Error sincronizando datos:', err);
    }
  };

  useEffect(() => {
    refrescarDatos();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/60 to-blue-50/40 text-slate-800 antialiased py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Encabezado Atractivo y Moderno */}
        <header className="mb-6 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/25">
              G4
            </div>
            <div>
              <div className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">
                Colegio Secundaria • SisColegio
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Sistema de Gestión Académica
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sistema Activo
          </div>
        </header>

        {/* Pestañas de Navegación con Tailwind Moderno */}
        <nav className="flex gap-1.5 mb-6 p-1.5 bg-slate-200/60 backdrop-blur-xs rounded-xl border border-slate-200/80 overflow-x-auto shadow-xs">
          <button
            type="button"
            onClick={() => setTab('matriculas')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              tab === 'matriculas'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            📋 1. Matrículas
          </button>

          <button
            type="button"
            onClick={() => setTab('docentes')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              tab === 'docentes'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            👨‍🏫 2. Docentes
          </button>

          <button
            type="button"
            onClick={() => setTab('clases')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              tab === 'clases'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            📚 3. Clases
          </button>

          <button
            type="button"
            onClick={() => setTab('asistencias')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              tab === 'asistencias'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            🕒 4. Asistencias
          </button>

          <button
            type="button"
            onClick={() => setTab('notas')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              tab === 'notas'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            ⭐ 5. Notas
          </button>
        </nav>

        {/* Módulos */}
        <main className="transition-all">
          {tab === 'matriculas' && <MatriculasCRUD onMatriculasChange={refrescarDatos} />}
          {tab === 'docentes' && <DocentesCRUD onDocentesChange={refrescarDatos} />}
          {tab === 'clases' && <ClasesCRUD docentes={docentes} onClasesChange={refrescarDatos} />}
          {tab === 'asistencias' && <AsistenciasCRUD docentes={docentes} clases={clases} matriculas={matriculas} />}
          {tab === 'notas' && <NotasCRUD docentes={docentes} clases={clases} matriculas={matriculas} />}
        </main>

        <footer className="mt-12 text-center text-xs text-slate-400 font-medium pb-4">
          SisColegio • Grupo 4 — Arquitectura Go + SQLite + React con Tailwind CSS
        </footer>
      </div>
    </div>
  );
}
