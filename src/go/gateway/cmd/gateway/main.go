package main

import (
	"log"
	"net/http"

	"github.com/example/pqc-migration-digital-twin/src/go/gateway"
)

func main() {
	addr := ":8080"
	log.Printf("gateway listening on %s", addr)
	if err := http.ListenAndServe(addr, gateway.NewMux()); err != nil {
		log.Fatal(err)
	}
}
