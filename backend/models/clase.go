package models

import (
	"fmt"
	"strings"
)

// PATRÓN COMPOSITE: Componente base para asignaciones académicas
type ComponenteAcademico interface {
	GetID() int64
	GetCurso() string
	GetGrado() string
	GetDescripcion() string
	TieneAsignacion(curso, grado string) bool
}

// PATRÓN COMPOSITE: Hoja (Leaf) - Representa una asignación individual de un Curso y Grado
type AsignacionSimple struct {
	ID        int64  `json:"id"`
	DocenteID int64  `json:"docente_id"`
	Curso     string `json:"curso"`
	Grado     string `json:"grado"`
}

func (a AsignacionSimple) GetID() int64       { return a.ID }
func (a AsignacionSimple) GetCurso() string   { return a.Curso }
func (a AsignacionSimple) GetGrado() string   { return a.Grado }
func (a AsignacionSimple) GetDescripcion() string {
	return fmt.Sprintf("%s - %s", a.Curso, a.Grado)
}
func (a AsignacionSimple) TieneAsignacion(curso, grado string) bool {
	return strings.EqualFold(a.Curso, curso) && strings.EqualFold(a.Grado, grado)
}

// PATRÓN COMPOSITE: Compuesto (Composite) - Representa la Carga Académica total asignada a un docente
type CargaDocenteComposite struct {
	DocenteID     int64              `json:"docente_id"`
	DocenteNombre string             `json:"docente_nombre"`
	Asignaciones  []AsignacionSimple `json:"asignaciones"`
}

func (c *CargaDocenteComposite) GetID() int64       { return c.DocenteID }
func (c *CargaDocenteComposite) GetCurso() string   { return "Múltiples Cursos" }
func (c *CargaDocenteComposite) GetGrado() string   { return "Múltiples Grados" }
func (c *CargaDocenteComposite) GetDescripcion() string {
	return fmt.Sprintf("Carga de %s (%d clases asignadas)", c.DocenteNombre, len(c.Asignaciones))
}

func (c *CargaDocenteComposite) Agregar(a AsignacionSimple) {
	c.Asignaciones = append(c.Asignaciones, a)
}

func (c *CargaDocenteComposite) TieneAsignacion(curso, grado string) bool {
	for _, a := range c.Asignaciones {
		if a.TieneAsignacion(curso, grado) {
			return true
		}
	}
	return false
}

func (c *CargaDocenteComposite) TotalClases() int {
	return len(c.Asignaciones)
}
