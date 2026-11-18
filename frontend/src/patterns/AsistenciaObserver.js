// PATRÓN OBSERVER (Frontend): Notificadores de Asistencia

export class AlertaTutorObserver {
  notificar(asistencia) {
    if (asistencia.estado === 'Falta') {
      return `⚠️ [Alerta Tutor]: El estudiante ${asistencia.estudiante} tiene FALTA en ${asistencia.curso} (${asistencia.grado}). Se requiere justificación.`;
    }
    return null;
  }
}

export class AlertaDireccionObserver {
  notificar(asistencia) {
    if (asistencia.estado === 'Tardanza') {
      return `🕒 [Seguimiento Coordinación]: ${asistencia.estudiante} ingresó con TARDANZA en ${asistencia.curso} (${asistencia.grado}).`;
    }
    return null;
  }
}

export class AsistenciaSubject {
  constructor() {
    this.observers = [new AlertaTutorObserver(), new AlertaDireccionObserver()];
  }

  suscribir(observer) {
    this.observers.push(observer);
  }

  emitir(asistencia) {
    const alertas = [];
    for (const obs of this.observers) {
      const alerta = obs.notificar(asistencia);
      if (alerta) alertas.push(alerta);
    }
    return alertas;
  }
}
