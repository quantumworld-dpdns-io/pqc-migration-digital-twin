module github.com/example/pqc-migration-digital-twin/src/go/gateway

go 1.22

require github.com/example/pqc-migration-digital-twin/src/go/database v0.0.0

require github.com/lib/pq v1.10.9 // indirect

replace github.com/example/pqc-migration-digital-twin/src/go/database => ../database
