-- Migración: Agregar rol repartidor y campo telefono
-- Fecha: 2026-05-19

-- 1. Agregar el rol 'repartidor' al ENUM
ALTER TYPE "enum_usuarios_rol" ADD VALUE IF NOT EXISTS 'repartidor';

-- 2. Agregar columna telefono
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(255);

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios' AND column_name IN ('rol', 'telefono');
