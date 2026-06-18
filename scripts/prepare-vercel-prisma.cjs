const fs = require("fs");
const path = require("path");

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");

const next = schema.replace(
  /provider\s*=\s*"sqlite"/,
  'provider = "postgresql"'
);

if (next === schema) {
  throw new Error("Could not switch Prisma datasource provider to postgresql");
}

fs.writeFileSync(schemaPath, next);
console.log("Prepared Prisma schema for Vercel/PostgreSQL");
