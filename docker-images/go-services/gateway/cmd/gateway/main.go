package main

import (
	"log"
	"net/http"
	"os"

	"github.com/example/pqc-migration-digital-twin/src/go/database"
	"github.com/example/pqc-migration-digital-twin/src/go/gateway"
)

func main() {
	if os.Getenv("DATABASE_URL") != "" {
		db, err := database.Open()
		if err != nil {
			log.Printf("WARNING: database connect failed: %v (continuing without DB)", err)
		} else {
			if err := database.Migrate(db); err != nil {
				log.Fatalf("database migration failed: %v", err)
			}
			log.Println("database migrations applied")
		}
	}

	addr := ":8080"
	log.Printf("gateway listening on %s", addr)
	if err := http.ListenAndServe(addr, gateway.NewMux()); err != nil {
		log.Fatal(err)
	}
}
