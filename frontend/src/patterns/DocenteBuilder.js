// PATRÓN BUILDER (Frontend): Construcción y validación paso a paso de Docentes
export class DocenteBuilder {
  constructor() {
    this.docente = {
      nombre: '',
      dni: '',
      especialidad: ''
    };
    this.errores = [];
  }

  conNombre(nombre) {
    const n = (nombre || '').trim();
    if (n.length < 3) {
      this.errores.push('El nombre debe tener al menos 3 caracteres.');
    }
    this.docente.nombre = n;
    return this;
  }

  conDNI(dni) {
    const d = (dni || '').trim();
    if (d.length < 8) {
      this.errores.push('El DNI o código debe tener al menos 8 caracteres.');
    }
    this.docente.dni = d;
    return this;
  }

  conEspecialidad(especialidad) {
    const e = (especialidad || '').trim();
    if (!e) {
      this.errores.push('La especialidad es obligatoria.');
    }
    this.docente.especialidad = e;
    return this;
  }

  build() {
    if (this.errores.length > 0) {
      throw new Error(this.errores.join(' '));
    }
    if (!this.docente.nombre || !this.docente.dni || !this.docente.especialidad) {
      throw new Error('Todos los campos son obligatorios para construir un docente.');
    }
    return { ...this.docente };
  }
}
