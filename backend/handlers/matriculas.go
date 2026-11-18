package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"proyecto-grupo4/backend/models"
)

type MatriculasHandler struct {
	DB *sql.DB
}

func (h MatriculasHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	path := strings.TrimPrefix(r.URL.Path, "/api/matriculas")
	path = strings.TrimPrefix(path, "/")

	var id int64
	if path != "" {
		parsed, _ := strconv.ParseInt(path, 10, 64)
		id = parsed
	}

	switch r.Method {
	case "GET":
		estadoFiltro := r.URL.Query().Get("estado")
		cursoFiltro := r.URL.Query().Get("curso")
		gradoFiltro := r.URL.Query().Get("grado")

		query := "SELECT id, estudiante, curso, grado, estado FROM matriculas WHERE 1=1"
		args := []interface{}{}

		if estadoFiltro != "" {
			query += " AND estado = ?"
			args = append(args, estadoFiltro)
		}
		if cursoFiltro != "" {
			query += " AND curso = ?"
			args = append(args, cursoFiltro)
		}
		if gradoFiltro != "" {
			query += " AND grado = ?"
			args = append(args, gradoFiltro)
		}
		query += " ORDER BY id DESC"

		rows, err := h.DB.Query(query, args...)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		defer rows.Close()

		res := []models.Matricula{}
		for rows.Next() {
			var m models.Matricula
			if err := rows.Scan(&m.ID, &m.Estudiante, &m.Curso, &m.Grado, &m.Estado); err == nil {
				res = append(res, m)
			}
		}
		json.NewEncoder(w).Encode(res)

	case "POST":
		var m models.Matricula
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			http.Error(w, "Cuerpo de solicitud inválido", 400)
			return
		}

		m.Estudiante = strings.TrimSpace(m.Estudiante)
		m.Curso = strings.TrimSpace(m.Curso)
		m.Grado = strings.TrimSpace(m.Grado)

		if m.Estudiante == "" || m.Curso == "" || m.Grado == "" {
			http.Error(w, "Estudiante, Curso y Grado son campos obligatorios", 400)
			return
		}

		// Toda matrícula nueva inicia obligatoriamente en estado 'Pendiente'
		m.Estado = "Pendiente"

		// Evitar matrícula duplicada exacta para el mismo estudiante, curso y grado
		var dups int
		h.DB.QueryRow("SELECT COUNT(*) FROM matriculas WHERE estudiante = ? AND curso = ? AND grado = ?",
			m.Estudiante, m.Curso, m.Grado).Scan(&dups)
		if dups > 0 {
			http.Error(w, "El estudiante ya tiene una matrícula registrada en ese curso y grado", 400)
			return
		}

		res, err := h.DB.Exec("INSERT INTO matriculas (estudiante, curso, grado, estado) VALUES (?, ?, ?, ?)",
			m.Estudiante, m.Curso, m.Grado, m.Estado)
		if err != nil {
			http.Error(w, "Error al registrar matrícula: "+err.Error(), 500)
			return
		}
		m.ID, _ = res.LastInsertId()
		json.NewEncoder(w).Encode(m)

	case "PUT":
		if id == 0 {
			http.Error(w, "ID de matrícula requerido", 400)
			return
		}

		var body struct {
			Estado string `json:"estado"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "Cuerpo de solicitud inválido", 400)
			return
		}

		// PATRÓN STATE: Se carga el objeto actual y se delega la validación de transición a CambiarEstado()
		var m models.Matricula
		err := h.DB.QueryRow("SELECT id, estudiante, curso, grado, estado FROM matriculas WHERE id = ?", id).
			Scan(&m.ID, &m.Estudiante, &m.Curso, &m.Grado, &m.Estado)
		if err != nil {
			http.Error(w, "Matrícula no encontrada", 404)
			return
		}

		// Si la transición es inválida (ej: Pendiente -> Finalizada), responde HTTP 400
		if err := m.CambiarEstado(body.Estado); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}

		_, err = h.DB.Exec("UPDATE matriculas SET estado = ? WHERE id = ?", m.Estado, id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		json.NewEncoder(w).Encode(m)

	case "DELETE":
		if id == 0 {
			http.Error(w, "ID de matrícula requerido", 400)
			return
		}

		// Regla de integridad: No eliminar si ya tiene asistencias o notas registradas
		var m models.Matricula
		err := h.DB.QueryRow("SELECT id, estudiante, curso, grado FROM matriculas WHERE id = ?", id).
			Scan(&m.ID, &m.Estudiante, &m.Curso, &m.Grado)
		if err == nil {
			var totalAsistencias int
			h.DB.QueryRow("SELECT COUNT(*) FROM asistencias WHERE estudiante = ? AND curso = ? AND grado = ?",
				m.Estudiante, m.Curso, m.Grado).Scan(&totalAsistencias)
			if totalAsistencias > 0 {
				http.Error(w, "No se puede eliminar: el estudiante tiene asistencias registradas", 400)
				return
			}

			var totalNotas int
			h.DB.QueryRow("SELECT COUNT(*) FROM notas WHERE estudiante = ? AND curso = ? AND grado = ?",
				m.Estudiante, m.Curso, m.Grado).Scan(&totalNotas)
			if totalNotas > 0 {
				http.Error(w, "No se puede eliminar: el estudiante tiene notas registradas", 400)
				return
			}
		}

		h.DB.Exec("DELETE FROM matriculas WHERE id = ?", id)
		w.WriteHeader(204)

	default:
		http.Error(w, "Método no permitido", 405)
	}
}
