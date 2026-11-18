package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"proyecto-grupo4/backend/models"
)

type AsistenciasHandler struct {
	DB *sql.DB
}

func (h AsistenciasHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	p := strings.TrimPrefix(r.URL.Path, "/api/asistencias")
	p = strings.TrimPrefix(p, "/")

	var id int64
	if p != "" {
		parsed, _ := strconv.ParseInt(p, 10, 64)
		id = parsed
	}

	switch r.Method {
	case "GET":
		cursoFiltro := r.URL.Query().Get("curso")
		gradoFiltro := r.URL.Query().Get("grado")
		fechaFiltro := r.URL.Query().Get("fecha")

		query := "SELECT id, estudiante, curso, grado, fecha, estado FROM asistencias WHERE 1=1"
		args := []interface{}{}

		if cursoFiltro != "" {
			query += " AND curso = ?"
			args = append(args, cursoFiltro)
		}
		if gradoFiltro != "" {
			query += " AND grado = ?"
			args = append(args, gradoFiltro)
		}
		if fechaFiltro != "" {
			query += " AND fecha = ?"
			args = append(args, fechaFiltro)
		}
		query += " ORDER BY fecha DESC, id DESC"

		rows, err := h.DB.Query(query, args...)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		defer rows.Close()

		res := []models.Asistencia{}
		for rows.Next() {
			var a models.Asistencia
			if err := rows.Scan(&a.ID, &a.Estudiante, &a.Curso, &a.Grado, &a.Fecha, &a.Estado); err == nil {
				res = append(res, a)
			}
		}
		json.NewEncoder(w).Encode(res)

	case "POST":
		var a models.Asistencia
		if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
			http.Error(w, "Cuerpo de solicitud inválido", 400)
			return
		}

		a.Estudiante = strings.TrimSpace(a.Estudiante)
		a.Curso = strings.TrimSpace(a.Curso)
		a.Grado = strings.TrimSpace(a.Grado)
		a.Fecha = strings.TrimSpace(a.Fecha)
		a.Estado = strings.TrimSpace(a.Estado)

		if a.Estudiante == "" || a.Curso == "" || a.Grado == "" || a.Fecha == "" || a.Estado == "" {
			http.Error(w, "Todos los campos de la asistencia son obligatorios", 400)
			return
		}

		// Validar estado permitido
		if a.Estado != "Presente" && a.Estado != "Tardanza" && a.Estado != "Falta" {
			http.Error(w, "Estado inválido. Debe ser: Presente, Tardanza o Falta", 400)
			return
		}

		// REGLA DE NEGOCIO ESTRICTA: Solo registrar asistencia a alumnos con matrícula 'Activa'
		var estadoMatricula string
		err := h.DB.QueryRow("SELECT estado FROM matriculas WHERE estudiante = ? AND curso = ? AND grado = ?",
			a.Estudiante, a.Curso, a.Grado).Scan(&estadoMatricula)
		if err != nil || estadoMatricula != "Activa" {
			http.Error(w, "No se puede registrar asistencia: el estudiante debe contar con matrícula 'Activa' en este curso y grado", 400)
			return
		}

		// Si ya existe asistencia para este estudiante, curso, grado y fecha -> actualizar (upsert)
		var existingID int64
		err = h.DB.QueryRow("SELECT id FROM asistencias WHERE estudiante = ? AND curso = ? AND grado = ? AND fecha = ?",
			a.Estudiante, a.Curso, a.Grado, a.Fecha).Scan(&existingID)

		if err == nil && existingID > 0 {
			_, err = h.DB.Exec("UPDATE asistencias SET estado = ? WHERE id = ?", a.Estado, existingID)
			if err != nil {
				http.Error(w, "Error al actualizar asistencia: "+err.Error(), 500)
				return
			}
			a.ID = existingID
		} else {
			res, err := h.DB.Exec("INSERT INTO asistencias (estudiante, curso, grado, fecha, estado) VALUES (?, ?, ?, ?, ?)",
				a.Estudiante, a.Curso, a.Grado, a.Fecha, a.Estado)
			if err != nil {
				http.Error(w, "Error al registrar asistencia: "+err.Error(), 500)
				return
			}
			a.ID, _ = res.LastInsertId()
		}

		// PATRÓN OBSERVER: El Subject notifica a los observadores registrados
		subject := models.NuevoAsistenciaSubject()
		alertas := subject.Notificar(a)

		json.NewEncoder(w).Encode(map[string]interface{}{
			"asistencia": a,
			"alertas":    alertas,
		})

	case "PUT":
		if id == 0 {
			http.Error(w, "ID de asistencia requerido", 400)
			return
		}

		var body struct {
			Estado string `json:"estado"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "Cuerpo de solicitud inválido", 400)
			return
		}

		body.Estado = strings.TrimSpace(body.Estado)
		if body.Estado != "Presente" && body.Estado != "Tardanza" && body.Estado != "Falta" {
			http.Error(w, "Estado inválido. Debe ser: Presente, Tardanza o Falta", 400)
			return
		}

		var a models.Asistencia
		err := h.DB.QueryRow("SELECT id, estudiante, curso, grado, fecha, estado FROM asistencias WHERE id = ?", id).
			Scan(&a.ID, &a.Estudiante, &a.Curso, &a.Grado, &a.Fecha, &a.Estado)
		if err != nil {
			http.Error(w, "Asistencia no encontrada", 404)
			return
		}

		a.Estado = body.Estado
		_, err = h.DB.Exec("UPDATE asistencias SET estado = ? WHERE id = ?", a.Estado, id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}

		// PATRÓN OBSERVER: Disparar observadores ante actualización
		subject := models.NuevoAsistenciaSubject()
		alertas := subject.Notificar(a)

		json.NewEncoder(w).Encode(map[string]interface{}{
			"asistencia": a,
			"alertas":    alertas,
		})

	case "DELETE":
		if id == 0 {
			http.Error(w, "ID de asistencia requerido", 400)
			return
		}
		h.DB.Exec("DELETE FROM asistencias WHERE id = ?", id)
		w.WriteHeader(204)

	default:
		http.Error(w, "Método no permitido", 405)
	}
}
