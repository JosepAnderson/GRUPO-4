package main

import (
	"database/sql"
	"log"
	"net/http"

	_ "modernc.org/sqlite"

	"proyecto-grupo4/backend/handlers"
)

func main() {
	db, err := sql.Open("sqlite", "educacion.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Esquema de tablas limpio sin datos iniciales
	db.Exec(`
		CREATE TABLE IF NOT EXISTS docentes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			nombre TEXT NOT NULL,
			dni TEXT NOT NULL UNIQUE,
			especialidad TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS clases (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			docente_id INTEGER NOT NULL,
			curso TEXT NOT NULL,
			grado TEXT NOT NULL,
			UNIQUE(docente_id, curso, grado)
		);

		CREATE TABLE IF NOT EXISTS matriculas (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			estudiante TEXT NOT NULL,
			curso TEXT NOT NULL,
			grado TEXT NOT NULL,
			estado TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS notas (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			estudiante TEXT NOT NULL,
			curso TEXT NOT NULL,
			grado TEXT NOT NULL,
			calificacion REAL NOT NULL
		);

		CREATE TABLE IF NOT EXISTS mementos (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			nota_id INTEGER NOT NULL,
			calificacion REAL NOT NULL,
			fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS asistencias (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			estudiante TEXT NOT NULL,
			curso TEXT NOT NULL,
			grado TEXT NOT NULL,
			fecha TEXT NOT NULL,
			estado TEXT NOT NULL,
			UNIQUE(estudiante, curso, grado, fecha)
		);
	`)

	mux := http.NewServeMux()

	// 1. Matrículas (Patrón State)
	mux.Handle("/api/matriculas", handlers.MatriculasHandler{DB: db})
	mux.Handle("/api/matriculas/", handlers.MatriculasHandler{DB: db})

	// 2. Docentes (Patrón Builder)
	mux.Handle("/api/docentes", handlers.DocentesHandler{DB: db})
	mux.Handle("/api/docentes/", handlers.DocentesHandler{DB: db})

	// 3. Clases / Asignaturas (Patrón Composite)
	mux.Handle("/api/clases", handlers.ClasesHandler{DB: db})
	mux.Handle("/api/clases/", handlers.ClasesHandler{DB: db})

	// 4. Asistencias (Patrón Observer)
	mux.Handle("/api/asistencias", handlers.AsistenciasHandler{DB: db})
	mux.Handle("/api/asistencias/", handlers.AsistenciasHandler{DB: db})

	// 5. Notas (Patrón Memento)
	mux.Handle("/api/notas", handlers.NotasHandler{DB: db})
	mux.Handle("/api/notas/", handlers.NotasHandler{DB: db})

	log.Println("API de SisColegio corriendo en http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", cors(mux)))
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			return
		}
		next.ServeHTTP(w, r)
	})
}
