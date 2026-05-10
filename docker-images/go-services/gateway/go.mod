module github.com/example/pqc-migration-digital-twin/src/go/gateway

go 1.22

require (
	github.com/example/pqc-migration-digital-twin/src/go/database v0.0.0
	github.com/lib/pq v1.10.9
)

replace github.com/example/pqc-migration-digital-twin/src/go/database => ../database
