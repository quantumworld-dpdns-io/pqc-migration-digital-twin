package database

import (
	"database/sql"
	"embed"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

// Open connects to the PostgreSQL database using DATABASE_URL.
func Open() (*sql.DB, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("database ping: %w", err)
	}
	return db, nil
}

// Migrate runs all SQL files in the migrations directory in lexical order.
// Each file is idempotent (uses IF NOT EXISTS).
func Migrate(db *sql.DB) error {
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}
	for _, e := range entries {
		data, err := migrationFiles.ReadFile("migrations/" + e.Name())
		if err != nil {
			return fmt.Errorf("read %s: %w", e.Name(), err)
		}
		if _, err := db.Exec(string(data)); err != nil {
			return fmt.Errorf("migration %s: %w", e.Name(), err)
		}
	}
	return nil
}
