package models

import "fmt"

// Entidad Asistencia (Sin Sección, solo Curso y Grado)
type Asistencia struct {
	ID         int64  `json:"id"`
	Estudiante string `json:"estudiante"`
	Curso      string `json:"curso"`
	Grado      string `json:"grado"`
	Fecha      string `json:"fecha"`
	Estado     string `json:"estado"` // "Presente", "Tardanza", "Falta"
}

// PATRÓN OBSERVER: Interfaz que implementan los escuchadores de eventos
type AsistenciaObserver interface {
	OnRegistro(a Asistencia) string
}

// Observer 1: Notifica al tutor de aula ante faltas
type AlertaTutorObserver struct{}

func (AlertaTutorObserver) OnRegistro(a Asistencia) string {
	if a.Estado == "Falta" {
		return fmt.Sprintf("[ALERTA TUTOR] Estudiante %s registró FALTA en %s (%s) el %s", a.Estudiante, a.Curso, a.Grado, a.Fecha)
	}
	return ""
}

// Observer 2: Notifica a dirección o coordinación ante tardanzas o faltas
type AlertaDireccionObserver struct{}

func (AlertaDireccionObserver) OnRegistro(a Asistencia) string {
	if a.Estado == "Tardanza" {
		return fmt.Sprintf("[SEGUIMIENTO DIRECCIÓN] Estudiante %s llegó con TARDANZA a %s (%s) el %s", a.Estudiante, a.Curso, a.Grado, a.Fecha)
	}
	return ""
}

// Observer 3: Registro de cumplimiento para asistencias regulares
type RegistroRegularObserver struct{}

func (RegistroRegularObserver) OnRegistro(a Asistencia) string {
	if a.Estado == "Presente" {
		return fmt.Sprintf("[ASISTENCIA CONFIRMADA] %s presente en %s (%s)", a.Estudiante, a.Curso, a.Grado)
	}
	return ""
}

// PATRÓN OBSERVER: Sujeto que gestiona y notifica a los observadores
type AsistenciaSubject struct {
	observers []AsistenciaObserver
}

func NuevoAsistenciaSubject() *AsistenciaSubject {
	s := &AsistenciaSubject{}
	// Registro automático de los observadores del colegio
	s.Registrar(AlertaTutorObserver{})
	s.Registrar(AlertaDireccionObserver{})
	s.Registrar(RegistroRegularObserver{})
	return s
}

func (s *AsistenciaSubject) Registrar(obs AsistenciaObserver) {
	s.observers = append(s.observers, obs)
}

func (s *AsistenciaSubject) Notificar(a Asistencia) []string {
	var alertas []string
	for _, obs := range s.observers {
		if msg := obs.OnRegistro(a); msg != "" {
			alertas = append(alertas, msg)
		}
	}
	return alertas
}
