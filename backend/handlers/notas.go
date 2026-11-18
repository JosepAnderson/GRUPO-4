package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"proyecto-grupo4/backend/models"
)

type NotasHandler struct {
	DB *sql.DB
}

func (h NotasHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	p := strings.TrimPrefix(r.URL.Path, "/api/notas")
	p = strings.TrimPrefix(p, "/")

	// PATRÓN MEMENTO: Endpoint /undo para revertir la calificación al snapshot previo
	if strings.HasSuffix(p, "/undo") {
		idStr := strings.TrimSuffix(p, "/undo")
		id, _ := strconv.ParseInt(idStr, 10, 64)

		var mID int64
		var memento models.NotaMemento
		// Caretaker: busca en SQLite el último memento guardado de esta nota
		err := h.DB.QueryRow("SELECT id, calificacion FROM mementos WHERE nota_id = ? ORDER BY id DESC LIMIT 1", id).
			Scan(&mID, &memento.Calificacion)
		if err != nil {
			http.Error(w, "Sin historial previo para deshacer calificación", 400)
			return
		}

		var n models.Nota
		err = h.DB.QueryRow("SELECT id, estudiante, curso, grado, calificacion FROM notas WHERE id = ?", id).
			Scan(&n.ID, &n.Estudiante, &n.Curso, &n.Grado, &n.Calificacion)
		if err != nil {
			http.Error(w, "Nota no encontrada", 404)
			return
		}

		// Originator restaura su calificación interna desde el memento
		n.Restaurar(memento)
		h.DB.Exec("UPDATE notas SET calificacion = ? WHERE id = ?", n.Calificacion, id)
		h.DB.Exec("DELETE FROM mementos WHERE id = ?", mID) // Remueve el memento consumido

		json.NewEncoder(w).Encode(n)
		return
	}

	// Historial de mementos (global o por nota específica) para visualización
	if p == "historial" || strings.HasSuffix(p, "/historial") {
		var rows *sql.Rows
		var err error

		if p == "historial" {
			rows, err = h.DB.Query(`
				SELECT m.id, m.nota_id, COALESCE(n.estudiante, 'Alumno'), COALESCE(n.curso, 'Curso'), COALESCE(n.grado, 'Grado'), m.calificacion, datetime(m.fecha, 'localtime')
				FROM mementos m
				JOIN notas n ON m.nota_id = n.id
				ORDER BY m.id DESC LIMIT 30
			`)
		} else {
			idStr := strings.TrimSuffix(p, "/historial")
			id, _ := strconv.ParseInt(idStr, 10, 64)
			rows, err = h.DB.Query(`
				SELECT m.id, m.nota_id, COALESCE(n.estudiante, 'Alumno'), COALESCE(n.curso, 'Curso'), COALESCE(n.grado, 'Grado'), m.calificacion, datetime(m.fecha, 'localtime')
				FROM mementos m
				JOIN notas n ON m.nota_id = n.id
				WHERE m.nota_id = ?
				ORDER BY m.id DESC
			`, id)
		}

		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		defer rows.Close()

		type MementoDetallado struct {
			ID           int64   `json:"id"`
			NotaID       int64   `json:"nota_id"`
			Estudiante   string  `json:"estudiante"`
			Curso        string  `json:"curso"`
			Grado        string  `json:"grado"`
			Calificacion float64 `json:"calificacion"`
			Fecha        string  `json:"fecha"`
		}

		historial := []MementoDetallado{}
		for rows.Next() {
			var m MementoDetallado
			if err := rows.Scan(&m.ID, &m.NotaID, &m.Estudiante, &m.Curso, &m.Grado, &m.Calificacion, &m.Fecha); err == nil {
				historial = append(historial, m)
			}
		}
		json.NewEncoder(w).Encode(historial)
		return
	}

	var id int64
	if p != "" {
		parsed, _ := strconv.ParseInt(p, 10, 64)
		id = parsed
	}

	switch r.Method {
	case "GET":
		cursoFiltro := r.URL.Query().Get("curso")
		gradoFiltro := r.URL.Query().Get("grado")

		query := "SELECT id, estudiante, curso, grado, calificacion FROM notas WHERE 1=1"
		args := []interface{}{}

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

		res := []models.Nota{}
		for rows.Next() {
			var n models.Nota
			if err := rows.Scan(&n.ID, &n.Estudiante, &n.Curso, &n.Grado, &n.Calificacion); err == nil {
				res = append(res, n)
			}
		}
		json.NewEncoder(w).Encode(res)

	case "POST":
		var n models.Nota
		if err := json.NewDecoder(r.Body).Decode(&n); err != nil {
			http.Error(w, "Cuerpo de solicitud inválido", 400)
			return
		}

		n.Estudiante = strings.TrimSpace(n.Estudiante)
		n.Curso = strings.TrimSpace(n.Curso)
		n.Grado = strings.TrimSpace(n.Grado)

		if n.Estudiante == "" || n.Curso == "" || n.Grado == "" {
			http.Error(w, "Estudiante, Curso y Grado son obligatorios", 400)
			return
		}

		// VALIDACIÓN ACADÉMICA: Rango de nota de 0 a 20
		if n.Calificacion < 0 || n.Calificacion > 20 {
			http.Error(w, "La calificación debe estar comprendida entre 0.0 y 20.0", 400)
			return
		}

		// REGLA DE NEGOCIO ESTRICTA: Solo se califica si el estudiante tiene matrícula 'Activa' en ese curso y grado
		var estado string
		err := h.DB.QueryRow("SELECT estado FROM matriculas WHERE estudiante = ? AND curso = ? AND grado = ?",
			n.Estudiante, n.Curso, n.Grado).Scan(&estado)
		if err != nil || estado != "Activa" {
			http.Error(w, "No se puede calificar: el estudiante no cuenta con matrícula 'Activa' en este curso y grado", 400)
			return
		}

		// Evitar duplicados de nota para la misma asignación (si existe, actualizar con Memento)
		var existingID int64
		var oldCalif float64
		err = h.DB.QueryRow("SELECT id, calificacion FROM notas WHERE estudiante = ? AND curso = ? AND grado = ?",
			n.Estudiante, n.Curso, n.Grado).Scan(&existingID, &oldCalif)
		if err == nil && existingID > 0 {
			// Guardar memento previo antes de sobreescribir
			h.DB.Exec("INSERT INTO mementos (nota_id, calificacion) VALUES (?, ?)", existingID, oldCalif)
			h.DB.Exec("UPDATE notas SET calificacion = ? WHERE id = ?", n.Calificacion, existingID)
			n.ID = existingID
			json.NewEncoder(w).Encode(n)
			return
		}

		res, err := h.DB.Exec("INSERT INTO notas (estudiante, curso, grado, calificacion) VALUES (?, ?, ?, ?)",
			n.Estudiante, n.Curso, n.Grado, n.Calificacion)
		if err != nil {
			http.Error(w, "Error al registrar nota: "+err.Error(), 500)
			return
		}
		n.ID, _ = res.LastInsertId()
		json.NewEncoder(w).Encode(n)

	case "PUT":
		if id == 0 {
			http.Error(w, "ID de nota requerido", 400)
			return
		}

		var body struct {
			Calificacion float64 `json:"calificacion"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "Cuerpo de solicitud inválido", 400)
			return
		}

		if body.Calificacion < 0 || body.Calificacion > 20 {
			http.Error(w, "La calificación debe estar entre 0.0 y 20.0", 400)
			return
		}

		var act models.Nota
		err := h.DB.QueryRow("SELECT id, estudiante, curso, grado, calificacion FROM notas WHERE id = ?", id).
			Scan(&act.ID, &act.Estudiante, &act.Curso, &act.Grado, &act.Calificacion)
		if err != nil {
			http.Error(w, "Nota no encontrada", 404)
			return
		}

		// PATRÓN MEMENTO: Antes de actualizar, Originator genera snapshot y Caretaker lo guarda en SQLite
		m := act.CrearMemento()
		h.DB.Exec("INSERT INTO mementos (nota_id, calificacion) VALUES (?, ?)", m.NotaID, m.Calificacion)

		// Actualiza la nota con el nuevo valor
		_, err = h.DB.Exec("UPDATE notas SET calificacion = ? WHERE id = ?", body.Calificacion, id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		act.Calificacion = body.Calificacion
		json.NewEncoder(w).Encode(act)

	case "DELETE":
		if id == 0 {
			http.Error(w, "ID de nota requerido", 400)
			return
		}
		h.DB.Exec("DELETE FROM notas WHERE id = ?", id)
		h.DB.Exec("DELETE FROM mementos WHERE nota_id = ?", id)
		w.WriteHeader(204)

	default:
		http.Error(w, "Método no permitido", 405)
	}
}
