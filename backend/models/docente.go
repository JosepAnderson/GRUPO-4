package models

import (
	"errors"
	"strings"
)

// Entidad Docente
type Docente struct {
	ID           int64  `json:"id"`
	Nombre       string `json:"nombre"`
	DNI          string `json:"dni"`
	Especialidad string `json:"especialidad"`
}

// PATRÓN BUILDER: Construye y valida objetos Docente paso a paso
type DocenteBuilder struct {
	docente Docente
	errs    []string
}

func NuevoDocenteBuilder() *DocenteBuilder {
	return &DocenteBuilder{}
}

func (b *DocenteBuilder) ConID(id int64) *DocenteBuilder {
	b.docente.ID = id
	return b
}

func (b *DocenteBuilder) ConNombre(nombre string) *DocenteBuilder {
	n := strings.TrimSpace(nombre)
	if len(n) < 3 {
		b.errs = append(b.errs, "El nombre del docente debe tener al menos 3 caracteres")
	}
	b.docente.Nombre = n
	return b
}

func (b *DocenteBuilder) ConDNI(dni string) *DocenteBuilder {
	d := strings.TrimSpace(dni)
	if len(d) < 8 {
		b.errs = append(b.errs, "El DNI o código debe tener al menos 8 dígitos/caracteres")
	}
	b.docente.DNI = d
	return b
}

func (b *DocenteBuilder) ConEspecialidad(esp string) *DocenteBuilder {
	e := strings.TrimSpace(esp)
	if e == "" {
		b.errs = append(b.errs, "La especialidad no puede estar vacía")
	}
	b.docente.Especialidad = e
	return b
}

// Build finaliza la construcción y ejecuta las validaciones acumuladas
func (b *DocenteBuilder) Build() (*Docente, error) {
	if len(b.errs) > 0 {
		return nil, errors.New(strings.Join(b.errs, "; "))
	}
	if b.docente.Nombre == "" || b.docente.DNI == "" || b.docente.Especialidad == "" {
		return nil, errors.New("todos los campos son obligatorios para construir un docente")
	}
	return &b.docente, nil
}
