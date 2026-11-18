package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"proyecto-grupo4/backend/models"
)

type ClasesHandler struct {
	DB *sql.DB
}

func (h ClasesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	path := strings.TrimPrefix(r.URL.Path, "/api/clases")
	path = strings.TrimPrefix(path, "/")

	var id int64
	if path != "" {
		parsed, _ := strconv.ParseInt(path, 10, 64)
		id = parsed
	}

	switch r.Method {
	case "GET":
		docenteIDStr := r.URL.Query().Get("docente_id")
		if docenteIDStr != "" {
			docenteID, _ := strconv.ParseInt(docenteIDStr, 10, 64)

			var docenteNombre string
			err := h.DB.QueryRow("SELECT nombre FROM docentes WHERE id = ?", docenteID).Scan(&docenteNombre)
			if err != nil {
				http.Error(w, "Docente no encontrado", 404)
				return
			}

			// PATRÓN COMPOSITE: Ensamblar la Carga Académica Compuesta del docente
			cargaComposite := models.CargaDocenteComposite{
				DocenteID:     docenteID,
				DocenteNombre: docenteNombre,
				Asignaciones:  []models.AsignacionSimple{},
			}

			rows, err := h.DB.Query("SELECT id, docente_id, curso, grado FROM clases WHERE docente_id = ? ORDER BY curso, grado", docenteID)
			if err == nil {
				defer rows.Close()
				for rows.Next() {
					var as models.AsignacionSimple
					if err := rows.Scan(&as.ID, &as.DocenteID, &as.Curso, &as.Grado); err == nil {
						cargaComposite.Agregar(as)
					}
				}
			}
			json.NewEncoder(w).Encode(cargaComposite)
			return
		}

		// Listado global con datos del docente
		query := `
			SELECT c.id, c.docente_id, COALESCE(d.nombre, 'Sin Docente'), c.curso, c.grado 
			FROM clases c
			LEFT JOIN docentes d ON c.docente_id = d.id
			ORDER BY d.nombre, c.curso, c.grado
		`
		rows, err := h.DB.Query(query)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		defer rows.Close()

		type AsignacionConDocente struct {
			ID            int64  `json:"id"`
			DocenteID     int64  `json:"docente_id"`
			DocenteNombre string `json:"docente_nombre"`
			Curso         string `json:"curso"`
			Grado         string `json:"grado"`
		}

		lista := []AsignacionConDocente{}
		for rows.Next() {
			var a AsignacionConDocente
			if err := rows.Scan(&a.ID, &a.DocenteID, &a.DocenteNombre, &a.Curso, &a.Grado); err == nil {
				lista = append(lista, a)
			}
		}
		json.NewEncoder(w).Encode(lista)

	case "POST":
		var body struct {
			DocenteID int64  `json:"docente_id"`
			Curso     string `json:"curso"`
			Grado     string `json:"grado"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "Cuerpo de solicitud inválido", 400)
			return
		}

		body.Curso = strings.TrimSpace(body.Curso)
		body.Grado = strings.TrimSpace(body.Grado)

		if body.DocenteID <= 0 || body.Curso == "" || body.Grado == "" {
			http.Error(w, "Docente, Curso y Grado son campos obligatorios", 400)
			return
		}

		// Verificar que el docente existe
		var exists int
		h.DB.QueryRow("SELECT COUNT(*) FROM docentes WHERE id = ?", body.DocenteID).Scan(&exists)
		if exists == 0 {
			http.Error(w, "El docente especificado no existe", 404)
			return
		}

		// REGLA: Evitar asignaciones duplicadas para el mismo docente en el mismo curso y grado
		var dups int
		h.DB.QueryRow("SELECT COUNT(*) FROM clases WHERE docente_id = ? AND curso = ? AND grado = ?",
			body.DocenteID, body.Curso, body.Grado).Scan(&dups)
		if dups > 0 {
			http.Error(w, "El docente ya tiene asignado este curso en ese grado", 400)
			return
		}

		res, err := h.DB.Exec("INSERT INTO clases (docente_id, curso, grado) VALUES (?, ?, ?)",
			body.DocenteID, body.Curso, body.Grado)
		if err != nil {
			http.Error(w, "Error al crear la asignación: "+err.Error(), 500)
			return
		}
		newID, _ := res.LastInsertId()

		as := models.AsignacionSimple{
			ID:        newID,
			DocenteID: body.DocenteID,
			Curso:     body.Curso,
			Grado:     body.Grado,
		}
		json.NewEncoder(w).Encode(as)

	case "DELETE":
		if id == 0 {
			http.Error(w, "ID de asignación requerido", 400)
			return
		}
		h.DB.Exec("DELETE FROM clases WHERE id = ?", id)
		w.WriteHeader(204)

	default:
		http.Error(w, "Método no permitido", 405)
	}
}
