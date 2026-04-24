CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  timestamp bigint NOT NULL,
  name varchar NOT NULL
);

INSERT INTO migrations (timestamp, name) 
SELECT 1776935683325, 'RemoveSubclasses1776935683325'
WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE timestamp = 1776935683325);

INSERT INTO migrations (timestamp, name)
SELECT 1777022421903, 'SchemaInicial1777022421903'
WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE timestamp = 1777022421903);