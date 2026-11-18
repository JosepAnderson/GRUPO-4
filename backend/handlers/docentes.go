package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"proyecto-grupo4/backend/models"
)

type DocentesHandler struct {
	DB *sql.DB
}

func (h DocentesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	path := strings.TrimPrefix(r.URL.Path, "/api/docentes")
	path = strings.TrimPrefix(path, "/")

	var id int64
	if path != "" {
		parsed, _ := strconv.ParseInt(path, 10, 64)
		id = parsed
	}

	switch r.Method {
	case "GET":
		rows, err := h.DB.Query("SELECT id, nombre, dni, especialidad FROM docentes ORDER BY id DESC")
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		defer rows.Close()

		docentes := []models.Docente{}
		for rows.Next() {
			var d models.Docente
			if err := rows.Scan(&d.ID, &d.Nombre, &d.DNI, &d.Especialidad); err == nil {
				docentes = append(docentes, d)
			}
		}
		json.NewEncoder(w).Encode(docentes)

	case "POST":
		var body struct {
			Nombre       string `json:"nombre"`
			DNI          string `json:"dni"`
			Especialidad string `json:"especialidad"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "Cuerpo de solicitud inválido", 400)
			return
		}

		// PATRÓN BUILDER: Construcción y validación paso a paso
		docente, err := models.NuevoDocenteBuilder().
			ConNombre(body.Nombre).
			ConDNI(body.DNI).
			ConEspecialidad(body.Especialidad).
			Build()
		if err != nil {
			http.Error(w, err.Error(), 400)
			return
		}

		// Validación de unicidad de DNI
		var exists int
		h.DB.QueryRow("SELECT COUNT(*) FROM docentes WHERE dni = ?", docente.DNI).Scan(&exists)
		if exists > 0 {
			http.Error(w, "Ya existe un docente registrado con ese DNI o código", 400)
			return
		}

		res, err := h.DB.Exec("INSERT INTO docentes (nombre, dni, especialidad) VALUES (?, ?, ?)",
			docente.Nombre, docente.DNI, docente.Especialidad)
		if err != nil {
			http.Error(w, "Error al registrar el docente: "+err.Error(), 500)
			return
		}
		docente.ID, _ = res.LastInsertId()
		json.NewEncoder(w).Encode(docente)

	case "PUT":
		if id == 0 {
			http.Error(w, "ID de docente requerido", 400)
			return
		}
		var body struct {
			Nombre       string `json:"nombre"`
			DNI          string `json:"dni"`
			Especialidad string `json:"especialidad"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "Cuerpo de solicitud inválido", 400)
			return
		}

		// PATRÓN BUILDER: Reconstrucción para edición
		docente, err := models.NuevoDocenteBuilder().
			ConID(id).
			ConNombre(body.Nombre).
			ConDNI(body.DNI).
			ConEspecialidad(body.Especialidad).
			Build()
		if err != nil {
			http.Error(w, err.Error(), 400)
			return
		}

		// Validar DNI en otro docente
		var exists int
		h.DB.QueryRow("SELECT COUNT(*) FROM docentes WHERE dni = ? AND id != ?", docente.DNI, id).Scan(&exists)
		if exists > 0 {
			http.Error(w, "Ese DNI ya está en uso por otro docente", 400)
			return
		}

		_, err = h.DB.Exec("UPDATE docentes SET nombre = ?, dni = ?, especialidad = ? WHERE id = ?",
			docente.Nombre, docente.DNI, docente.Especialidad, id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		json.NewEncoder(w).Encode(docente)

	case "DELETE":
		if id == 0 {
			http.Error(w, "ID de docente requerido", 400)
			return
		}

		// REGLA: No eliminar docentes con asignaciones de clases
		var asignaciones int
		h.DB.QueryRow("SELECT COUNT(*) FROM clases WHERE docente_id = ?", id).Scan(&asignaciones)
		if asignaciones > 0 {
			http.Error(w, "No se puede eliminar: el docente tiene clases o cursos asignados actualmente", 400)
			return
		}

		h.DB.Exec("DELETE FROM docentes WHERE id = ?", id)
		w.WriteHeader(204)

	default:
		http.Error(w, "Método no permitido", 405)
	}
}
