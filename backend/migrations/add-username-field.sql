-- Migración: Agregar campo username y actualizar usuarios existentes
-- Fecha: 2026-05-19

-- 1. Agregar columna username (permitir NULL temporalmente)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username VARCHAR(255);

-- 2. Actualizar usuarios existentes con username basado en email
-- Estos valores serán reemplazados en el siguiente paso para superadmin y demo
UPDATE usuarios SET username = LOWER(SPLIT_PART(email, '@', 1)) WHERE username IS NULL;

-- 3. Hacer username único y NOT NULL
ALTER TABLE usuarios ADD CONSTRAINT usuarios_username_unique UNIQUE (username);
ALTER TABLE usuarios ALTER COLUMN username SET NOT NULL;

-- 4. Hacer email nullable (ahora username es el campo principal)
ALTER TABLE usuarios ALTER COLUMN email DROP NOT NULL;

-- Nota: Las contraseñas se actualizarán mediante script Node.js debido a que necesitan hashearse con bcrypt
