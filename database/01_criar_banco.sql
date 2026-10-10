-- Execute este arquivo conectado ao PostgreSQL, antes de entrar no banco do Nexo.
-- No pgAdmin, normalmente você pode abrir o Query Tool no banco "postgres".

CREATE DATABASE nexo
WITH
    ENCODING = 'UTF8'
    TEMPLATE = template0;
