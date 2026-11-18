// PATRÓN COMPOSITE (Frontend): Estructura de Asignaciones Académicas

// Hoja (Leaf): Asignación individual de un Curso y Grado
export class AsignacionSimple {
  constructor(id, docenteId, curso, grado) {
    this.id = id;
    this.docenteId = docenteId;
    this.curso = curso;
    this.grado = grado;
  }

  getDetalles() {
    return `${this.curso} — ${this.grado}`;
  }

  esIgual(curso, grado) {
    return (
      this.curso.toLowerCase() === curso.toLowerCase() &&
      this.grado.toLowerCase() === grado.toLowerCase()
    );
  }
}

// Compuesto (Composite): Carga académica completa del docente
export class CargaDocenteComposite {
  constructor(docenteId, docenteNombre) {
    this.docenteId = docenteId;
    this.docenteNombre = docenteNombre;
    this.hijos = []; // Lista de asignaciones
  }

  agregar(asignacion) {
    this.hijos.push(asignacion);
  }

  tieneAsignacion(curso, grado) {
    return this.hijos.some((h) => h.esIgual(curso, grado));
  }

  totalAsignaciones() {
    return this.hijos.length;
  }

  obtenerCursosUnicos() {
    return [...new Set(this.hijos.map((h) => h.curso))];
  }

  obtenerGradosPorCurso(curso) {
    return this.hijos
      .filter((h) => h.curso.toLowerCase() === (curso || '').toLowerCase())
      .map((h) => h.grado);
  }
}
